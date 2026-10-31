const express = require('express');
const { getSyahriyahBySantri, catatPembayaran, ajukanPembatalan, prosesPembatalan } = require('../controllers/syahriyahController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/:santri_id/:tahun', authenticate, getSyahriyahBySantri);
router.post('/:santri_id/pembayaran', authenticate, authorizeRoles('super_admin', 'admin'), catatPembayaran);
router.post('/transaksi/:id/ajukan-pembatalan', authenticate, authorizeRoles('super_admin', 'admin'), ajukanPembatalan);
router.post('/transaksi/:id/proses-pembatalan', authenticate, authorizeRoles('super_admin'), prosesPembatalan);

module.exports = router;
