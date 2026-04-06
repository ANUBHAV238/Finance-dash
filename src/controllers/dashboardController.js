const dashboardService = require('../services/dashboardService');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/dashboard/summary
 * Total income, expenses, and net balance.
 * Query params: startDate, endDate
 */
const getSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const summary = await dashboardService.getSummary({ startDate, endDate });
    return sendSuccess(res, { message: 'Summary retrieved.', data: summary });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/categories
 * Breakdown of totals by category.
 * Query params: startDate, endDate, type (income|expense)
 */
const getCategoryBreakdown = async (req, res, next) => {
  try {
    const { startDate, endDate, type } = req.query;
    const breakdown = await dashboardService.getCategoryBreakdown({ startDate, endDate, type });
    return sendSuccess(res, { message: 'Category breakdown retrieved.', data: { breakdown } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/trends/monthly
 * Monthly income vs expense trends.
 * Query params: months (default: 12)
 */
const getMonthlyTrends = async (req, res, next) => {
  try {
    const { months } = req.query;
    const trends = await dashboardService.getMonthlyTrends({ months });
    return sendSuccess(res, { message: 'Monthly trends retrieved.', data: { trends } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/trends/weekly
 * Weekly income vs expense trends.
 * Query params: weeks (default: 8)
 */
const getWeeklyTrends = async (req, res, next) => {
  try {
    const { weeks } = req.query;
    const trends = await dashboardService.getWeeklyTrends({ weeks });
    return sendSuccess(res, { message: 'Weekly trends retrieved.', data: { trends } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/recent
 * Most recent N transactions.
 * Query params: limit (default: 10, max: 50)
 */
const getRecentActivity = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const transactions = await dashboardService.getRecentActivity({ limit });
    return sendSuccess(res, { message: 'Recent activity retrieved.', data: { transactions } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/top-categories
 * Top spending categories by total expense.
 * Query params: limit (default: 5), startDate, endDate
 */
const getTopCategories = async (req, res, next) => {
  try {
    const { limit, startDate, endDate } = req.query;
    const categories = await dashboardService.getTopCategories({ limit, startDate, endDate });
    return sendSuccess(res, { message: 'Top categories retrieved.', data: { categories } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrends,
  getWeeklyTrends,
  getRecentActivity,
  getTopCategories,
};
