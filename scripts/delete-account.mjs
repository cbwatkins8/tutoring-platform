// Deletes one user account and everything attached to it.
//
//   node scripts/delete-account.mjs 7          # shows what would be deleted
//   node scripts/delete-account.mjs 7 --yes    # actually deletes
//
// Refuses to touch a tutor account. Transactional: all or nothing.

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

const id = Number(process.argv[2]);
const confirmed = process.argv.includes('--yes');

if (!Number.isInteger(id)) {
  console.error('Usage: node scripts/delete-account.mjs <user-id> [--yes]');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
  const user = await client.query(
    'SELECT id, email, name, role FROM users WHERE id = $1',
    [id]
  );

  if (user.rows.length === 0) {
    console.error(`No user with id ${id}.`);
    process.exit(1);
  }

  const u = user.rows[0];

  if (u.role === 'tutor') {
    console.error(`id ${id} is a TUTOR account (${u.email}). Refusing to delete.`);
    process.exit(1);
  }

  // Students this user is the ONLY guardian for. A child shared with another
  // parent must survive, so only orphans get removed.
  const orphans = await client.query(
    `SELECT s.id, s.first_name, s.last_name
       FROM students s
       JOIN student_guardians sg ON s.id = sg.student_id
      WHERE sg.user_id = $1
        AND (SELECT COUNT(*) FROM student_guardians x WHERE x.student_id = s.id) = 1`,
    [id]
  );

  const orphanIds = orphans.rows.map((r) => r.id);

  const sess = orphanIds.length
    ? await client.query(
        'SELECT COUNT(*)::int AS n FROM sessions WHERE student_id = ANY($1::int[])',
        [orphanIds]
      )
    : { rows: [{ n: 0 }] };

  console.log(`\nAccount:  id ${u.id}  ${u.email}  (${u.role})  ${u.name || ''}`);
  console.log(`Students to delete: ${orphanIds.length ? orphans.rows.map((r) => `${r.first_name} ${r.last_name}`).join(', ') : 'none'}`);
  console.log(`Sessions to delete: ${sess.rows[0].n}`);

  if (!confirmed) {
    console.log('\nNothing deleted. Re-run with --yes to go ahead.\n');
    process.exit(0);
  }

  await client.query('BEGIN');

  if (orphanIds.length) {
    await client.query('DELETE FROM sessions WHERE student_id = ANY($1::int[])', [orphanIds]);
    await client.query('DELETE FROM student_guardians WHERE student_id = ANY($1::int[])', [orphanIds]);
    await client.query('DELETE FROM students WHERE id = ANY($1::int[])', [orphanIds]);
  }

  await client.query('DELETE FROM student_guardians WHERE user_id = $1', [id]);
  // A student login pointing at this user would block the delete.
  await client.query('UPDATE students SET user_id = NULL WHERE user_id = $1', [id]);
  await client.query('DELETE FROM users WHERE id = $1', [id]);

  await client.query('COMMIT');
  console.log(`\nDeleted account ${id}.\n`);
} catch (e) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('\nFailed, nothing was deleted:', e.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
