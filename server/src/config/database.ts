import { Pool } from 'pg';

// Don't use dotenv in production - Railway sets env vars directly
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const databaseUrl = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';

console.log('=== DATABASE CONFIG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!databaseUrl);
console.log('DATABASE_URL starts with:', databaseUrl?.substring(0, 30) + '...');
console.log('========================');

if (!databaseUrl && isProduction) {
  console.error('❌ FATAL: DATABASE_URL is not set in production!');
  console.error('Available env vars:', Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('PASSWORD')).join(', '));
  process.exit(1);
}

export const pool = new Pool({
  connectionString: databaseUrl || 'postgresql://postgres:postgres@localhost:5432/website_manager',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

export async function testConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
  } finally {
    client.release();
  }
}

export async function query(text: string, params?: any[]): Promise<any> {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
  }
  
  return result;
}

export default { pool, query, testConnection };
