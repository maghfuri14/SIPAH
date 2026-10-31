const crypto = require('crypto');
const { pool } = require('../config/db');
const { logActivity } = require('../middleware/activityLogger');

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
    let status = req.user?.role === 'super_admin' ? 'Disetujui' : 'Disetujui';
    let needsApproval = false;
    if (jenis === 'Pengeluaran' && req.user?.role === 'admin') {
      const [[daily]] = await pool.query(
        `SELECT COALESCE(SUM(nominal), 0) AS total FROM kas
         WHERE jenis = 'Pengeluaran'
           AND DATE(tanggal) = CURDATE()
           AND created_by = ?
           AND status IN ('Aktif', 'Disetujui')`,
        [req.user.id],
      );
      needsApproval = Number(daily.total) + Number(nominal) >= 500000;
      if (needsApproval) status = 'Menunggu';
    }
    await pool.execute(
      `INSERT INTO kas (id, tanggal, jenis, kategori_nama, nominal, keterangan, created_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, tanggal, jenis, kategori_nama, nominal, keterangan || null, req.user?.id || null, status],
    );
    if (needsApproval) {
      await pool.execute(
        `INSERT INTO kas_keluar_approvals (id, kas_id, nominal, requested_by, status)
         VALUES (?, ?, ?, ?, 'Menunggu')`,
        [crypto.randomUUID(), id, Number(nominal), req.user?.id || null],
      );
    }
    await logActivity(req.user?.id, 'CREATE', 'KAS', id, req.body, req.ip);
    res.status(201).json({
      success: true,
      message: 'Transaksi kas berhasil ditambahkan',
      data: { id, tanggal, jenis, kategori_nama, nominal: Number(nominal), keterangan },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function ajukanPembatalan(req, res) {
    try {
      const [rows] = await pool.execute(
        `SELECT t.* FROM transaksi t
         WHERE t.id = ? OR t.kas_id = ?
         ORDER BY t.created_at DESC LIMIT 1`,
        [req.params.id, req.params.id],
      );
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
      }
      const transaction = rows[0];
      const [[kasRow]] = await pool.execute(
        'SELECT tanggal, created_by FROM kas WHERE id = ? LIMIT 1',
        [transaction.kas_id],
      );
      const isSameCreatorToday = kasRow
        && String(kasRow.created_by) === String(req.user.id)
        && String(kasRow.tanggal).substring(0, 10) === new Date().toISOString().substring(0, 10);
      if (isSameCreatorToday) {
        await voidTransaksiTransaction(transaction, req.user.id, null);
        return res.json({ success: true, message: 'Transaksi berhasil dibatalkan.' });
      }
      await pool.execute(
        `UPDATE transaksi SET cancel_request_status = 'pending',
         cancel_requested_by = ?, cancel_requested_at = NOW()
         WHERE id = ?`,
        [req.user.id, transaction.id],
      );
      return res.json({ success: true, message: 'Pengajuan pembatalan dikirim untuk persetujuan.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async function voidTransaksiTransaction(transaction, processedBy, reason) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const kasId = transaction.kas_id;
      await connection.execute("UPDATE kas SET status = 'Void' WHERE id = ?", [kasId]);
      if (transaction.modul === 'Syahriyah') {
        await reverseModulePayment(connection, 'syahriyah', transaction.referensi_id, transaction.nominal);
      } else if (transaction.modul === 'Kilatan') {
        await reverseModulePayment(connection, 'kilatan', transaction.referensi_id, transaction.nominal);
      }
      await connection.execute(
        `UPDATE transaksi SET cancel_request_status = 'approved',
         cancel_reason = ? WHERE id = ?`,
        [reason, transaction.id],
      );
      await connection.execute(
        `INSERT INTO kas (id, tanggal, jenis, kategori_nama, nominal, keterangan, referensi_id, created_by, status)
         VALUES (?, CURDATE(), 'Pengeluaran', 'Pengeluaran Koreksi', ?, ?, ?, ?, 'Disetujui')`,
        [crypto.randomUUID(), Number(transaction.nominal), `Void transaksi ${transaction.modul}`, kasId, processedBy],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function reverseModulePayment(connection, table, referensiId, nominal) {
    const [rows] = await connection.execute(
      `SELECT id, total_dibayar, nominal_tagihan FROM ${table} WHERE id = ? LIMIT 1`,
      [referensiId],
    );
    if (rows.length === 0) return;
    const paid = Math.max(0, Number(rows[0].total_dibayar) - Number(nominal));
    const status = paid >= Number(rows[0].nominal_tagihan) ? 'Lunas' : paid > 0 ? 'Sebagian' : 'Belum';
    await connection.execute(`UPDATE ${table} SET total_dibayar = ?, status = ? WHERE id = ?`, [paid, status, referensiId]);
  }

  async function prosesPembatalan(req, res) {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Hanya Super Admin yang dapat memproses pembatalan.' });
    }
    try {
      const { status, alasan } = req.body;
      const [rows] = await pool.execute(
        `SELECT * FROM transaksi WHERE id = ? OR kas_id = ? LIMIT 1`,
        [req.params.id, req.params.id],
      );
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Pengajuan pembatalan tidak ditemukan.' });
      }
      if (status === 'rejected') {
        if (!alasan) return res.status(400).json({ success: false, message: 'Alasan penolakan wajib diisi.' });
        await pool.execute(
          "UPDATE transaksi SET cancel_request_status = 'rejected', cancel_reason = ? WHERE id = ?",
          [alasan, rows[0].id],
        );
        return res.json({ success: true, message: 'Pengajuan pembatalan ditolak.' });
      }
      if (status !== 'approved') {
        return res.status(400).json({ success: false, message: 'Status persetujuan tidak valid.' });
      }
      await voidTransaksiTransaction(rows[0], req.user.id, alasan || null);
      return res.json({ success: true, message: 'Pembatalan transaksi disetujui.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async function approveKasKeluar(req, res) {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Hanya Super Admin yang dapat menyetujui kas keluar.' });
    }
    try {
      const { status, alasan } = req.body;
      if (!['Disetujui', 'Ditolak'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Status persetujuan tidak valid.' });
      }
      if (status === 'Ditolak' && !alasan) {
        return res.status(400).json({ success: false, message: 'Alasan penolakan wajib diisi.' });
      }
      const kasStatus = status === 'Disetujui' ? 'Disetujui' : 'Ditolak';
      await pool.execute(
        `UPDATE kas SET status = ? WHERE id = ?`,
        [kasStatus, req.params.id],
      );
      await pool.execute(
        `UPDATE kas_keluar_approvals SET status = ?, reason = ?, processed_by = ?, processed_at = NOW() WHERE kas_id = ?`,
        [status, alasan || null, req.user.id, req.params.id],
      );
      return res.json({ success: true, message: `Pengeluaran kas ${status.toLowerCase()}.` });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
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
    return res.json({
      success: true,
      message: 'Transaksi kas berhasil diperbarui',
      data: { id: req.params.id, ...req.body },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteKas(req, res) {
  try {
    const [rows] = await pool.execute(
      "SELECT id, jenis, nominal, keterangan, kategori_nama, referensi_id FROM kas WHERE id = ? AND status IN ('Aktif', 'Disetujui') LIMIT 1",
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

module.exports = { getAllKas, createKas, updateKas, deleteKas, ajukanPembatalan, prosesPembatalan, approveKasKeluar };
