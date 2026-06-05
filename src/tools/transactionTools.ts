import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { db } from '../db/index.js';
import { transactions } from '../db/schema.js';
import { and, gte, lte, ilike, ne } from 'drizzle-orm';

export const queryTransactionsTool = createTool({
  id: 'query_transactions',
  description: 'Queries transactions to calculate spend, net spend, handle refunds, and cluster merchant aliases. Always use this to answer questions about spending or transaction history.',
  inputSchema: z.object({
    startDate: z.string().describe('Start date (YYYY-MM-DD). REQUIRED. If the user asks for "overall", "total", or no date is specified, you MUST pass "2000-01-01".'),
    endDate: z.string().describe('End date (YYYY-MM-DD). REQUIRED. If the user asks for "overall", "total", or no date is specified, you MUST pass "2099-12-31".'),
    category: z.string().describe('Exact category name (e.g., "food"). Pass an empty string "" if no category is specified.'),
    merchantPattern: z.string().optional().describe('A base string to programmatically match merchant variants (e.g., pass "swiggy" to match "Swiggy Instamart")'),
    excludeTransfers: z.boolean().default(true).describe('If true, ignores self-transfers in spend calculations.'),
  }),
  execute: async (payload: any) => {
    const args = payload?.data ?? payload?.context ?? payload?.input ?? payload ?? {};
    console.log(`\n[Tool: query_transactions] Extracted args:`, args);
    
    const conditions = [];
    
    if (args.startDate) conditions.push(gte(transactions.txDate, args.startDate));
    if (args.endDate) conditions.push(lte(transactions.txDate, args.endDate));
    
    // Changed from eq() to ilike() to handle "Food", "FOOD", and "food" interchangeably
    if (args.category && args.category.trim() !== '') {
      conditions.push(ilike(transactions.category, args.category));
    }
    
    if (args.merchantPattern) conditions.push(ilike(transactions.merchant, `%${args.merchantPattern}%`));
    if (args.excludeTransfers) conditions.push(ne(transactions.category, 'transfer'));

    try {
      const results = await db.select().from(transactions).where(and(...conditions));
      console.log(`[Tool: query_transactions] Postgres returned ${results.length} rows.`);

      if (results.length === 0) {
        return { status: "no_data", message: "No transactions found matching these exact criteria." };
      }

      let totalOutflow = 0;
      let totalInflow = 0;
      const merchantClusters = new Set<string>();

      for (const tx of results) {
        const amount = parseFloat(tx.amount);
        if (amount > 0) {
          totalOutflow += amount;
        } else {
          totalInflow += Math.abs(amount);
        }
        merchantClusters.add(tx.merchant);
      }

      const netSpend = totalOutflow - totalInflow;

      const finalResponse = {
        status: "success",
        transactionCount: results.length,
        aliasesFound: Array.from(merchantClusters),
        financials: {
          totalSpend: Number(totalOutflow.toFixed(2)),
          totalRefunds: Number(totalInflow.toFixed(2)),
         netSpend: Number(netSpend.toFixed(2)),
          currency: results[0]?.currency || 'INR'
        },
        sampleRows: results.slice(0, 5) // Reduced sample rows to keep LLM context clean
      };

      console.log(`[Tool: query_transactions] Handing data back to Tara:`, JSON.stringify(finalResponse.financials));
      return finalResponse;

    } catch (dbError: any) {
      console.error(`[Tool: query_transactions] CRITICAL DB ERROR:`, dbError.message);
      return { status: "error", message: dbError.message };
    }
  },
});