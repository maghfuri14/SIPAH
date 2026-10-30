const crypto = require('crypto');
const { pool } = require('../config/db');

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
    'SELECT status_syahriyah FROM santri WHERE id = ? LIMIT 1',
    [santriId],
  );
  const baseTarif = await getEventTarif(tahun);
  const status = santriRows[0]?.status_syahriyah || 'Normal';
  const tarif = status === 'Bebas'
    ? 0
    : status === 'Keringanan' ? Math.floor(baseTarif / 2) : baseTarif;
  const events = ['Jumadil Ula', 'Maulid', 'Romadhon', 'Dzulhijjah'];
  for (const event of events) {
    await connection.execute(
      `INSERT IGNORE INTO kilatan (id, santri_id, tahun, event, nominal_tagihan, total_dibayar, status)
       VALUES (?, ?, ?, ?, ?, 0, 'Belum')`,
      [crypto.randomUUID(), santriId, tahun, event, tarif],
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
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function catatPembayaranKilatan(req, res) {
  const connection = await pool.getConnection();
  try {
    const { santri_id } = req.params;
    const { items = [], tanggal_bayar, keterangan } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Items pembayaran wajib diisi' });
    }

    await connection.beginTransaction();
    let totalDibayar = 0;
    const [santriRows] = await connection.execute(
      'SELECT tanggal_masuk, status_syahriyah FROM santri WHERE id = ? LIMIT 1',
      [santri_id],
    );
    if (santriRows.length === 0) throw new Error('Santri tidak ditemukan');
    if (santriRows[0].status_syahriyah === 'Bebas') {
      throw new Error('Santri dengan status Bebas tidak dikenakan pembayaran Kilatan');
    }
    const paymentYear = Number(req.body.items?.[0]?.tahun);
    if (paymentYear > new Date().getFullYear() + 1) {
      throw new Error('Pembayaran Kilatan maksimal hanya 12 bulan ke depan');
    }
    for (const item of items) {
      const [rows] = await connection.execute(
        'SELECT id, nominal_tagihan, total_dibayar FROM kilatan WHERE santri_id = ? AND tahun = ? AND event = ? LIMIT 1',
        [santri_id, item.tahun, item.event],
      );
      if (rows.length === 0) throw new Error(`Data kilatan ${item.event} tidak ditemukan`);

      const total = Number(rows[0].total_dibayar) + Number(item.nominal);
      const status = total >= Number(rows[0].nominal_tagihan) ? 'Lunas' : total > 0 ? 'Sebagian' : 'Belum';
      await connection.execute(
        'UPDATE kilatan SET total_dibayar = ?, status = ? WHERE santri_id = ? AND tahun = ? AND event = ?',
        [total, status, santri_id, item.tahun, item.event],
      );
      totalDibayar += Number(item.nominal);
      await connection.execute(
        `INSERT INTO kas (id, tanggal, jenis, kategori_nama, nominal, keterangan, referensi_id)
         VALUES (?, ?, 'Pemasukan', 'Kilatan', ?, ?, ?)`,
        [crypto.randomUUID(), tanggal_bayar || new Date(), Number(item.nominal), keterangan || `Pembayaran Kilatan ${item.event}`, rows[0].id],
      );
    }
    await connection.commit();
    return res.json({ success: true, message: 'Pembayaran kilatan berhasil dicatat', total_dibayar: totalDibayar });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
}

module.exports = { getKilatanBySantri, catatPembayaranKilatan };
