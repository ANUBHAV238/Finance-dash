const { Transaction, TRANSACTION_TYPES } = require('../models/Transaction');

/**
 * Build a date range filter for aggregation pipelines.
 */
const buildDateFilter = (startDate, endDate) => {
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);
  return Object.keys(dateFilter).length ? { date: dateFilter } : {};
};

/**
 * Calculate total income, total expenses, and net balance.
 */
const getSummary = async ({ startDate, endDate } = {}) => {
  const dateFilter = buildDateFilter(startDate, endDate);

  const result = await Transaction.aggregate([
    { $match: { isDeleted: { $ne: true }, ...dateFilter } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = {
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    incomeCount: 0,
    expenseCount: 0,
  };

  result.forEach(({ _id, total, count }) => {
    if (_id === TRANSACTION_TYPES.INCOME) {
      summary.totalIncome = total;
      summary.incomeCount = count;
    } else if (_id === TRANSACTION_TYPES.EXPENSE) {
      summary.totalExpenses = total;
      summary.expenseCount = count;
    }
  });

  summary.netBalance = summary.totalIncome - summary.totalExpenses;
  return summary;
};

/**
 * Break down totals by category.
 */
const getCategoryBreakdown = async ({ startDate, endDate, type } = {}) => {
  const matchStage = { isDeleted: { $ne: true }, ...buildDateFilter(startDate, endDate) };
  if (type) matchStage.type = type;

  const result = await Transaction.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { category: '$category', type: '$type' },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' },
      },
    },
    { $sort: { total: -1 } },
    {
      $project: {
        _id: 0,
        category: '$_id.category',
        type: '$_id.type',
        total: { $round: ['$total', 2] },
        count: 1,
        avgAmount: { $round: ['$avgAmount', 2] },
      },
    },
  ]);

  return result;
};

/**
 * Monthly trend: income vs expenses per month for the last N months.
 */
const getMonthlyTrends = async ({ months = 12 } = {}) => {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const result = await Transaction.aggregate([
    {
      $match: {
        isDeleted: { $ne: true },
        date: { $gte: since },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          type: '$type',
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        type: '$_id.type',
        total: { $round: ['$total', 2] },
        count: 1,
      },
    },
  ]);

  // Pivot into a unified month-keyed structure for easier frontend consumption
  const trendsMap = {};
  result.forEach(({ year, month, type, total, count }) => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    if (!trendsMap[key]) {
      trendsMap[key] = { period: key, year, month, income: 0, expenses: 0, incomeCount: 0, expenseCount: 0 };
    }
    if (type === TRANSACTION_TYPES.INCOME) {
      trendsMap[key].income = total;
      trendsMap[key].incomeCount = count;
    } else {
      trendsMap[key].expenses = total;
      trendsMap[key].expenseCount = count;
    }
  });

  return Object.values(trendsMap).map((item) => ({
    ...item,
    net: +(item.income - item.expenses).toFixed(2),
  }));
};

/**
 * Weekly trend for the last N weeks.
 */
const getWeeklyTrends = async ({ weeks = 8 } = {}) => {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  const result = await Transaction.aggregate([
    {
      $match: {
        isDeleted: { $ne: true },
        date: { $gte: since },
      },
    },
    {
      $group: {
        _id: {
          year: { $isoWeekYear: '$date' },
          week: { $isoWeek: '$date' },
          type: '$type',
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.week': 1 } },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        week: '$_id.week',
        type: '$_id.type',
        total: { $round: ['$total', 2] },
        count: 1,
      },
    },
  ]);

  const trendsMap = {};
  result.forEach(({ year, week, type, total, count }) => {
    const key = `${year}-W${String(week).padStart(2, '0')}`;
    if (!trendsMap[key]) {
      trendsMap[key] = { period: key, year, week, income: 0, expenses: 0 };
    }
    if (type === TRANSACTION_TYPES.INCOME) {
      trendsMap[key].income = total;
    } else {
      trendsMap[key].expenses = total;
    }
  });

  return Object.values(trendsMap).map((item) => ({
    ...item,
    net: +(item.income - item.expenses).toFixed(2),
  }));
};

/**
 * Recent transactions — latest N entries.
 */
const getRecentActivity = async ({ limit = 10 } = {}) => {
  const transactions = await Transaction.find()
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(Math.min(50, parseInt(limit) || 10));

  return transactions;
};

/**
 * Top spending categories (expenses only) ranked by total.
 */
const getTopCategories = async ({ limit = 5, startDate, endDate } = {}) => {
  const matchStage = {
    isDeleted: { $ne: true },
    type: TRANSACTION_TYPES.EXPENSE,
    ...buildDateFilter(startDate, endDate),
  };

  const result = await Transaction.aggregate([
    { $match: matchStage },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $limit: Math.min(20, parseInt(limit) || 5) },
    {
      $project: {
        _id: 0,
        category: '$_id',
        total: { $round: ['$total', 2] },
        count: 1,
      },
    },
  ]);

  return result;
};

module.exports = {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrends,
  getWeeklyTrends,
  getRecentActivity,
  getTopCategories,
};
