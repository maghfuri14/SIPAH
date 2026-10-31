const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getKwitansiConfig,
  saveKwitansiConfig,
  getTarifConfig,
  saveTarifConfig,
  getProfilPondok,
  saveProfilPondok,
  getIuranTambahan,
  saveIuranTambahan,
  getKategoriKas,
  saveKategoriKas,
} = require('../controllers/pengaturanController');

const router = express.Router();

router.get('/kwitansi-config', authenticate, getKwitansiConfig);
router.put('/kwitansi-config', authenticate, authorizeRoles('super_admin'), saveKwitansiConfig);
router.get('/tarif', authenticate, getTarifConfig);
router.put('/tarif', authenticate, authorizeRoles('super_admin'), saveTarifConfig);
router.get('/profil', authenticate, getProfilPondok);
router.put('/profil', authenticate, authorizeRoles('super_admin'), saveProfilPondok);
router.get('/iuran-tambahan', authenticate, getIuranTambahan);
router.put('/iuran-tambahan', authenticate, authorizeRoles('super_admin'), saveIuranTambahan);
router.get('/kategori-kas', authenticate, getKategoriKas);
router.put('/kategori-kas', authenticate, authorizeRoles('super_admin'), saveKategoriKas);

module.exports = router;
