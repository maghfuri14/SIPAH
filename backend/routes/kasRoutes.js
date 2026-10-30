const express = require('express');
const {
  getAllKas,
  createKas,
  updateKas,
  deleteKas,
} = require('../controllers/kasController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, getAllKas);
router.post('/', authenticate, authorizeRoles('super_admin', 'admin'), createKas);
router.put('/:id', authenticate, authorizeRoles('super_admin', 'admin'), updateKas);
router.delete('/:id', authenticate, authorizeRoles('super_admin', 'admin'), deleteKas);

module.exports = router;
