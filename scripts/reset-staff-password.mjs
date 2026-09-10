// Reset a tutor/admin password without storing the plaintext password.
// Usage: node scripts/reset-staff-password.mjs [email]

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match || match[1] in process.env) continue;
    let value = (match[2] || '').trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');

const email = (process.argv[2] || 'tutor@civiltutoring.com').trim().toLowerCase();
const temporaryPassword = `TakeTwo-${crypto.randomBytes(12).toString('base64url')}!`;
const passwordHash = await bcrypt.hash(temporaryPassword, 12);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  const result = await client.query(
    `UPDATE users
        SET password_hash = $1,
            session_version = session_version + 1,
            updated_at = NOW()
      WHERE email = $2 AND role IN ('tutor', 'admin')
      RETURNING email, role`,
    [passwordHash, email]
  );
  if (!result.rows[0]) throw new Error(`No tutor or administrator account found for ${email}`);
  console.log(`Account: ${result.rows[0].email}`);
  console.log(`Role: ${result.rows[0].role}`);
  console.log(`Temporary password: ${temporaryPassword}`);
  console.log('All previous sessions have been revoked.');
} finally {
  await client.end();
}
