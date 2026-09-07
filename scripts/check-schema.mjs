// Verifies the database has everything the numbered migrations should create.
//
//   node scripts/check-schema.mjs
//
// Read-only. Tells you exactly which migration to run if anything is missing.

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

const tables = (await pool.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`
)).rows.map((r) => r.table_name);

const cols = (await pool.query(
  `SELECT table_name || '.' || column_name AS c
     FROM information_schema.columns WHERE table_schema='public'`
)).rows.map((r) => r.c);

const indexes = (await pool.query(
  `SELECT indexname FROM pg_indexes WHERE schemaname='public'`
)).rows.map((r) => r.indexname);

const roleCheck = (await pool.query(
  `SELECT pg_get_constraintdef(oid) AS def
     FROM pg_constraint WHERE conname = 'users_role_check'`
)).rows[0]?.def || '';

const constraints = (await pool.query(
  `SELECT conname FROM pg_constraint WHERE connamespace = 'public'::regnamespace`
)).rows.map((r) => r.conname);

const checks = [
  ['001', 'tutor_availability table',      tables.includes('tutor_availability')],
  ['001', 'students.subjects',             cols.includes('students.subjects')],
  ['001', 'sessions.notes',                cols.includes('sessions.notes')],
  ['001', 'student_guardians.user_id',     cols.includes('student_guardians.user_id')],
  ['001', 'idx_student_guardians_user_id', indexes.includes('idx_student_guardians_user_id')],
  ['001', 'idx_sessions_tutor_id',         indexes.includes('idx_sessions_tutor_id')],
  ['002', "role allows 'student'",         roleCheck.includes('student')],
  ['002', 'students.user_id',              cols.includes('students.user_id')],
  ['002', 'idx_students_user_id',          indexes.includes('idx_students_user_id')],
  ['002', 'users.updated_at',              cols.includes('users.updated_at')],
  ['002', 'students.updated_at',           cols.includes('students.updated_at')],
  ['003', 'idx_users_email_lower',         indexes.includes('idx_users_email_lower')],
  ['004', 'inquiries table',               tables.includes('inquiries')],
  ['004', 'idx_inquiries_status',          indexes.includes('idx_inquiries_status')],
  ['005', 'tutors.timezone',               cols.includes('tutors.timezone')],
  ['005', 'users.session_version',          cols.includes('users.session_version')],
  ['005', 'sessions uses timestamptz',      (await pool.query(
    `SELECT data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name='sessions' AND column_name='scheduled_at'`
  )).rows[0]?.data_type === 'timestamp with time zone'],
  ['005', 'sessions_tutor_no_overlap',      constraints.includes('sessions_tutor_no_overlap')],
  ['005', 'sessions_student_no_overlap',    constraints.includes('sessions_student_no_overlap')],
  ['005', 'request_rate_limits table',      tables.includes('request_rate_limits')],
];

console.log('');
const missing = new Set();
for (const [mig, label, ok] of checks) {
  console.log(`  ${ok ? '\x1b[32m ok \x1b[0m' : '\x1b[31mMISS\x1b[0m'}  [${mig}]  ${label}`);
  if (!ok) missing.add(mig);
}

// Data-level sanity
const tutors = (await pool.query('SELECT COUNT(*)::int AS n FROM tutors')).rows[0].n;
const badFk = tables.includes('tutor_availability')
  ? (await pool.query(
      `SELECT COUNT(*)::int AS n FROM tutor_availability ta
        WHERE NOT EXISTS (SELECT 1 FROM tutors t WHERE t.id = ta.tutor_id)`
    )).rows[0].n
  : 0;

console.log('');
console.log(`  tutors on file: ${tutors}${tutors === 0 ? '   <- run: node scripts/setup-tutor.mjs' : ''}`);
if (badFk > 0) {
  console.log(`  \x1b[31m${badFk} tutor_availability row(s) point at a tutor that does not exist\x1b[0m`);
  console.log('  (left over from the old setup script writing a users.id there)');
}

console.log('');
if (missing.size === 0) {
  console.log('  Schema is complete.\n');
} else {
  console.log('  Run:');
  for (const m of [...missing].sort()) {
    const file = { '001': '001_fix_mvp_gaps', '002': '002_students_and_accounts', '003': '003_email_case_normalization', '004': '004_inquiries', '005': '005_scheduling_and_rate_limits' }[m];
    console.log(`    psql "$DATABASE_URL" -f lib/migrations/${file}.sql`);
  }
  console.log('');
}

await pool.end();
process.exit(missing.size === 0 ? 0 : 1);
