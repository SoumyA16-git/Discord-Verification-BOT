import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('\x1b[34m[INFO] Connecting to Supabase PostgreSQL...\x1b[0m');

  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://postgres.djayvkuhcohtoetigmrd:Soumya%402026@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('\x1b[32m[SUCCESS] Connected to Supabase!\x1b[0m');

    const sqlPath = path.resolve(__dirname, '../../migrations/0001_init.sql');
    console.log(`\x1b[34m[INFO] Reading migration file from: ${sqlPath}\x1b[0m`);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('\x1b[34m[INFO] Executing migration statements...\x1b[0m');
    await client.query(sql);

    console.log('\x1b[32m[SUCCESS] Migration 0001_init.sql executed successfully!\x1b[0m');

    // Verify created tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\x1b[34m[INFO] Verified Public Tables in Supabase:\x1b[0m');
    for (const row of res.rows) {
      console.log(`  - \x1b[32m${row.table_name}\x1b[0m`);
    }
  } catch (err: any) {
    console.error('\x1b[31m[ERROR] Migration failed:\x1b[0m', err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
