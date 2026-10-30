const express = require('express');
const {
  getAllPendaftaran,
  createPendaftaran,
  updateStatus,
  deletePendaftaran,
} = require('../controllers/pendaftaranController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, getAllPendaftaran);
router.post('/', authenticate, authorizeRoles('super_admin', 'admin'), createPendaftaran);
router.put('/:id/status', authenticate, authorizeRoles('super_admin', 'admin'), updateStatus);
router.delete('/:id', authenticate, authorizeRoles('super_admin', 'admin'), deletePendaftaran);

module.exports = router;
