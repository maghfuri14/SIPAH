const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getKwitansiConfig,
  saveKwitansiConfig,
  getTarifConfig,
  saveTarifConfig,
} = require('../controllers/pengaturanController');

const router = express.Router();

router.get('/kwitansi-config', authenticate, getKwitansiConfig);
router.put('/kwitansi-config', authenticate, authorizeRoles('super_admin'), saveKwitansiConfig);
router.get('/tarif', authenticate, getTarifConfig);
router.put('/tarif', authenticate, authorizeRoles('super_admin'), saveTarifConfig);

module.exports = router;
