const express = require('express');
const {
  getAllKas,
  createKas,
  updateKas,
  deleteKas,
  ajukanPembatalan,
  prosesPembatalan,
  approveKasKeluar,
} = require('../controllers/kasController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, getAllKas);
router.post('/', authenticate, authorizeRoles('super_admin', 'admin'), createKas);
router.put('/:id', authenticate, authorizeRoles('super_admin', 'admin'), updateKas);
router.post('/:id/ajukan-pembatalan', authenticate, authorizeRoles('super_admin', 'admin'), ajukanPembatalan);
router.post('/:id/proses-pembatalan', authenticate, authorizeRoles('super_admin'), prosesPembatalan);
router.post('/:id/proses-kas-keluar', authenticate, authorizeRoles('super_admin'), approveKasKeluar);
router.delete('/:id', authenticate, authorizeRoles('super_admin', 'admin'), deleteKas);

module.exports = router;
