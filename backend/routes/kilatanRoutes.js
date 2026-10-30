const express = require('express');
const { getKilatanBySantri, catatPembayaranKilatan } = require('../controllers/kilatanController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/:santri_id/:tahun', authenticate, getKilatanBySantri);
router.post('/:santri_id/pembayaran', authenticate, authorizeRoles('super_admin', 'admin'), catatPembayaranKilatan);

module.exports = router;
