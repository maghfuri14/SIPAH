const crypto = require('crypto');
const { pool } = require('../config/db');
const { ajukanPembatalan: ajukanPembatalanKas, prosesPembatalan: prosesPembatalanKas } = require('./kasController');

async function generateNoKwitansi() {
  const sequenceConnection = await pool.getConnection();
  try {
  await sequenceConnection.execute(
    `INSERT INTO kwitansi_sequence (tanggal, sequence) VALUES (CURDATE(), 0)
     ON DUPLICATE KEY UPDATE sequence = sequence`,
  );
  await sequenceConnection.execute(
    `UPDATE kwitansi_sequence SET sequence = LAST_INSERT_ID(sequence + 1) WHERE tanggal = CURDATE()`,
  );
  const [[sequenceRow]] = await sequenceConnection.query('SELECT LAST_INSERT_ID() AS sequence');
  const sequence = Number(sequenceRow.sequence);
  const [[dateRow]] = await sequenceConnection.query('SELECT DATE_FORMAT(NOW(), "%Y%m%d") AS tanggal');
  return `KW-${dateRow.tanggal}-${String(sequence).padStart(4, '0')}`;
  } finally {
    sequenceConnection.release();
  }
}

async function getEventTarif(tahun) {
  if (tahun) {
    const [versions] = await pool.execute(
      `SELECT config FROM tarif_history
       WHERE tahun_efektif <= ? ORDER BY tahun_efektif DESC, bulan_efektif DESC LIMIT 1`,
      [tahun],
    );
    const versioned = typeof versions[0]?.config === 'string' ? JSON.parse(versions[0].config) : versions[0]?.config;
    if (versioned) return Number(versioned.event_kilatan || 0);
  }
  const [rows] = await pool.execute(
    'SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1',
    ['tarif_config'],
  );
  const parsed = typeof rows[0]?.setting_value === 'string'
    ? JSON.parse(rows[0].setting_value)
    : rows[0]?.setting_value;
  return Number(parsed?.event_kilatan || 0);
}

async function ensureKilatan(connection, santriId, tahun) {
  const [santriRows] = await connection.execute(
    'SELECT status_kilatan FROM santri WHERE id = ? LIMIT 1',
    [santriId],
  );
  const baseTarif = await getEventTarif(tahun);
  const events = ['Jumadil Ula', 'Maulid', 'Romadhon', 'Dzulhijjah'];
  const eventMonths = { 'Jumadil Ula': 5, Maulid: 3, Romadhon: 9, Dzulhijjah: 12 };
  for (const event of events) {
    const [periods] = await connection.execute(
      `SELECT jenis FROM syahriyah_keringanan
       WHERE santri_id = ? AND tipe = 'Kilatan' AND tahun = ?
         AND ? BETWEEN bulan_mulai AND bulan_selesai
       ORDER BY created_at DESC LIMIT 1`,
      [santriId, Number(tahun), eventMonths[event]],
    );
    const status = periods[0]?.jenis || santriRows[0]?.status_kilatan || 'Normal';
    const tarif = status === 'Bebas' ? 0 : status === 'Keringanan' ? Math.floor(baseTarif / 2) : baseTarif;
    await connection.execute(
      `INSERT IGNORE INTO kilatan (id, santri_id, tahun, event, nominal_tagihan, total_dibayar, status)
       VALUES (?, ?, ?, ?, ?, 0, 'Belum')`,
      [crypto.randomUUID(), santriId, tahun, event, tarif],
    );
    await connection.execute(
      `UPDATE kilatan SET nominal_tagihan = ?
       WHERE santri_id = ? AND tahun = ? AND event = ? AND status IN ('Belum', 'Sebagian')`,
      [tarif, santriId, tahun, event],
    );
  }
}

