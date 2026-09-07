// Shows accounts whose emails differ only by capitalization, with enough
// context to decide which to keep.
//
//   node scripts/check-duplicate-emails.mjs
//
// Read-only. Changes nothing.

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

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Expected it in .env.local.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const { rows } = await pool.query(`
  SELECT
    u.id,
    u.email,
    LOWER(TRIM(u.email))                                   AS normalized,
    u.name,
    u.role,
    u.created_at,
    (u.password_hash IS NOT NULL)                          AS has_password,
    (SELECT COUNT(*) FROM student_guardians sg WHERE sg.user_id = u.id) AS students,
    (SELECT COUNT(*) FROM sessions s
       JOIN student_guardians sg2 ON s.student_id = sg2.student_id
      WHERE sg2.user_id = u.id)                            AS sessions
  FROM users u
  WHERE LOWER(TRIM(u.email)) IN (
    SELECT LOWER(TRIM(email)) FROM users
     GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1
  )
  ORDER BY normalized, u.id
`);

if (rows.length === 0) {
  console.log('\nNo duplicate emails. Safe to run migration 003.\n');
  await pool.end();
  process.exit(0);
}

const groups = new Map();
for (const r of rows) {
  if (!groups.has(r.normalized)) groups.set(r.normalized, []);
  groups.get(r.normalized).push(r);
}

console.log(`\n${groups.size} address(es) used by more than one account:\n`);

for (const [normalized, accounts] of groups) {
  console.log(`  ${normalized}`);
  for (const a of accounts) {
    const bits = [
      `id ${a.id}`,
      `"${a.email}"`,
      a.role,
      a.name ? `name: ${a.name}` : 'no name',
      a.has_password ? 'has password' : 'NO PASSWORD',
      `${a.students} student(s)`,
      `${a.sessions} session(s)`,
      `created ${new Date(a.created_at).toISOString().split('T')[0]}`,
    ];
    console.log(`    - ${bits.join('  |  ')}`);
  }

  const withData = accounts.filter((a) => Number(a.students) > 0 || Number(a.sessions) > 0);
  if (withData.length === 0) {
    console.log('    -> none of these have students or sessions: all look like leftover test rows.');
  } else if (withData.length === 1) {
    console.log(`    -> only id ${withData[0].id} has real data; the others look disposable.`);
  } else {
    console.log('    -> more than one has data. Do not delete blindly; decide deliberately.');
  }
  console.log('');
}

console.log('To remove a specific leftover account and everything attached to it:\n');
console.log('  node scripts/delete-account.mjs <id>\n');
console.log('Then re-run:\n');
console.log('  psql "$DATABASE_URL" -f lib/migrations/003_email_case_normalization.sql\n');

await pool.end();
