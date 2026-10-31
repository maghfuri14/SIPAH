const crypto = require('crypto');
const { pool } = require('../config/db');
const { logActivity } = require('../middleware/activityLogger');
const { ajukanPembatalan: ajukanPembatalanKas, prosesPembatalan: prosesPembatalanKas } = require('./kasController');

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

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

async function getTarifConfig(tahun, bulan) {
  if (tahun && bulan) {
    const [versions] = await pool.execute(
      `SELECT config FROM tarif_history
       WHERE (tahun_efektif < ? OR (tahun_efektif = ? AND bulan_efektif <= ?))
       ORDER BY tahun_efektif DESC, bulan_efektif DESC LIMIT 1`,
      [tahun, tahun, bulan],
    );
    const versioned = typeof versions[0]?.config === 'string' ? JSON.parse(versions[0].config) : versions[0]?.config;
    if (versioned) return versioned;
  }
  const [rows] = await pool.execute(
    'SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1',
    ['tarif_config'],
  );
  const parsed = typeof rows[0]?.setting_value === 'string'
    ? JSON.parse(rows[0].setting_value)
    : rows[0]?.setting_value;
  return parsed || {};
}

function getTarif(config, kategori) {
  if (kategori === 'Mukim') return Number(config.syahriyah_mukim || 0);
  if (kategori === 'Nduduk') return Number(config.syahriyah_nduduk || 0);
  if (kategori === 'Kilatan') return Number(config.syahriyah_kilatan || 0);
  return 0;
}

async function resolveStatusBulanan(santriId, tahun, bulan, globalStatus) {
  const [periods] = await pool.execute(
    `SELECT jenis FROM syahriyah_keringanan
     WHERE santri_id = ? AND tipe = 'Syahriyah' AND tahun = ?
       AND ? BETWEEN bulan_mulai AND bulan_selesai
     ORDER BY created_at DESC LIMIT 1`,
    [santriId, Number(tahun), Number(bulan)],
  );
  return periods[0]?.jenis || globalStatus || 'Normal';
}

