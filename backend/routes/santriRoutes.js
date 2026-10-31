const express = require('express');
const {
  getAllSantri,
  getSantriById,
  createSantri,
  updateSantri,
  updateStatusPermanenBulk,
  createKeringananSantriBulk,
  deleteSantri,
  importSantri,
  getKeringananSantri,
  getPaidSyahriyahMonths,
  createKeringananSantri,
  deleteKeringanan,
  getAllKeringanan,
} = require('../controllers/santriController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, getAllSantri);
router.put('/status-permanen/bulk', authenticate, authorizeRoles('super_admin', 'admin'), updateStatusPermanenBulk);
router.post('/keringanan/bulk', authenticate, authorizeRoles('super_admin', 'admin'), createKeringananSantriBulk);
router.get('/keringanan/all', authenticate, getAllKeringanan);
router.post('/', authenticate, authorizeRoles('super_admin', 'admin'), createSantri);
router.post('/import', authenticate, authorizeRoles('super_admin', 'admin'), importSantri);
router.get('/:id/keringanan', authenticate, getKeringananSantri);
router.get('/:id/keringanan/paid-months/:tahun', authenticate, getPaidSyahriyahMonths);
router.post('/:id/keringanan', authenticate, authorizeRoles('super_admin', 'admin'), createKeringananSantri);
router.delete('/keringanan/:id', authenticate, authorizeRoles('super_admin', 'admin'), deleteKeringanan);
router.get('/:id', authenticate, getSantriById);
router.put('/:id', authenticate, authorizeRoles('super_admin', 'admin'), updateSantri);
router.delete('/:id', authenticate, authorizeRoles('super_admin', 'admin'), deleteSantri);

module.exports = router;
