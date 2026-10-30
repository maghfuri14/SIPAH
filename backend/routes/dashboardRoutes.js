const express = require('express');
const {
  getDashboardStats,
  getChartData,
  getRecentTransactions,
} = require('../controllers/dashboardController');

const router = express.Router();
router.get('/stats', getDashboardStats);
router.get('/chart', getChartData);
router.get('/recent-transactions', getRecentTransactions);

module.exports = router;
