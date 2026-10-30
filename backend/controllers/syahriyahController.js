const crypto = require('crypto');
const { pool } = require('../config/db');

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
      const status = santriRows[0].status_syahriyah || 'Normal';
      const tariff = status === 'Bebas'
        ? 0
        : status === 'Keringanan' ? Math.floor(baseTariff / 2) : baseTariff;
      for (let bulan = 1; bulan <= 12; bulan++) {
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
      return res.json({ success: true, data: generated });
    }

    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function catatPembayaran(req, res) {
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
      throw new Error('Santri dengan status Bebas tidak dikenakan pembayaran Syahriyah');
    }
    const masuk = new Date(santriRows[0].tanggal_masuk);
    const now = new Date();
    const latest = new Date(now.getFullYear(), now.getMonth() + 13, 1);

    for (const item of items) {
      const period = new Date(Number(item.tahun), Number(item.bulan) - 1, 1);
      if (!santriRows[0].tanggal_masuk || period < new Date(masuk.getFullYear(), masuk.getMonth(), 1)) {
        throw new Error(`Bulan pembayaran tidak boleh sebelum tanggal masuk santri`);
      }
      if (period >= latest) throw new Error('Pembayaran maksimal hanya 12 bulan ke depan');
      const [rows] = await connection.execute(
        'SELECT id, nominal_tagihan, total_dibayar FROM syahriyah WHERE santri_id = ? AND tahun = ? AND bulan = ? LIMIT 1',
        [santri_id, item.tahun, String(item.bulan)],
      );
      if (rows.length === 0) throw new Error(`Data syahriyah bulan ${item.bulan} tidak ditemukan`);

      const total = Number(rows[0].total_dibayar) + Number(item.nominal);
      const status = total >= Number(rows[0].nominal_tagihan) ? 'Lunas' : total > 0 ? 'Sebagian' : 'Belum';
      await connection.execute(
        'UPDATE syahriyah SET total_dibayar = ?, status = ? WHERE santri_id = ? AND tahun = ? AND bulan = ?',
        [total, status, santri_id, item.tahun, String(item.bulan)],
      );
      totalDibayar += Number(item.nominal);
      await connection.execute(
        `INSERT INTO kas (id, tanggal, jenis, kategori_nama, nominal, keterangan, referensi_id)
         VALUES (?, ?, 'Pemasukan', 'Syahriyah', ?, ?, ?)`,
        [crypto.randomUUID(), tanggal_bayar || new Date(), Number(item.nominal), keterangan || `Pembayaran Syahriyah bulan ${item.bulan}`, rows[0].id],
      );
    }

    await connection.commit();
    return res.json({ success: true, message: 'Pembayaran syahriyah berhasil dicatat', total_dibayar: totalDibayar });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
}

module.exports = { getSyahriyahBySantri, catatPembayaran };
