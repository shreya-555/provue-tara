import { pgTable, text, numeric, date, index, serial } from 'drizzle-orm/pg-core';

// 1. Transactions Table
export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  txDate: date('date').notNull(),
  merchant: text('merchant').notNull(),
  category: text('category').notNull(),
  // Precision 12, scale 2 allows up to 9,999,999,999.99 (Standard finance practice)
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull(),
  memo: text('memo'),
}, (table) => ({
  // Indexes are critical here since the AI will frequently filter by these columns
  dateIdx: index('tx_date_idx').on(table.txDate),
  merchantIdx: index('tx_merchant_idx').on(table.merchant),
  categoryIdx: index('tx_category_idx').on(table.category),
}));

// 2. Funds Metadata Table
export const funds = pgTable('funds', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
});

// 3. Fund NAV History (Normalized for deterministic period-return math)
export const fundNavHistory = pgTable('fund_nav_history', {
  id: serial('id').primaryKey(),
  fundId: text('fund_id').references(() => funds.id).notNull(),
  navDate: date('nav_date').notNull(),
  nav: numeric('nav', { precision: 10, scale: 4 }).notNull(), // Scale 4 for NAV precision
}, (table) => ({
  fundDateIdx: index('nav_fund_date_idx').on(table.fundId, table.navDate),
}));

// 4. User Holdings (Portfolio) Table
export const holdings = pgTable('holdings', {
  id: serial('id').primaryKey(),
  fundId: text('fund_id').references(() => funds.id).notNull(),
  fundName: text('fund_name').notNull(),
  units: numeric('units', { precision: 10, scale: 4 }).notNull(),
  purchaseDate: date('purchase_date').notNull(),
  purchaseNav: numeric('purchase_nav', { precision: 10, scale: 4 }).notNull(),
});