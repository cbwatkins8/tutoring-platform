// Apply every SQL migration once, in filename order.
// Usage: npm run db:migrate

import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = (match[2] || '').trim();
    }
  }
}

loadEnvLocal();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Expected it in .env.local.');
  process.exit(1);
}

const migrationsDir = path.join(process.cwd(), 'lib', 'migrations');
const files = fs.readdirSync(migrationsDir)
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .sort();
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const applied = new Set(
    (await client.query('SELECT filename FROM schema_migrations')).rows
      .map((row) => row.filename)
  );

  for (const filename of files) {
    if (applied.has(filename)) {
      console.log(`skip  ${filename}`);
      continue;
    }

    console.log(`apply ${filename}`);
    const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename]
    );
  }

  console.log('Database migrations are current.');
} finally {
  await client.end();
}
