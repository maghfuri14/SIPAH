const crypto = require('crypto');
const { pool } = require('../config/db');

async function getAllKas(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM kas ORDER BY tanggal DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function createKas(req, res) {
  try {
    const id = crypto.randomUUID();
    const { tanggal, jenis, kategori_nama, nominal, keterangan } = req.body;
    await pool.execute(
      `INSERT INTO kas (id, tanggal, jenis, kategori_nama, nominal, keterangan)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, tanggal, jenis, kategori_nama, nominal, keterangan || null],
    );
    res.status(201).json({
      success: true,
      message: 'Transaksi kas berhasil ditambahkan',
      data: { id, tanggal, jenis, kategori_nama, nominal: Number(nominal), keterangan },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function updateKas(req, res) {
  try {
    const fields = ['tanggal', 'jenis', 'kategori_nama', 'nominal', 'keterangan'];
    const present = fields.filter((field) =>
      Object.prototype.hasOwnProperty.call(req.body, field),
    );
    if (present.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang dikirim' });
    }

    const assignments = present.map((field) => `${field} = ?`).join(', ');
    const values = present.map((field) => req.body[field]);
    const [result] = await pool.execute(
      `UPDATE kas SET ${assignments} WHERE id = ?`,
      [...values, req.params.id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Data kas tidak ditemukan' });
    }
    return res.json({ success: true, message: 'Transaksi kas berhasil diperbarui' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteKas(req, res) {
  try {
    const [rows] = await pool.execute(
      "SELECT id, jenis, nominal, keterangan, kategori_nama, referensi_id FROM kas WHERE id = ? AND COALESCE(status, 'Aktif') = 'Aktif' LIMIT 1",
      [req.params.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data kas tidak ditemukan' });
    }
    const transaction = rows[0];
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute("UPDATE kas SET status = 'Void' WHERE id = ?", [req.params.id]);
      if (transaction.kategori_nama === 'Syahriyah' && transaction.referensi_id) {
        const [records] = await connection.execute(
          'SELECT total_dibayar, nominal_tagihan FROM syahriyah WHERE id = ? LIMIT 1',
          [transaction.referensi_id],
        );
        if (records.length > 0) {
          const paid = Math.max(0, Number(records[0].total_dibayar) - Number(transaction.nominal));
          const status = paid >= Number(records[0].nominal_tagihan) ? 'Lunas' : paid > 0 ? 'Sebagian' : 'Belum';
          await connection.execute(
            'UPDATE syahriyah SET total_dibayar = ?, status = ? WHERE id = ?',
            [paid, status, transaction.referensi_id],
          );
        }
      }
      if (transaction.kategori_nama === 'Kilatan' && transaction.referensi_id) {
        const [records] = await connection.execute(
          'SELECT total_dibayar, nominal_tagihan FROM kilatan WHERE id = ? LIMIT 1',
          [transaction.referensi_id],
        );
        if (records.length > 0) {
          const paid = Math.max(0, Number(records[0].total_dibayar) - Number(transaction.nominal));
          const status = paid >= Number(records[0].nominal_tagihan) ? 'Lunas' : paid > 0 ? 'Sebagian' : 'Belum';
          await connection.execute(
            'UPDATE kilatan SET total_dibayar = ?, status = ? WHERE id = ?',
            [paid, status, transaction.referensi_id],
          );
        }
      }
      await connection.execute(
        `INSERT INTO kas (id, tanggal, jenis, kategori_nama, nominal, keterangan, referensi_id)
         VALUES (?, CURDATE(), 'Pengeluaran', 'Pengeluaran Koreksi', ?, ?, ?)`,
        [crypto.randomUUID(), Number(transaction.nominal),
          `Void: ${transaction.keterangan || 'Transaksi kas'}`, req.params.id],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return res.json({ success: true, message: 'Transaksi kas berhasil dihapus' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { getAllKas, createKas, updateKas, deleteKas };
