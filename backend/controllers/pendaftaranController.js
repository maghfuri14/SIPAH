const crypto = require('crypto');
const { pool } = require('../config/db');

async function getAllPendaftaran(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM pendaftaran ORDER BY tanggal_pendaftaran DESC',
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function createPendaftaran(req, res) {
  try {
    const id = crypto.randomUUID();
    const {
      nama_calon,
      nama_wali,
      no_hp_santri,
      no_hp_wali,
      kategori,
      tanggal_pendaftaran,
      status = 'Baru',
      catatan,
      nis_generated,
      santri_id,
    } = req.body;

    await pool.execute(
      `INSERT INTO pendaftaran (
        id, nama_calon, nama_wali, no_hp_santri, no_hp_wali, kategori,
        tanggal_pendaftaran, status, catatan, nis_generated, santri_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, nama_calon, nama_wali, no_hp_santri || null, no_hp_wali || null,
        kategori, tanggal_pendaftaran, status, catatan || null, nis_generated || null,
        santri_id || null,
      ],
    );
    res.status(201).json({
      success: true,
      message: 'Pendaftaran berhasil ditambahkan',
      data: { id, ...req.body, status },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function updateStatus(req, res) {
  try {
    const { status, nis_generated, santri_id } = req.body;
    const [result] = await pool.execute(
      `UPDATE pendaftaran
       SET status = ?, nis_generated = ?, santri_id = ?
       WHERE id = ?`,
      [status, nis_generated || null, santri_id || null, req.params.id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Data pendaftaran tidak ditemukan' });
    }
    return res.json({ success: true, message: 'Status pendaftaran berhasil diperbarui' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function deletePendaftaran(req, res) {
  try {
    const [result] = await pool.execute('DELETE FROM pendaftaran WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Data pendaftaran tidak ditemukan' });
    }
    return res.json({ success: true, message: 'Pendaftaran berhasil dihapus' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { getAllPendaftaran, createPendaftaran, updateStatus, deletePendaftaran };
