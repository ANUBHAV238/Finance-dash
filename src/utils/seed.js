/**
 * Seed script: populates the DB with demo users and transactions.
 * Run with: npm run seed
 *
 * WARNING: Clears existing data before seeding.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { User, ROLES } = require('../models/User');
const { Transaction, TRANSACTION_TYPES, CATEGORIES } = require('../models/Transaction');
const config = require('../config/env');

const SEED_USERS = [
  { name: 'Alice Admin', email: 'admin@finance.dev', password: 'password123', role: ROLES.ADMIN },
  { name: 'Bob Analyst', email: 'analyst@finance.dev', password: 'password123', role: ROLES.ANALYST },
  { name: 'Carol Viewer', email: 'viewer@finance.dev', password: 'password123', role: ROLES.VIEWER },
];

const randomBetween = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);

const randomDate = (monthsBack) => {
  const d = new Date();
  d.setMonth(d.getMonth() - Math.floor(Math.random() * monthsBack));
  d.setDate(Math.floor(Math.random() * 28) + 1);
  return d;
};

const INCOME_CATEGORIES = [
  CATEGORIES.SALARY, CATEGORIES.FREELANCE, CATEGORIES.INVESTMENT, CATEGORIES.BONUS, CATEGORIES.OTHER_INCOME,
];

const EXPENSE_CATEGORIES = [
  CATEGORIES.FOOD, CATEGORIES.HOUSING, CATEGORIES.TRANSPORT, CATEGORIES.UTILITIES,
  CATEGORIES.HEALTHCARE, CATEGORIES.ENTERTAINMENT, CATEGORIES.EDUCATION,
  CATEGORIES.SHOPPING, CATEGORIES.OTHER_EXPENSE,
];

const generateTransactions = (userId, count = 60) => {
  const transactions = [];
  for (let i = 0; i < count; i++) {
    const isIncome = Math.random() > 0.55; // ~45% income, ~55% expenses
    const type = isIncome ? TRANSACTION_TYPES.INCOME : TRANSACTION_TYPES.EXPENSE;
    const categoryPool = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const category = categoryPool[Math.floor(Math.random() * categoryPool.length)];

    transactions.push({
      amount: isIncome ? randomBetween(500, 8000) : randomBetween(10, 2000),
      type,
      category,
      date: randomDate(12),
      description: `${type === TRANSACTION_TYPES.INCOME ? 'Received' : 'Paid'} for ${category.replace(/_/g, ' ')}`,
      notes: Math.random() > 0.6 ? `Seed record #${i + 1}` : undefined,
      createdBy: userId,
    });
  }
  return transactions;
};

const seed = async () => {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Transaction.deleteMany({});
    console.log('🗑  Cleared existing users and transactions');

    // Create users
    const createdUsers = await User.create(SEED_USERS);
    console.log(`👤 Created ${createdUsers.length} users:`);
    createdUsers.forEach((u) => console.log(`   - ${u.role.padEnd(8)} ${u.email}`));

    // Generate transactions owned by the analyst user
    const analystUser = createdUsers.find((u) => u.role === ROLES.ANALYST);
    const adminUser = createdUsers.find((u) => u.role === ROLES.ADMIN);

    const transactions = [
      ...generateTransactions(analystUser._id, 50),
      ...generateTransactions(adminUser._id, 30),
    ];

    await Transaction.insertMany(transactions);
    console.log(`💳 Created ${transactions.length} transactions`);

    console.log('\n✅ Seed complete! Login credentials:');
    SEED_USERS.forEach(({ email, password, role }) => {
      console.log(`   ${role.padEnd(8)} → ${email} / ${password}`);
    });
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB disconnected.');
    process.exit(0);
  }
};

seed();