async function getKilatanBySantri(req, res) {
  try {
    const { santri_id, tahun } = req.params;
    await ensureKilatan(pool, santri_id, tahun);
    const [rows] = await pool.execute(
      'SELECT id, santri_id, tahun, event, nominal_tagihan, total_dibayar, status FROM kilatan WHERE santri_id = ? AND tahun = ? ORDER BY event ASC',
      [santri_id, tahun],
    );
    const eventMonths = { 'Jumadil Ula': 5, Maulid: 3, Romadhon: 9, Dzulhijjah: 12 };
    const [santriRows] = await pool.execute(
      'SELECT status_kilatan FROM santri WHERE id = ? LIMIT 1',
      [santri_id],
    );
    const data = [];
    for (const row of rows) {
      const [periods] = await pool.execute(
        `SELECT jenis FROM syahriyah_keringanan
         WHERE santri_id = ? AND tipe = 'Kilatan' AND tahun = ?
           AND ? BETWEEN bulan_mulai AND bulan_selesai
         ORDER BY created_at DESC LIMIT 1`,
        [santri_id, Number(tahun), eventMonths[row.event]],
      );
      data.push({
        ...row,
        status_tarif: periods[0]?.jenis || santriRows[0]?.status_kilatan || 'Normal',
      });
    }
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function catatPembayaranKilatan(req, res) {
  const connection = await pool.getConnection();
  try {
    const { santri_id } = req.params;
    const { items = [], tanggal_bayar, keterangan, iuran_tambahan = [] } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Items pembayaran wajib diisi' });
    }

    await connection.beginTransaction();
    let totalDibayar = 0;
    let noKwitansiTerakhir = null;
    const [santriRows] = await connection.execute(
      'SELECT tanggal_masuk, status_kilatan FROM santri WHERE id = ? LIMIT 1',
      [santri_id],
    );
    if (santriRows.length === 0) throw new Error('Santri tidak ditemukan');
    if (santriRows[0].status_kilatan === 'Bebas') {
      throw new Error('Santri dengan status Bebas tidak dikenakan pembayaran Kilatan');
    }
    const paymentYear = Number(req.body.items?.[0]?.tahun);
    if (paymentYear > new Date().getFullYear() + 1) {
      throw new Error('Pembayaran Kilatan maksimal hanya 12 bulan ke depan');
    }
    const [settingRows] = await connection.execute(
      'SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1',
      ['iuran_tambahan'],
    );
    let configuredFees = [];
    try {
      configuredFees = settingRows[0]?.setting_value
        ? (typeof settingRows[0].setting_value === 'string'
          ? JSON.parse(settingRows[0].setting_value)
          : settingRows[0].setting_value)
        : [];
    } catch {
      configuredFees = [];
    }
    let additionalTotal = 0;
    for (const fee of iuran_tambahan) {
      const configured = configuredFees.find((item) => String(item.id) === String(fee.id));
      if (!configured || !['Kilatan', 'Keduanya'].includes(configured.tipe)) {
        throw new Error('Iuran tambahan tidak valid.');
      }
      const nominal = Number(configured.nominal) || 0;
      if (nominal < 0 || Number(fee.nominal) !== nominal) {
        throw new Error(`Nominal iuran ${configured.nama} tidak sesuai pengaturan.`);
      }
      additionalTotal += nominal;
    }
    for (const item of items) {
      const [rows] = await connection.execute(
        'SELECT id, nominal_tagihan, total_dibayar FROM kilatan WHERE santri_id = ? AND tahun = ? AND event = ? LIMIT 1',
        [santri_id, item.tahun, item.event],
      );
      if (rows.length === 0) throw new Error(`Data kilatan ${item.event} tidak ditemukan`);
      const nominalPayment = Number(item.nominal);
      if (!Number.isFinite(nominalPayment) || nominalPayment <= 0) throw new Error('Nominal pembayaran tidak valid.');
      const remaining = Number(rows[0].nominal_tagihan) - Number(rows[0].total_dibayar);
      if (nominalPayment > remaining) throw new Error('Nominal pembayaran melebihi tagihan event tersebut.');

      const total = Number(rows[0].total_dibayar) + Number(item.nominal);
      const status = total >= Number(rows[0].nominal_tagihan) ? 'Lunas' : total > 0 ? 'Sebagian' : 'Belum';
      await connection.execute(
        'UPDATE kilatan SET total_dibayar = ?, status = ? WHERE santri_id = ? AND tahun = ? AND event = ?',
        [total, status, santri_id, item.tahun, item.event],
      );
      totalDibayar += Number(item.nominal);
      const kasId = crypto.randomUUID();
      const noKwitansi = await generateNoKwitansi();
      noKwitansiTerakhir = noKwitansi;
      await connection.execute(
        `INSERT INTO kas (id, tanggal, jenis, kategori_nama, nominal, keterangan, referensi_id, created_by, status)
         VALUES (?, ?, 'Pemasukan', 'Kilatan', ?, ?, ?, ?, 'Disetujui')`,
        [kasId, tanggal_bayar || new Date(), Number(item.nominal), keterangan || `Pembayaran Kilatan ${item.event}`, rows[0].id, req.user?.id || null],
      );
      await connection.execute(
        `INSERT INTO transaksi (id, kas_id, no_kwitansi, santri_id, modul, referensi_id, nominal, user_id)
         VALUES (?, ?, ?, ?, 'Kilatan', ?, ?, ?)`,
        [crypto.randomUUID(), kasId, noKwitansi, santri_id, rows[0].id, Number(item.nominal), req.user?.id || null],
      );
    }
    if (additionalTotal > 0) {
      await connection.execute(
        `INSERT INTO kas (id, tanggal, jenis, kategori_nama, nominal, keterangan)
         VALUES (?, ?, 'Pemasukan', 'Iuran Tambahan', ?, ?)`,
        [crypto.randomUUID(), tanggal_bayar || new Date(), additionalTotal,
          keterangan || 'Iuran tambahan Kilatan'],
      );
      totalDibayar += additionalTotal;
    }
    await connection.commit();
    return res.json({ success: true, message: 'Pembayaran kilatan berhasil dicatat', total_dibayar: totalDibayar, no_kwitansi: noKwitansiTerakhir });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
}

async function ajukanPembatalan(req, res) {
  return ajukanPembatalanKas(req, res);
}

async function prosesPembatalan(req, res) {
  return prosesPembatalanKas(req, res);
}

module.exports = { getKilatanBySantri, catatPembayaranKilatan, ajukanPembatalan, prosesPembatalan };
