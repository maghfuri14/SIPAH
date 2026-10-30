const express = require('express');

const router = express.Router();
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'notif-1', title: 'Pembayaran Syahriyah berhasil', detail: 'Pembayaran syahriyah dari Ahmad berhasil dicatat.', unread: true },
      { id: 'notif-2', title: 'Pendaftar baru', detail: 'Pendaftar baru: Budi menunggu verifikasi.', unread: true },
      { id: 'notif-3', title: 'Laporan kas diperbarui', detail: 'Saldo kas terbaru tersedia di dashboard.', unread: false },
    ],
  });
});

module.exports = router;
