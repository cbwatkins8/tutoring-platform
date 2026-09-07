// Shows consultation requests from the public contact form.
//
//   node scripts/list-inquiries.mjs          # new ones only
//   node scripts/list-inquiries.mjs --all    # everything
//
// Until the tutor dashboard has an inbox, this is how you read them.

import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

function loadEnvLocal() {
  const p = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = (m[2] || '').trim();
  }
}
loadEnvLocal();

const all = process.argv.includes('--all');

if (!process.env.DATABASE_URL) {
  console.error('\nDATABASE_URL is not set. Expected it in .env.local.\n');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

let rows;
try {
  ({ rows } = await pool.query(
    all
      ? `SELECT * FROM inquiries ORDER BY created_at DESC`
      : `SELECT * FROM inquiries WHERE status = 'new' ORDER BY created_at DESC`
  ));
} catch (err) {
  await pool.end().catch(() => {});

  // 42P01 = undefined_table. Almost always means the migration has not run.
  if (err.code === '42P01') {
    console.error('\n  The `inquiries` table does not exist yet.\n');
    console.error('  Run migration 004 first:\n');
    console.error('    psql "$DATABASE_URL" -f lib/migrations/004_inquiries.sql\n');
    console.error('  Or check every migration at once:\n');
    console.error('    node scripts/check-schema.mjs\n');
    process.exit(1);
  }

  if (err.code === 'ECONNREFUSED') {
    console.error('\n  Cannot reach the database.\n');
    console.error('  Is Postgres running?   docker compose up -d\n');
    process.exit(1);
  }

  console.error(`\n  Database error (${err.code || 'unknown'}): ${err.message}\n`);
  process.exit(1);
}

if (rows.length === 0) {
  console.log(all ? '\nNo enquiries yet.\n' : '\nNo new enquiries. Use --all to see every one.\n');
  process.exit(0);
}

console.log(`\n${rows.length} ${all ? 'enquiry(ies)' : 'new enquiry(ies)'}:\n`);

for (const r of rows) {
  console.log('─'.repeat(64));
  console.log(`  #${r.id}  ${new Date(r.created_at).toLocaleString()}   [${r.status}]`);
  console.log(`  ${r.parent_name}  <${r.email}>${r.phone ? '  ' + r.phone : ''}`);
  if (r.student_name || r.grade_level || r.subject) {
    console.log(
      `  Student: ${r.student_name || '—'}` +
        (r.grade_level ? `, grade ${r.grade_level}` : '') +
        (r.subject ? `, ${r.subject}` : '')
    );
  }
  if (r.referral_source) console.log(`  Heard via: ${r.referral_source}`);
  console.log('');
  console.log(
    '  ' + String(r.message || '').split('\n').join('\n  ')
  );
  console.log('');
}

console.log('─'.repeat(64));
console.log('\nMark one handled:');
console.log("  psql \"$DATABASE_URL\" -c \"UPDATE inquiries SET status='contacted' WHERE id=1;\"\n");

await pool.end();
