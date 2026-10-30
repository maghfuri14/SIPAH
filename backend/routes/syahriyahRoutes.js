const express = require('express');
const { getSyahriyahBySantri, catatPembayaran } = require('../controllers/syahriyahController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/:santri_id/:tahun', authenticate, getSyahriyahBySantri);
router.post('/:santri_id/pembayaran', authenticate, authorizeRoles('super_admin', 'admin'), catatPembayaran);

module.exports = router;
