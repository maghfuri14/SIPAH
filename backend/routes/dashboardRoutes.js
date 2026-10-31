const express = require('express');
const {
  getDashboardStats,
  getChartData,
  getRecentTransactions,
  getPendingApprovals,
} = require('../controllers/dashboardController');

const router = express.Router();
router.get('/stats', getDashboardStats);
router.get('/chart', getChartData);
router.get('/recent-transactions', getRecentTransactions);
router.get('/pending-approvals', getPendingApprovals);

module.exports = router;