async function getSyahriyahBySantri(req, res) {
  try {
    const { santri_id, tahun } = req.params;
    const [santriRows] = await pool.execute(
      'SELECT kategori, status_syahriyah FROM santri WHERE id = ?',
      [santri_id],
    );
    if (santriRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Santri tidak ditemukan' });
    }

    const [rows] = await pool.execute(
      'SELECT id, santri_id, tahun, bulan, nominal_tagihan, total_dibayar, status FROM syahriyah WHERE santri_id = ? AND tahun = ? ORDER BY bulan ASC',
      [santri_id, tahun],
    );

    if (rows.length === 0) {
      const config = await getTarifConfig(Number(tahun), 1);
      const baseTariff = getTarif(config, santriRows[0].kategori);
      for (let bulan = 1; bulan <= 12; bulan++) {
        const status = await resolveStatusBulanan(santri_id, tahun, bulan, santriRows[0].status_syahriyah);
        const tariff = status === 'Bebas' ? 0 : status === 'Keringanan' ? Math.floor(baseTariff / 2) : baseTariff;
        await pool.execute(
          `INSERT INTO syahriyah (id, santri_id, tahun, bulan, nominal_tagihan, total_dibayar, status)
           VALUES (?, ?, ?, ?, ?, 0, 'Belum')`,
          [crypto.randomUUID(), santri_id, tahun, String(bulan), tariff],
        );
      }
      const [generated] = await pool.execute(
        'SELECT id, santri_id, tahun, bulan, nominal_tagihan, total_dibayar, status FROM syahriyah WHERE santri_id = ? AND tahun = ? ORDER BY bulan ASC',
        [santri_id, tahun],
      );
      const statusRows = [];
      for (const row of generated) {
        statusRows.push({
          ...row,
          status_tarif: await resolveStatusBulanan(santri_id, tahun, row.bulan, santriRows[0].status_syahriyah),
        });
      }
      return res.json({ success: true, data: statusRows });
    }

    const config = await getTarifConfig(Number(tahun), 1);
    const baseTariff = getTarif(config, santriRows[0].kategori);
    for (const row of rows) {
      if (row.status === 'Lunas' || row.status === 'Sebagian') continue;
      const status = await resolveStatusBulanan(santri_id, tahun, row.bulan, santriRows[0].status_syahriyah);
      const tariff = status === 'Bebas' ? 0 : status === 'Keringanan' ? Math.floor(baseTariff / 2) : baseTariff;
      await pool.execute(
        'UPDATE syahriyah SET nominal_tagihan = ? WHERE id = ? AND status IN (?, ?)',
        [tariff, row.id, 'Belum', 'Belum Bayar'],
      );
    }
    const [updated] = await pool.execute(
      'SELECT id, santri_id, tahun, bulan, nominal_tagihan, total_dibayar, status FROM syahriyah WHERE santri_id = ? AND tahun = ? ORDER BY bulan ASC',
      [santri_id, tahun],
    );

    const statusRows = [];
    for (const row of updated) {
      statusRows.push({
        ...row,
        status_tarif: await resolveStatusBulanan(santri_id, tahun, row.bulan, santriRows[0].status_syahriyah),
      });
    }
    return res.json({ success: true, data: statusRows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function catatPembayaran(req, res) {
  const idempotencyKey = req.headers['idempotency-key'];
  const payloadHash = hashPayload(req.body);
  let connection;

  try {
    if (idempotencyKey) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(String(idempotencyKey))) {
        return res.status(400).json({ success: false, message: 'Format Idempotency-Key tidak valid.' });
      }

      const [existingKeys] = await pool.execute(
        `SELECT payload_hash, response_snapshot, status_code, expires_at
         FROM idempotency_keys WHERE idempotency_key = ? LIMIT 1`,
        [String(idempotencyKey)],
      );
      if (existingKeys.length > 0) {
        const existing = existingKeys[0];
        if (new Date(existing.expires_at) <= new Date()) {
          return res.status(410).json({ success: false, message: 'Idempotency-Key sudah kedaluwarsa.' });
        }
        if (existing.payload_hash !== payloadHash) {
          return res.status(422).json({ success: false, message: 'Idempotency-Key sudah digunakan untuk payload berbeda.' });
        }
        const snapshot = typeof existing.response_snapshot === 'string'
          ? JSON.parse(existing.response_snapshot)
          : existing.response_snapshot;
        return res.status(existing.status_code).json(snapshot);
      }
    }

    connection = await pool.getConnection();
    const { santri_id } = req.params;
    const { items = [], tanggal_bayar, keterangan, iuran_tambahan = [] } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Items pembayaran wajib diisi' });
    }

    await connection.beginTransaction();
    let totalDibayar = 0;
    let noKwitansiTerakhir = null;
    const [santriRows] = await connection.execute(
      'SELECT tanggal_masuk, status_syahriyah FROM santri WHERE id = ? LIMIT 1',
      [santri_id],
    );
    if (santriRows.length === 0) throw validationError('Santri tidak ditemukan');
    const masuk = santriRows[0].tanggal_masuk ? new Date(`${santriRows[0].tanggal_masuk}`) : null;
    if (!masuk || Number.isNaN(masuk.getTime())) throw validationError('Tanggal masuk santri tidak valid.');
    const now = new Date();
    const latestMonthIndex = (now.getFullYear() * 12) + now.getMonth() + 12;

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
      if (!configured || !['Syahriyah', 'Keduanya'].includes(configured.tipe)) {
        throw validationError('Iuran tambahan tidak valid.');
      }
      const nominal = Number(configured.nominal) || 0;
      if (nominal < 0 || Number(fee.nominal) !== nominal) {
        throw validationError(`Nominal iuran ${configured.nama} tidak sesuai pengaturan.`);
      }
      additionalTotal += nominal;
    }

    for (const item of items) {
      const period = new Date(Number(item.tahun), Number(item.bulan) - 1, 1);
      if (!santriRows[0].tanggal_masuk || period < new Date(masuk.getFullYear(), masuk.getMonth(), 1)) {
        throw validationError('Bulan pembayaran tidak boleh sebelum tanggal masuk santri');
      }
      const periodMonthIndex = (Number(item.tahun) * 12) + Number(item.bulan) - 1;
      if (periodMonthIndex > latestMonthIndex) throw validationError('Pembayaran maksimal hanya 12 bulan ke depan');
      const effectiveStatus = await resolveStatusBulanan(
        santri_id,
        item.tahun,
        item.bulan,
        santriRows[0].status_syahriyah,
      );
      if (effectiveStatus === 'Bebas') {
        throw validationError(`Bulan ${item.bulan}/${item.tahun} dibebaskan dari pembayaran Syahriyah`);
      }
      const [rows] = await connection.execute(
        'SELECT id, nominal_tagihan, total_dibayar FROM syahriyah WHERE santri_id = ? AND tahun = ? AND bulan = ? LIMIT 1',
        [santri_id, item.tahun, String(item.bulan)],
      );
      if (rows.length === 0) throw validationError(`Data syahriyah bulan ${item.bulan} tidak ditemukan`);

      const nominalPayment = Number(item.nominal);
      if (!Number.isFinite(nominalPayment) || nominalPayment <= 0) throw validationError('Nominal pembayaran tidak valid.');
      const remaining = Number(rows[0].nominal_tagihan) - Number(rows[0].total_dibayar);
      if (nominalPayment > remaining) throw validationError('Nominal pembayaran melebihi tagihan bulan tersebut.');
      const total = Number(rows[0].total_dibayar) + Number(item.nominal);
      const status = total >= Number(rows[0].nominal_tagihan) ? 'Lunas' : total > 0 ? 'Sebagian' : 'Belum';
      await connection.execute(
        'UPDATE syahriyah SET total_dibayar = ?, status = ? WHERE santri_id = ? AND tahun = ? AND bulan = ?',
        [total, status, santri_id, item.tahun, String(item.bulan)],
      );
      totalDibayar += Number(item.nominal);
      const kasId = crypto.randomUUID();
      const noKwitansi = await generateNoKwitansi();
      noKwitansiTerakhir = noKwitansi;
      await connection.execute(
        `INSERT INTO kas (id, tanggal, jenis, kategori_nama, nominal, keterangan, referensi_id, created_by, status)
         VALUES (?, ?, 'Pemasukan', 'Syahriyah', ?, ?, ?, ?, 'Disetujui')`,
        [kasId, tanggal_bayar || new Date(), Number(item.nominal), keterangan || `Pembayaran Syahriyah bulan ${item.bulan}`, rows[0].id, req.user?.id || null],
      );
      await connection.execute(
        `INSERT INTO transaksi (id, kas_id, no_kwitansi, santri_id, modul, referensi_id, nominal, user_id)
         VALUES (?, ?, ?, ?, 'Syahriyah', ?, ?, ?)`,
        [crypto.randomUUID(), kasId, noKwitansi, santri_id, rows[0].id, Number(item.nominal), req.user?.id || null],
      );
    }

    if (additionalTotal > 0) {
      await connection.execute(
        `INSERT INTO kas (id, tanggal, jenis, kategori_nama, nominal, keterangan)
         VALUES (?, ?, 'Pemasukan', 'Iuran Tambahan', ?, ?)`,
        [crypto.randomUUID(), tanggal_bayar || new Date(), additionalTotal,
          keterangan || 'Iuran tambahan Syahriyah'],
      );
      totalDibayar += additionalTotal;
    }

    const responseSnapshot = {
      success: true,
      message: 'Pembayaran syahriyah berhasil dicatat',
      total_dibayar: totalDibayar,
      no_kwitansi: noKwitansiTerakhir,
    };

    if (idempotencyKey) {
      await connection.execute(
        `INSERT INTO idempotency_keys
          (idempotency_key, user_id, endpoint, payload_hash, response_snapshot, status_code, expires_at)
         VALUES (?, ?, ?, ?, ?, 200, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
        [
          String(idempotencyKey),
          req.user?.id || null,
          req.originalUrl,
          payloadHash,
          JSON.stringify(responseSnapshot),
        ],
      );
    }
    await connection.commit();
    await logActivity(
      req.user?.id,
      'CREATE',
      'SYAHRIYAH',
      santri_id,
      { items, tanggal_bayar, keterangan, iuran_tambahan },
      req.ip,
    );
    return res.json(responseSnapshot);
  } catch (error) {
    if (connection) await connection.rollback();
    return res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'Gagal memproses pembayaran syahriyah.',
      error: error.status ? undefined : error.message,
    });
  } finally {
    if (connection) connection.release();
  }
}

async function ajukanPembatalan(req, res) {
  return ajukanPembatalanKas(req, res);
}

async function prosesPembatalan(req, res) {
  return prosesPembatalanKas(req, res);
}

module.exports = { getSyahriyahBySantri, catatPembayaran, ajukanPembatalan, prosesPembatalan };
