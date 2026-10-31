const { pool } = require('../config/db');

async function getDashboardStats(req, res) {
  try {
    const [[santri]] = await pool.query(
      `SELECT COUNT(*) AS totalSantri,
        SUM(status = 'Aktif') AS santriAktif,
        SUM(status = 'Tidak Aktif') AS santriTidakAktif
       FROM santri`,
    );
    const [[pendaftaran]] = await pool.query(
      `SELECT COUNT(*) AS pendaftarBaru FROM pendaftaran WHERE status = 'Baru'`,
    );
    const [[kas]] = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN jenis = 'Pemasukan' THEN nominal ELSE 0 END), 0) AS totalPemasukanKas,
              COALESCE(SUM(CASE WHEN jenis = 'Pengeluaran' THEN nominal ELSE 0 END), 0) AS totalPengeluaranKas
       FROM kas WHERE status IN ('Aktif', 'Disetujui')`,
    );
    const [[bulanIni]] = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN jenis = 'Pemasukan' THEN nominal ELSE 0 END), 0) AS pemasukanBulanIni
       FROM kas
       WHERE tanggal >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
         AND tanggal < DATE_ADD(DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
         AND status IN ('Aktif', 'Disetujui')`,
    );

    const pemasukan = Number(kas.totalPemasukanKas);
    const pengeluaran = Number(kas.totalPengeluaranKas);
    res.json({
      totalSantri: Number(santri.totalSantri),
      santriAktif: Number(santri.santriAktif || 0),
      santriTidakAktif: Number(santri.santriTidakAktif || 0),
      pendaftarBaru: Number(pendaftaran.pendaftarBaru),
      totalPemasukanKas: pemasukan,
      totalPengeluaranKas: pengeluaran,
      saldoKas: pemasukan - pengeluaran,
      pemasukanBulanIni: Number(bulanIni.pemasukanBulanIni),
      pendapatanBulanIni: Number(bulanIni.pemasukanBulanIni),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getChartData(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(tanggal, '%Y-%m') AS periode,
              COALESCE(SUM(CASE WHEN jenis = 'Pemasukan' THEN nominal ELSE 0 END), 0) AS pemasukan,
              COALESCE(SUM(CASE WHEN jenis = 'Pengeluaran' THEN nominal ELSE 0 END), 0) AS pengeluaran
       FROM kas
       WHERE tanggal >= DATE_SUB(DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01'), INTERVAL 5 MONTH)
         AND status IN ('Aktif', 'Disetujui')
       GROUP BY periode ORDER BY periode ASC`,
    );
    res.json({
      success: true,
      data: rows.map((row) => ({
        periode: row.periode,
        pemasukan: Number(row.pemasukan),
        pengeluaran: Number(row.pengeluaran),
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getRecentTransactions(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM kas WHERE status IN ('Aktif', 'Disetujui') ORDER BY tanggal DESC, id DESC LIMIT 5",
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getPendingApprovals(req, res) {
  try {
    const [pembatalan] = await pool.query(
      `SELECT t.id, t.kas_id, t.modul, t.referensi_id, t.nominal, t.cancel_requested_at,
              u.nama_lengkap AS diajukan_oleh
       FROM transaksi t
       LEFT JOIN users u ON u.id = t.cancel_requested_by
       WHERE t.cancel_request_status = 'pending'
       ORDER BY t.cancel_requested_at DESC`,
    );
    const [kasKeluar] = await pool.query(
      `SELECT k.*, a.id AS approval_id, a.requested_by, a.status AS approval_status, a.created_at,
              u.nama_lengkap AS diajukan_oleh
       FROM kas_keluar_approvals a
       JOIN kas k ON k.id = a.kas_id
       LEFT JOIN users u ON u.id = a.requested_by
       WHERE a.status = 'Menunggu' OR k.status = 'Menunggu'
       ORDER BY a.created_at DESC`,
    );
    return res.json({ success: true, data: { pembatalan, kasKeluar } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { getDashboardStats, getChartData, getRecentTransactions, getPendingApprovals };
