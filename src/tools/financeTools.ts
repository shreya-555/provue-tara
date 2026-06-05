import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { db } from '../db/index.js';
import { funds, fundNavHistory, holdings } from '../db/schema.js';
import { eq, ilike, and, desc, asc, lte, gte } from 'drizzle-orm';

export const calculatePeriodReturnTool = createTool({
  id: 'calculate_period_return',
  description: 'Calculates the market period return (percentage yield) for a mutual fund between two specific dates.',
  inputSchema: z.object({
    fundNamePattern: z.string().describe('The name or partial name of the fund (e.g., "Saffron Bluechip")'),
    startDate: z.string().describe('Start date (YYYY-MM-DD)'),
    endDate: z.string().describe('End date (YYYY-MM-DD)'),
  }),
  execute: async (args: any) => {
    console.log(`[Tool: period_return] Extracted args:`, args);

    const fundMatch = await db.select().from(funds).where(ilike(funds.name, `%${args.fundNamePattern}%`)).limit(1);
    
    if (fundMatch.length === 0) {
      return { status: "no_data", message: `Could not find any fund matching "${args.fundNamePattern}".` };
    }
    const targetFund = fundMatch[0];

    const startNavResult = await db.select().from(fundNavHistory)
      .where(and(eq(fundNavHistory.fundId, targetFund.id), gte(fundNavHistory.navDate, args.startDate)))
      .orderBy(asc(fundNavHistory.navDate)).limit(1);

    const endNavResult = await db.select().from(fundNavHistory)
      .where(and(eq(fundNavHistory.fundId, targetFund.id), lte(fundNavHistory.navDate, args.endDate)))
      .orderBy(desc(fundNavHistory.navDate)).limit(1);

    if (!startNavResult.length || !endNavResult.length) {
      return { status: "no_data", message: "Insufficient NAV history to calculate return for this date range." };
    }

    const startNav = parseFloat(startNavResult[0].nav);
    const endNav = parseFloat(endNavResult[0].nav);
    const percentageReturn = ((endNav - startNav) / startNav) * 100;

    return {
      status: "success",
      fundName: targetFund.name,
      startNav: Number(startNav.toFixed(4)),
      endNav: Number(endNav.toFixed(4)),
      percentageReturn: Number(percentageReturn.toFixed(2))
    };
  },
});

export const calculateRealizedReturnTool = createTool({
  id: 'calculate_realized_return',
  description: 'Calculates the actual realized return (profit/loss) on a specific holding the user owns in their portfolio.',
  inputSchema: z.object({
    fundNamePattern: z.string().optional().describe('The name or partial name of the fund in the user portfolio. Leave undefined to calculate entire portfolio-wide return.'),
  }),
  execute: async (args: any) => {
    console.log(`[Tool: realized_return] Extracted args:`, args);

    const conditions = args.fundNamePattern && args.fundNamePattern.trim() !== '' 
      ? [ilike(holdings.fundName, `%${args.fundNamePattern}%`)] 
      : [];
      
    const userHoldings = await db.select().from(holdings).where(and(...conditions));

    if (userHoldings.length === 0) {
      return { status: "no_data", message: "No holdings found matching this query." };
    }

    let totalInvested = 0;
    let totalCurrentValue = 0;
    const holdingBreakdown = [];

    for (const holding of userHoldings) {
      const latestNavResult = await db.select().from(fundNavHistory)
        .where(eq(fundNavHistory.fundId, holding.fundId))
        .orderBy(desc(fundNavHistory.navDate)).limit(1);

      if (!latestNavResult.length) continue;

      const currentNav = parseFloat(latestNavResult[0].nav);
      const purchaseNav = parseFloat(holding.purchaseNav);
      const units = parseFloat(holding.units);

      const investedValue = purchaseNav * units;
      const currentValue = currentNav * units;
      const absoluteReturn = currentValue - investedValue;
      const percentageReturn = ((currentNav - purchaseNav) / purchaseNav) * 100;

      totalInvested += investedValue;
      totalCurrentValue += currentValue;

      holdingBreakdown.push({
        fundName: holding.fundName,
        investedValue: Number(investedValue.toFixed(2)),
        currentValue: Number(currentValue.toFixed(2)),
        absoluteReturn: Number(absoluteReturn.toFixed(2)),
        percentageReturn: Number(percentageReturn.toFixed(2))
      });
    }

    // Fix: Declare this BEFORE trying to use it in the return block
    const portfolioAbsoluteReturn = totalCurrentValue - totalInvested;
    const portfolioPercentageReturn = totalInvested > 0 ? (portfolioAbsoluteReturn / totalInvested) * 100 : 0;

    return {
      status: "success",
      summary: {
        totalInvested: Number(totalInvested.toFixed(2)),
        totalCurrentValue: Number(totalCurrentValue.toFixed(2)),
        portfolioAbsoluteReturn: Number(portfolioAbsoluteReturn.toFixed(2)),
        portfolioPercentageReturn: Number(portfolioPercentageReturn.toFixed(2))
      },
      holdings: holdingBreakdown
    };
  },
});