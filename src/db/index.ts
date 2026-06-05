import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';

// Load environment variables from our .env file
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('❌ CRITICAL: DATABASE_URL environment variable is missing.');
}

// Set up a connection pool optimized for concurrent agent queries
export const pool = new Pool({
  connectionString: databaseUrl,
});

// Initialize Drizzle with our strongly-typed schema layout
export const db = drizzle(pool, { schema });