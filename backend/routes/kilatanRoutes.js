const express = require('express');
const { getKilatanBySantri, catatPembayaranKilatan, ajukanPembatalan, prosesPembatalan } = require('../controllers/kilatanController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/:santri_id/:tahun', authenticate, getKilatanBySantri);
router.post('/:santri_id/pembayaran', authenticate, authorizeRoles('super_admin', 'admin'), catatPembayaranKilatan);
router.post('/transaksi/:id/ajukan-pembatalan', authenticate, authorizeRoles('super_admin', 'admin'), ajukanPembatalan);
router.post('/transaksi/:id/proses-pembatalan', authenticate, authorizeRoles('super_admin'), prosesPembatalan);

module.exports = router;
