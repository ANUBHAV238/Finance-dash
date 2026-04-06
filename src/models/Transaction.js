const mongoose = require('mongoose');

const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
};

const CATEGORIES = {
  // Income categories
  SALARY: 'salary',
  FREELANCE: 'freelance',
  INVESTMENT: 'investment',
  BONUS: 'bonus',
  OTHER_INCOME: 'other_income',

  // Expense categories
  FOOD: 'food',
  HOUSING: 'housing',
  TRANSPORT: 'transport',
  UTILITIES: 'utilities',
  HEALTHCARE: 'healthcare',
  ENTERTAINMENT: 'entertainment',
  EDUCATION: 'education',
  SHOPPING: 'shopping',
  OTHER_EXPENSE: 'other_expense',
};

const transactionSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    type: {
      type: String,
      enum: {
        values: Object.values(TRANSACTION_TYPES),
        message: '{VALUE} is not a valid transaction type',
      },
      required: [true, 'Transaction type is required'],
    },
    category: {
      type: String,
      enum: {
        values: Object.values(CATEGORIES),
        message: '{VALUE} is not a valid category',
      },
      required: [true, 'Category is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    // Who created this record (audit trail)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Soft delete support
    isDeleted: {
      type: Boolean,
      default: false,
      select: false, // Hidden by default from queries
    },
    deletedAt: {
      type: Date,
      select: false,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for common query patterns
transactionSchema.index({ date: -1 }); // Latest first
transactionSchema.index({ type: 1, date: -1 });
transactionSchema.index({ category: 1, date: -1 });
transactionSchema.index({ createdBy: 1, date: -1 });
transactionSchema.index({ isDeleted: 1 }); // Soft delete filter

// Always filter out soft-deleted records by default
transactionSchema.pre(/^find/, function (next) {
  // `this` refers to current query
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// Soft delete instance method
transactionSchema.methods.softDelete = async function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = { Transaction, TRANSACTION_TYPES, CATEGORIES };
