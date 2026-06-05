import fs from 'fs/promises';
import path from 'path';
import { sql } from 'drizzle-orm';
import { db, pool } from '../src/db/index.js';
import { transactions, funds, fundNavHistory, holdings } from '../src/db/schema.js';
import dotenv from 'dotenv';

dotenv.config();

// CHANGED: Fallback to sample_c to use your newly uploaded data
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data', 'sample_c');

async function ingest() {
  console.log(`Starting ingestion from directory: ${DATA_DIR}`);

  try {
    // 1. Read the JSON snapshots
    const txRaw = await fs.readFile(path.join(DATA_DIR, 'transactions.json'), 'utf-8');
    const fundsRaw = await fs.readFile(path.join(DATA_DIR, 'funds.json'), 'utf-8');
    const holdingsRaw = await fs.readFile(path.join(DATA_DIR, 'holdings.json'), 'utf-8');

    const txData = JSON.parse(txRaw);
    const fundsData = JSON.parse(fundsRaw);
    const holdingsData = JSON.parse(holdingsRaw);

    // 2. Wipe existing data safely (CASCADE cleanly handles foreign key constraints)
    console.log('Wiping existing database tables...');
    await db.execute(sql`TRUNCATE TABLE transactions, holdings, fund_nav_history, funds CASCADE;`);

    // 3. Insert Transactions
    console.log(`Inserting ${txData.length} transactions...`);
    if (txData.length > 0) {
      await db.insert(transactions).values(
        txData.map((tx: any) => ({
          id: tx.id,
          txDate: tx.date,
          merchant: tx.merchant,
          category: tx.category || 'uncategorized',
          amount: String(tx.amount), 
          currency: tx.currency,
          memo: tx.memo || null,
        }))
      );
    }

    // 4. Insert Funds & Normalize NAV History
    console.log(`Inserting ${fundsData.length} funds and normalizing NAV history...`);
    for (const fund of fundsData) {
      await db.insert(funds).values({
        id: fund.id,
        name: fund.name,
        category: fund.category,
      });

      // FIXED: Parse 'fund.nav' as an array of objects
      const navRecords = (fund.nav || []).map((navPoint: any) => ({
        fundId: fund.id,
        navDate: navPoint.date,
        nav: String(navPoint.value),
      }));

      if (navRecords.length > 0) {
        await db.insert(fundNavHistory).values(navRecords);
      }
    }

    // 5. Insert Holdings
    console.log(`Inserting ${holdingsData.length} holdings...`);
    if (holdingsData.length > 0) {
      await db.insert(holdings).values(
        holdingsData.map((h: any) => ({
          fundId: h.fund_id,
          fundName: h.fund_name,
          units: String(h.units),
          purchaseDate: h.purchase_date,
          purchaseNav: String(h.purchase_nav),
        }))
      );
    }

    console.log('✅ Ingestion complete. Database is fully grounded and ready for Tara.');
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    process.exit(1);
  } finally {
    // Close the connection pool so the Node script exits cleanly
    await pool.end();
  }
}

ingest();