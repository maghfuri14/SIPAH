const crypto = require('crypto');
const { pool } = require('../config/db');

const SANTRI_FIELDS = [
  'nis',
  'nama',
  'nama_wali',
  'no_hp_santri',
  'no_hp_wali',
  'kategori',
  'status',
  'status_syahriyah',
  'tanggal_masuk',
  'catatan',
];

async function getKeringananSantri(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, santri_id, tahun, bulan_mulai, bulan_selesai, jenis, keterangan, created_at
       FROM syahriyah_keringanan WHERE santri_id = ? ORDER BY tahun DESC, bulan_mulai ASC`,
      [req.params.id],
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getPaidSyahriyahMonths(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT bulan FROM syahriyah
       WHERE santri_id = ? AND tahun = ? AND status IN ('Lunas', 'Sebagian', 'Lunas Sebagian')`,
      [req.params.id, req.params.tahun],
    );
    res.json({
      success: true,
      data: rows.map((row) => Number(row.bulan)).filter((month) => month >= 1 && month <= 12),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function createKeringananSantri(req, res) {
  try {
    const { tahun, bulan_mulai, bulan_selesai, jenis, keterangan } = req.body;
    const start = Number(bulan_mulai);
    const end = Number(bulan_selesai);
    if (!tahun || start < 1 || end > 12 || start > end || !['Bebas', 'Keringanan'].includes(jenis)) {
      return res.status(400).json({ success: false, message: 'Rentang periode keringanan tidak valid.' });
    }
    const [paidRows] = await pool.execute(
      `SELECT bulan FROM syahriyah
       WHERE santri_id = ? AND tahun = ? AND status IN ('Lunas', 'Sebagian', 'Lunas Sebagian')`,
      [req.params.id, Number(tahun)],
    );
    const paidMonths = paidRows.map((row) => Number(row.bulan));
    if (paidMonths.some((month) => month >= start && month <= end)) {
      return res.status(409).json({ success: false, message: 'Rentang mengandung bulan yang sudah dibayar.' });
    }

    const id = crypto.randomUUID();
    await pool.execute(
      `INSERT INTO syahriyah_keringanan
       (id, santri_id, tahun, bulan_mulai, bulan_selesai, jenis, keterangan)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.id, Number(tahun), start, end, jenis, keterangan || null],
    );
    const [rows] = await pool.execute(
      'SELECT id, santri_id, tahun, bulan_mulai, bulan_selesai, jenis, keterangan, created_at FROM syahriyah_keringanan WHERE id = ?',
      [id],
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteKeringanan(req, res) {
  try {
    await pool.execute('DELETE FROM syahriyah_keringanan WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Periode keringanan berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getAllSantri(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM santri ORDER BY nis ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function createSantri(req, res) {
  try {
    const id = crypto.randomUUID();
    const values = SANTRI_FIELDS.map((field) => req.body[field] ?? null);

    await pool.execute(
      `INSERT INTO santri (
        id, nis, nama, nama_wali, no_hp_santri, no_hp_wali,
        kategori, status, status_syahriyah, tanggal_masuk, catatan
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, ...values],
    );

    res.status(201).json({
      success: true,
      message: 'Data santri berhasil ditambahkan',
      data: { id, ...req.body },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function updateSantri(req, res) {
  try {
    const fields = SANTRI_FIELDS.filter((field) =>
      Object.prototype.hasOwnProperty.call(req.body, field),
    );

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada data santri yang dikirim untuk diperbarui',
      });
    }

    const assignments = fields.map((field) => `${field} = ?`).join(', ');
    const values = fields.map((field) => req.body[field]);
    const [result] = await pool.execute(
      `UPDATE santri SET ${assignments} WHERE id = ?`,
      [...values, req.params.id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data santri tidak ditemukan',
      });
    }

    return res.json({
      success: true,
      message: 'Data santri berhasil diperbarui',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteSantri(req, res) {
  try {
    const [result] = await pool.execute('DELETE FROM santri WHERE id = ?', [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data santri tidak ditemukan',
      });
    }

    return res.json({
      success: true,
      message: 'Data santri berhasil dihapus',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function importSantri(req, res) {
  try {
    const rows = Array.isArray(req.body) ? req.body : req.body.data;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Data import tidak boleh kosong',
      });
    }

    const validRows = rows.filter((row) => row && String(row.nis || '').trim());
    if (validRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada baris dengan NIS',
      });
    }

    const nisList = [...new Set(validRows.map((row) => String(row.nis).trim()))];
    const placeholders = nisList.map(() => '?').join(', ');
    const [existing] = await pool.query(
      `SELECT nis FROM santri WHERE nis IN (${placeholders})`,
      nisList,
    );
    const existingNis = new Set(existing.map((row) => row.nis));
    const insertedRows = validRows.filter(
      (row, index, list) =>
        !existingNis.has(String(row.nis).trim()) &&
        list.findIndex((item) => String(item.nis).trim() === String(row.nis).trim()) === index,
    );

    let inserted = 0;
    for (const row of insertedRows) {
      await pool.execute(
        `INSERT INTO santri (
          id, nis, nama, nama_wali, no_hp_santri, no_hp_wali,
          kategori, status, status_syahriyah, tanggal_masuk, catatan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          String(row.nis).trim(),
          String(row.nama || '').trim(),
          row.nama_wali || null,
          row.no_hp_santri || null,
          row.no_hp_wali || null,
          row.kategori || 'Mukim',
          row.status || 'Aktif',
          row.status_syahriyah || 'Normal',
          row.tanggal_masuk || null,
          row.catatan || null,
        ],
      );
      inserted += 1;
    }

    return res.status(201).json({
      success: true,
      inserted,
      skipped: rows.length - inserted,
      message: `${inserted} data santri berhasil diimpor`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAllSantri,
  createSantri,
  updateSantri,
  deleteSantri,
  importSantri,
  getKeringananSantri,
  getPaidSyahriyahMonths,
  createKeringananSantri,
  deleteKeringanan,
};
