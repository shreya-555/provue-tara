import { queryTransactionsTool } from './transactionTools.js';
import { calculatePeriodReturnTool, calculateRealizedReturnTool } from './financeTools.js';

export const allTools = {
  queryTransactions: queryTransactionsTool,
  calculatePeriodReturn: calculatePeriodReturnTool,
  calculateRealizedReturn: calculateRealizedReturnTool,
};