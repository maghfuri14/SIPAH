const crypto = require('crypto');
const { pool } = require('../config/db');
const { logActivity } = require('../middleware/activityLogger');

const SANTRI_FIELDS = [
  'nis',
  'nama',
  'nama_wali',
  'no_hp_santri',
  'no_hp_wali',
  'kategori',
  'status',
  'status_syahriyah',
  'status_kilatan',
  'tanggal_masuk',
  'catatan',
];

async function getKeringananSantri(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, santri_id, tahun, bulan_mulai, bulan_selesai, jenis, tipe, keterangan, created_at
       FROM syahriyah_keringanan WHERE santri_id = ? ORDER BY tahun DESC, bulan_mulai ASC`,
      [req.params.id],
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getAllKeringanan(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, santri_id, tahun, bulan_mulai, bulan_selesai, jenis, tipe, keterangan, created_at
       FROM syahriyah_keringanan ORDER BY tahun DESC, bulan_mulai ASC`,
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
    const { tahun, bulan_mulai, bulan_selesai, jenis, tipe = 'Syahriyah', keterangan } = req.body;
    const start = Number(bulan_mulai);
    const end = Number(bulan_selesai);
    if (!tahun || start < 1 || end > 12 || start > end
      || !['Bebas', 'Keringanan'].includes(jenis)
      || !['Syahriyah', 'Kilatan'].includes(tipe)) {
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
       (id, santri_id, tahun, bulan_mulai, bulan_selesai, jenis, tipe, keterangan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.id, Number(tahun), start, end, jenis, tipe, keterangan || null],
    );
    const [rows] = await pool.execute(
      'SELECT id, santri_id, tahun, bulan_mulai, bulan_selesai, jenis, tipe, keterangan, created_at FROM syahriyah_keringanan WHERE id = ?',
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

async function getSantriById(req, res) {
  try {
    const [rows] = await pool.execute('SELECT * FROM santri WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Santri tidak ditemukan' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function createSantri(req, res) {
  try {
    const id = crypto.randomUUID();
    const values = SANTRI_FIELDS.map((field) => (
      field === 'status_syahriyah' || field === 'status_kilatan'
        ? req.body[field] || 'Normal'
        : req.body[field] ?? null
    ));

    await pool.execute(
      `INSERT INTO santri (
        id, nis, nama, nama_wali, no_hp_santri, no_hp_wali,
        kategori, status, status_syahriyah, status_kilatan, tanggal_masuk, catatan
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, ...values],
    );
    await logActivity(
      req.user?.id,
      'CREATE',
      'SANTRI',
      id,
      req.body,
      req.ip,
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
    const [currentRows] = await pool.execute(
      'SELECT version FROM santri WHERE id = ? LIMIT 1',
      [req.params.id],
    );
    if (currentRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data santri tidak ditemukan',
      });
    }

    if (!Object.prototype.hasOwnProperty.call(req.body, 'version')) {
      return res.status(400).json({
        success: false,
        message: 'Versi data santri wajib dikirim untuk memperbarui data.',
      });
    }
    const expectedVersion = Number(req.body.version);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      return res.status(400).json({
        success: false,
        message: 'Versi data santri tidak valid.',
      });
    }

    const [result] = await pool.execute(
      `UPDATE santri SET ${assignments}, version = version + 1
       WHERE id = ? AND version = ?`,
      [...values, req.params.id, expectedVersion],
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({
        success: false,
        message: 'Data telah diubah oleh pengguna lain. Silakan muat ulang.',
      });
    }
    await logActivity(
      req.user?.id,
      'UPDATE',
      'SANTRI',
      req.params.id,
      req.body,
      req.ip,
    );

    return res.json({
      success: true,
      message: 'Data santri berhasil diperbarui',
      data: { id: req.params.id, ...req.body },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updateStatusPermanenBulk(req, res) {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(Boolean) : [];
    const { status_syahriyah, status_kilatan } = req.body;
    const validStatus = ['Normal', 'Keringanan', 'Bebas'];
    if (ids.length === 0) return res.status(400).json({ success: false, message: 'Tidak ada santri yang dipilih.' });
    if (status_syahriyah && !validStatus.includes(status_syahriyah)) return res.status(400).json({ success: false, message: 'Status Syahriyah tidak valid.' });
    if (status_kilatan && !validStatus.includes(status_kilatan)) return res.status(400).json({ success: false, message: 'Status Kilatan tidak valid.' });
    if (!status_syahriyah && !status_kilatan) return res.status(400).json({ success: false, message: 'Status permanen wajib dipilih.' });

    const assignments = [];
    const values = [];
    if (status_syahriyah) { assignments.push('status_syahriyah = ?'); values.push(status_syahriyah); }
    if (status_kilatan) { assignments.push('status_kilatan = ?'); values.push(status_kilatan); }
    assignments.push('version = version + 1');
    const placeholders = ids.map(() => '?').join(', ');
    const [result] = await pool.execute(
      `UPDATE santri SET ${assignments.join(', ')} WHERE id IN (${placeholders})`,
      [...values, ...ids],
    );
    await logActivity(req.user?.id, 'BULK_UPDATE', 'SANTRI', null, req.body, req.ip);
    return res.json({ success: true, affected: result.affectedRows, message: `Status permanen ${result.affectedRows} santri berhasil diperbarui.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function createKeringananSantriBulk(req, res) {
  let connection;
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(Boolean) : [];
    const { tahun, bulan_mulai, bulan_selesai, jenis, tipe, keterangan } = req.body;
    const start = Number(bulan_mulai);
    const end = Number(bulan_selesai);
    if (ids.length === 0 || !tahun || start < 1 || end > 12 || start > end
      || !['Bebas', 'Keringanan'].includes(jenis)
      || !['Syahriyah', 'Kilatan'].includes(tipe)) {
      return res.status(400).json({ success: false, message: 'Data periode keringanan massal tidak valid.' });
    }
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const insertedIds = [];
    for (const santriId of ids) {
      const [existing] = await connection.execute(
        `SELECT id FROM syahriyah_keringanan
         WHERE santri_id = ? AND tahun = ? AND bulan_mulai = ? AND bulan_selesai = ?
           AND jenis = ? AND tipe = ? LIMIT 1`,
        [santriId, Number(tahun), start, end, jenis, tipe],
      );
      if (existing.length > 0) continue;
      const id = crypto.randomUUID();
      await connection.execute(
        `INSERT INTO syahriyah_keringanan
         (id, santri_id, tahun, bulan_mulai, bulan_selesai, jenis, tipe, keterangan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, santriId, Number(tahun), start, end, jenis, tipe, keterangan || null],
      );
      insertedIds.push(id);
    }
    await logActivity(req.user?.id, 'BULK_CREATE', 'Keringanan', null, req.body, req.ip);
    await connection.commit();
    return res.status(201).json({
      success: true,
      data: { inserted: insertedIds.length },
      message: `Keringanan massal berhasil dibuat untuk ${insertedIds.length} santri.`,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
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

    await logActivity(
      req.user?.id,
      'DELETE',
      'SANTRI',
      req.params.id,
      null,
      req.ip,
    );

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
          kategori, status, status_syahriyah, status_kilatan, tanggal_masuk, catatan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          row.status_kilatan || 'Normal',
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
  getSantriById,
  createSantri,
  updateSantri,
  updateStatusPermanenBulk,
  createKeringananSantriBulk,
  deleteSantri,
  importSantri,
  getKeringananSantri,
  getPaidSyahriyahMonths,
  createKeringananSantri,
  deleteKeringanan,
  getAllKeringanan,
};
