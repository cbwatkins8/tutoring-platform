// Creates (or repairs) the tutor account.
//   node scripts/setup-tutor.mjs
//   node scripts/setup-tutor.mjs you@example.com 'your-password' 'Your Name'
//
// Run from the project root. Idempotent: safe to run repeatedly, and it will
// finish a setup that previously failed partway through.

import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import bcrypt from 'bcryptjs';

// A standalone node script does not get .env.local the way Next.js does,
// so load it here rather than connecting to a default that does not exist.
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = (match[2] || '').trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Expected it in .env.local.');
  process.exit(1);
}

const email = (process.argv[2] || 'tutor@civiltutoring.com').trim().toLowerCase();
const password = process.argv[3] || 'ChangeMe-' + Math.random().toString(36).slice(2, 10);
const name = process.argv[4] || 'Civil Tutor';
const generated = !process.argv[3];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- user row ---
    let userId;
    const existingUser = await client.query(
      'SELECT id, role FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      console.log(`User ${email} already exists (id ${userId}); reusing it.`);
      if (existingUser.rows[0].role !== 'tutor') {
        await client.query(`UPDATE users SET role = 'tutor' WHERE id = $1`, [userId]);
        console.log('  -> role corrected to tutor');
      }
    } else {
      const hash = await bcrypt.hash(password, 10);
      const inserted = await client.query(
        `INSERT INTO users (email, name, password_hash, role, created_at)
         VALUES ($1, $2, $3, 'tutor', NOW())
         RETURNING id`,
        [email, name, hash]
      );
      userId = inserted.rows[0].id;
      console.log(`Created tutor user (id ${userId}).`);
    }

    // --- tutors row ---
    let tutorId;
    const existingTutor = await client.query(
      'SELECT id FROM tutors WHERE user_id = $1',
      [userId]
    );

    if (existingTutor.rows.length > 0) {
      tutorId = existingTutor.rows[0].id;
      console.log(`Tutor profile already exists (id ${tutorId}).`);
    } else {
      const inserted = await client.query(
        `INSERT INTO tutors (user_id, bio, subjects, grades_teach, hourly_rate, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id`,
        [
          userId,
          'Civil Tutoring',
          'Math, Science, English, History, Spanish, Chemistry, Physics, Biology',
          '6-12',
          50,
        ]
      );
      tutorId = inserted.rows[0].id;
      console.log(`Created tutor profile (id ${tutorId}).`);
    }

    // --- availability ---
    // tutor_availability.tutor_id references tutors(id), not users(id).
    const haveSlots = await client.query(
      'SELECT COUNT(*)::int AS n FROM tutor_availability WHERE tutor_id = $1',
      [tutorId]
    );

    if (haveSlots.rows[0].n > 0) {
      console.log(`Availability already set (${haveSlots.rows[0].n} slots).`);
    } else {
      for (let day = 1; day <= 5; day++) {
        await client.query(
          `INSERT INTO tutor_availability (tutor_id, day_of_week, start_time, end_time, available, created_at)
           VALUES ($1, $2, '15:00', '20:00', TRUE, NOW())`,
          [tutorId, day]
        );
      }
      console.log('Added availability: Mon-Fri, 3:00 PM - 8:00 PM.');
    }

    await client.query('COMMIT');

    console.log('\nTutor is ready.');
    console.log(`  Email:    ${email}`);
    if (existingUser.rows.length === 0) {
      console.log(`  Password: ${password}`);
      if (generated) {
        console.log('  (generated - save it now, it is not stored anywhere else)');
      }
    } else {
      console.log('  Password: unchanged (this account already existed)');
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\nSetup failed, nothing was written:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
