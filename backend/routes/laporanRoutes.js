const express = require('express');
const {
  getRekapKeuangan,
  getRekapSyahriyah,
  getRekapSantri,
  getRekapPendaftaran,
} = require('../controllers/laporanController');

const router = express.Router();
router.get('/keuangan', getRekapKeuangan);
router.get('/syahriyah', getRekapSyahriyah);
router.get('/santri', getRekapSantri);
router.get('/pendaftaran', getRekapPendaftaran);
module.exports = router;
