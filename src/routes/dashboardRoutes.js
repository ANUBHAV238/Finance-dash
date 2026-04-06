const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../models/User');

// All dashboard routes require authentication + at least Analyst role
router.use(authenticate);
router.use(authorize(ROLES.ANALYST, ROLES.ADMIN));

/**
 * @route   GET /api/dashboard/summary
 * @desc    Total income, total expenses, net balance
 * @query   startDate?, endDate?
 * @access  Analyst, Admin
 */
router.get('/summary', dashboardController.getSummary);

/**
 * @route   GET /api/dashboard/categories
 * @desc    Breakdown of totals by category (and type)
 * @query   startDate?, endDate?, type?
 * @access  Analyst, Admin
 */
router.get('/categories', dashboardController.getCategoryBreakdown);

/**
 * @route   GET /api/dashboard/trends/monthly
 * @desc    Monthly income vs expense for last N months
 * @query   months? (default: 12)
 * @access  Analyst, Admin
 */
router.get('/trends/monthly', dashboardController.getMonthlyTrends);

/**
 * @route   GET /api/dashboard/trends/weekly
 * @desc    Weekly income vs expense for last N weeks
 * @query   weeks? (default: 8)
 * @access  Analyst, Admin
 */
router.get('/trends/weekly', dashboardController.getWeeklyTrends);

/**
 * @route   GET /api/dashboard/recent
 * @desc    Most recent N transactions
 * @query   limit? (default: 10, max: 50)
 * @access  Analyst, Admin
 */
router.get('/recent', dashboardController.getRecentActivity);

/**
 * @route   GET /api/dashboard/top-categories
 * @desc    Top expense categories by total spend
 * @query   limit? (default: 5), startDate?, endDate?
 * @access  Analyst, Admin
 */
router.get('/top-categories', dashboardController.getTopCategories);

module.exports = router;
