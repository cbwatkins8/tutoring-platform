// End-to-end test against a RUNNING dev server + live Postgres.
//
//   Terminal 1:  npm run dev
//   Terminal 2:  node scripts/e2e-test.mjs
//
// Drives the real HTTP API exactly as a browser would. Creates test accounts
// under @e2e.invalid and deletes them at the end.

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

// Next.js moves to the next free port when 3000 is taken, so probe a range and
// find the one actually serving THIS app rather than assuming.
let BASE = process.env.TEST_BASE_URL || null;

async function findApp() {
  if (BASE) return BASE;
  for (const port of [3000, 3001, 3002, 3003, 3004, 3005]) {
    const url = `http://localhost:${port}`;
    try {
      const res = await fetch(url + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(2000),
      });
      const body = await res.json().catch(() => null);
      // Our /api/login rejects an empty body with 400 and a `message` field.
      if (res.status === 400 && typeof body?.message === 'string') return url;
    } catch {
      /* nothing listening, or not ours */
    }
  }
  return null;
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  \x1b[32mPASS\x1b[0m  ${name}`);
    passed++;
  } else {
    console.log(`  \x1b[31mFAIL\x1b[0m  ${name}${detail ? ' -- ' + detail : ''}`);
    failed++;
    failures.push(name + (detail ? ' -- ' + detail : ''));
  }
}

async function api(method, endpoint, { token, body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + endpoint, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  const setCookie = res.headers.get('set-cookie') || '';
  const cookieMatch = setCookie.match(/(?:^|,\s*)civil_session=([^;]+)/);
  const responseToken = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
  return { status: res.status, data, token: responseToken, setCookie };
}

const stamp = Date.now();
const parentA = {
  parent_name: 'Test ParentA',
  email: `parent-a-${stamp}@e2e.invalid`,
  password: 'TestPass123!',
  student_first_name: 'Ada',
  student_last_name: 'AlphaTest',
  grade_level: '9',
  subjects: 'Math, Science',
};
const parentB = {
  parent_name: 'Test ParentB',
  email: `parent-b-${stamp}@e2e.invalid`,
  password: 'TestPass456!',
  student_first_name: 'Ben',
  student_last_name: 'BetaTest',
  grade_level: '11',
  subjects: 'English',
};

function futureISO(daysAhead, hour) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

async function cleanup() {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const users = await c.query(
      `SELECT id FROM users WHERE email LIKE $1`,
      [`%-${stamp}@e2e.invalid`]
    );
    const ids = users.rows.map((r) => r.id);
    if (ids.length) {
      const studs = await c.query(
        `SELECT student_id FROM student_guardians WHERE user_id = ANY($1::int[])`,
        [ids]
      );
      const sids = studs.rows.map((r) => r.student_id);
      if (sids.length) {
        await c.query(`DELETE FROM sessions WHERE student_id = ANY($1::int[])`, [sids]);
        await c.query(`DELETE FROM student_guardians WHERE student_id = ANY($1::int[])`, [sids]);
        await c.query(`DELETE FROM students WHERE id = ANY($1::int[])`, [sids]);
      }
      await c.query(`DELETE FROM student_guardians WHERE user_id = ANY($1::int[])`, [ids]);
      await c.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [ids]);
    }
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    console.error('Cleanup problem:', e.message);
  } finally {
    c.release();
  }
}

async function run() {
  const found = await findApp();
  if (!found) {
    console.log('\n  Could not find the Civil Tutoring app on ports 3000-3005.');
    console.log('  Start it in another terminal:  npm run dev');
    console.log('  Or point the test at it:       TEST_BASE_URL=http://localhost:PORT node scripts/e2e-test.mjs\n');
    await pool.end();
    process.exit(1);
  }
  BASE = found;
  console.log(`\nTesting ${BASE}\n${'='.repeat(60)}`);

  // -- preflight ------------------------------------------------------
  console.log('\n[0] Preflight');
  try {
    const r = await fetch(BASE, { method: 'GET' });
    check('server is reachable', r.ok || r.status < 500);
  } catch {
    console.log('\n  Nothing is listening on ' + BASE + '.');
    console.log('  Start the app in another terminal:  npm run dev\n');
    process.exit(1);
  }

  // Confirm it is THIS app and not some other service on the same port.
  // A wrong server produces dozens of meaningless failures otherwise.
  const probe = await api('POST', '/api/login', { body: {} });
  const looksRight = probe.status === 400 && typeof probe.data?.message === 'string';

  if (!looksRight) {
    console.log('\n  ' + BASE + ' answered, but it is NOT the Civil Tutoring app.');
    console.log(`  POST /api/login returned ${probe.status}: ${JSON.stringify(probe.data)}`);
    console.log('  Expected 400 with a "message" field.\n');
    if (probe.status === 405 || probe.data?.detail !== undefined) {
      console.log('  A different service is using this port. Find it with:');
      console.log('    lsof -i :3000');
      console.log('  then stop it, or run the app elsewhere:');
      console.log('    PORT=3001 npm run dev');
      console.log('    TEST_BASE_URL=http://localhost:3001 node scripts/e2e-test.mjs\n');
    } else {
      console.log('  Is `npm run dev` running in another terminal?\n');
    }
    process.exit(1);
  }
  check('responding server is the Civil Tutoring app', true);

  const c = await pool.connect();
  try {
    const t = await c.query(`SELECT to_regclass('public.tutor_availability') AS x`);
    check('tutor_availability table exists (migration 001 applied)', t.rows[0].x !== null,
      'run: psql "$DATABASE_URL" -f lib/migrations/001_fix_mvp_gaps.sql');
    const cols = await c.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name IN ('students','sessions','student_guardians')`
    );
    const names = cols.rows.map((r) => r.column_name);
    check('students.subjects column exists', names.includes('subjects'));
    check('sessions.notes column exists', names.includes('notes'));
    check('student_guardians.user_id column exists', names.includes('user_id'));
    const tut = await c.query('SELECT COUNT(*)::int AS n FROM tutors');
    check('a tutor exists', tut.rows[0].n > 0, 'run: node scripts/setup-tutor.mjs');
  } finally {
    c.release();
  }

  await cleanup();

  // -- signup ---------------------------------------------------------
  console.log('\n[1] Parent signup');
  const s1 = await api('POST', '/api/signup', { body: parentA });
  check('signup returns 201', s1.status === 201, `got ${s1.status}: ${JSON.stringify(s1.data)}`);
  check('signup sets an HttpOnly session cookie',
    !!s1.token && /httponly/i.test(s1.setCookie));

  const dup = await api('POST', '/api/signup', { body: parentA });
  check('duplicate email rejected', dup.status === 409, `got ${dup.status}`);

  const short = await api('POST', '/api/signup', {
    body: { ...parentA, email: `short-${stamp}@e2e.invalid`, password: '123' },
  });
  check('short password rejected', short.status === 400, `got ${short.status}`);

  const missing = await api('POST', '/api/signup', {
    body: { email: `x-${stamp}@e2e.invalid` },
  });
  check('missing fields rejected', missing.status === 400, `got ${missing.status}`);

  // did the subjects actually persist?
  const c2 = await pool.connect();
  try {
    const r = await c2.query(
      `SELECT s.subjects, s.grade_level FROM students s
       JOIN student_guardians sg ON s.id = sg.student_id
       JOIN users u ON sg.user_id = u.id WHERE u.email = $1`,
      [parentA.email]
    );
    check('student row was created and linked', r.rows.length === 1, `found ${r.rows.length}`);
    check('selected subjects were saved', r.rows[0]?.subjects === 'Math, Science',
      `stored: ${JSON.stringify(r.rows[0]?.subjects)}`);
    check('grade stored as integer 9', r.rows[0]?.grade_level === 9,
      `stored: ${JSON.stringify(r.rows[0]?.grade_level)}`);
  } finally {
    c2.release();
  }

  // -- login ----------------------------------------------------------
  console.log('\n[2] Login');
  const badPw = await api('POST', '/api/login', {
    body: { email: parentA.email, password: 'wrong' },
  });
  check('wrong password rejected', badPw.status === 401, `got ${badPw.status}`);

  const noUser = await api('POST', '/api/login', {
    body: { email: `nobody-${stamp}@e2e.invalid`, password: 'x' },
  });
  check('unknown email rejected', noUser.status === 401, `got ${noUser.status}`);

  const good = await api('POST', '/api/login', {
    body: { email: parentA.email, password: parentA.password },
  });
  check('correct password accepted', good.status === 200, `got ${good.status}`);
  check('login returns role=parent', good.data?.role === 'parent');
  const loginToken = good.token;

  const upper = await api('POST', '/api/login', {
    body: { email: parentA.email.toUpperCase(), password: parentA.password },
  });
  check('email is case-insensitive at login', upper.status === 200, `got ${upper.status}`);

  // -- student fetch / profile ----------------------------------------
  console.log('\n[3] Student profile');
  const noAuth = await api('GET', '/api/student');
  check('unauthenticated student fetch rejected', noAuth.status === 401, `got ${noAuth.status}`);

  const stu = await api('GET', '/api/student', { token: loginToken });
  check('authenticated student fetch works', stu.status === 200, `got ${stu.status}`);
  check('returns the right student', stu.data?.student?.first_name === 'Ada',
    JSON.stringify(stu.data?.student));

  const upd = await api('PATCH', '/api/student/update', {
    token: loginToken,
    body: { school_name: 'Lincoln High', academic_notes: 'Needs algebra help' },
  });
  check('profile update returns 200', upd.status === 200, `got ${upd.status}`);

  const stu2 = await api('GET', '/api/student', { token: loginToken });
  check('school_name persisted', stu2.data?.student?.school_name === 'Lincoln High',
    JSON.stringify(stu2.data?.student?.school_name));
  check('academic_notes persisted', stu2.data?.student?.academic_notes === 'Needs algebra help');

  // -- booking --------------------------------------------------------
  console.log('\n[4] Booking');
  const available = await api('GET', '/api/availability');
  const availableSlots = available.data?.slots || [];
  check('concrete tutor availability is returned',
    available.status === 200 && availableSlots.length >= 3,
    `got ${availableSlots.length} slots`);
  const slot = availableSlots[0];

  const past = await api('POST', '/api/sessions/create', {
    token: loginToken,
    body: {
      subject: 'Math',
      scheduled_at: futureISO(-3, 16),
      tutor_id: slot?.tutor_id,
    },
  });
  check('past-dated booking rejected', past.status === 400, `got ${past.status}`);

  const offGridTime = slot
    ? new Date(new Date(slot.scheduled_at).getTime() + 30 * 60 * 1000).toISOString()
    : null;
  const offGrid = await api('POST', '/api/sessions/create', {
    token: loginToken,
    body: { subject: 'Math', scheduled_at: offGridTime, tutor_id: slot?.tutor_id },
  });
  check('time not offered by availability is rejected', offGrid.status === 409,
    `got ${offGrid.status}`);

  const badSubject = await api('POST', '/api/sessions/create', {
    token: loginToken,
    body: { subject: 'Underwater Basket Weaving', scheduled_at: slot?.scheduled_at, tutor_id: slot?.tutor_id },
  });
  check('unsupported subject is rejected', badSubject.status === 400,
    `got ${badSubject.status}`);

  const book = await api('POST', '/api/sessions/create', {
    token: loginToken,
    body: {
      subject: 'Math',
      scheduled_at: slot?.scheduled_at,
      tutor_id: slot?.tutor_id,
      notes: 'Chapter 4 quadratics',
    },
  });
  check('booking returns 201', book.status === 201,
    `got ${book.status}: ${JSON.stringify(book.data)}`);

  const dbl = await api('POST', '/api/sessions/create', {
    token: loginToken,
    body: {
      subject: 'Science',
      scheduled_at: slot?.scheduled_at,
      tutor_id: slot?.tutor_id,
    },
  });
  check('double-booking same slot rejected', dbl.status === 409, `got ${dbl.status}`);

  const list = await api('GET', '/api/sessions', { token: loginToken });
  check('session appears in parent dashboard feed', list.status === 200 &&
    (list.data?.sessions || []).some((s) => s.subject === 'Math'),
    JSON.stringify(list.data?.sessions));

  const c3 = await pool.connect();
  try {
    const r = await c3.query(
      `SELECT notes FROM sessions WHERE subject = 'Math' AND notes IS NOT NULL
       ORDER BY id DESC LIMIT 1`
    );
    check('booking notes were saved', r.rows[0]?.notes === 'Chapter 4 quadratics',
      `stored: ${JSON.stringify(r.rows[0]?.notes)}`);
  } finally {
    c3.release();
  }

  // -- second family: data isolation ----------------------------------
  console.log('\n[5] Second parent + isolation');
  const s2 = await api('POST', '/api/signup', { body: parentB });
  check('second parent signs up', s2.status === 201, `got ${s2.status}`);
  const tokenB = s2.token;

  const stuB = await api('GET', '/api/student', { token: tokenB });
  check('parent B sees only their own student', stuB.data?.student?.first_name === 'Ben',
    JSON.stringify(stuB.data?.student?.first_name));

  const sessB = await api('GET', '/api/sessions', { token: tokenB });
  check('parent B sees none of parent A sessions',
    (sessB.data?.sessions || []).length === 0,
    `saw ${(sessB.data?.sessions || []).length}`);

  const aStudentId = stu.data?.student?.id;
  const crossBook = await api('POST', '/api/sessions/create', {
    token: tokenB,
    body: {
      subject: 'Math',
      scheduled_at: availableSlots[1]?.scheduled_at,
      tutor_id: availableSlots[1]?.tutor_id,
      student_id: aStudentId,
    },
  });
  check('parent B cannot book against parent A student', crossBook.status === 404,
    `got ${crossBook.status}`);

  // -- tutor ----------------------------------------------------------
  console.log('\n[6] Tutor access control');
  const tutorAsParent = await api('GET', '/api/tutor/sessions', { token: loginToken });
  check('parent blocked from tutor endpoint', tutorAsParent.status === 403,
    `got ${tutorAsParent.status}`);

  // --- token forgery: the whole point of signing ---
  const forged = Buffer.from(
    JSON.stringify({ userId: 1, email: 'x@x.com', role: 'tutor', iat: 1, exp: 9999999999 })
  ).toString('base64');
  const forgedRes = await api('GET', '/api/tutor/sessions', { token: forged });
  check('forged (unsigned) token is rejected', forgedRes.status === 401, `got ${forgedRes.status}`);

  check('issued token is a 3-part JWT', (loginToken || '').split('.').length === 3,
    `shape: ${(loginToken || '').slice(0, 20)}...`);

  if (!loginToken || loginToken.split('.').length !== 3) {
    console.log('  (skipping token tests -- no valid token was issued earlier)');
    failed++;
    failures.push('no usable token for the signature tests');
  }
  const [jh, jb, jsig] = (loginToken && loginToken.split('.').length === 3)
    ? loginToken.split('.')
    : [null, null, null];

  // A REAL token with role flipped to tutor, original signature kept.
  if (jb) {
  const escalated = JSON.parse(Buffer.from(jb, 'base64url').toString('utf8'));
  escalated.role = 'tutor';
  const tampered = [jh, Buffer.from(JSON.stringify(escalated)).toString('base64url'), jsig].join('.');
  const tamperedRes = await api('GET', '/api/tutor/sessions', { token: tampered });
  check('privilege escalation via edited payload is rejected', tamperedRes.status === 401,
    `got ${tamperedRes.status} -- a parent promoted themselves to tutor`);

  const badSigRes = await api('GET', '/api/student', { token: [jh, jb, 'garbage'].join('.') });
  check('bad signature is rejected', badSigRes.status === 401, `got ${badSigRes.status}`);

  const stale = JSON.parse(Buffer.from(jb, 'base64url').toString('utf8'));
  stale.exp = 1000;
  const expiredTok = [jh, Buffer.from(JSON.stringify(stale)).toString('base64url'), jsig].join('.');
  const expiredRes = await api('GET', '/api/student', { token: expiredTok });
  check('expired token is rejected', expiredRes.status === 401, `got ${expiredRes.status}`);

  }

  const junkRes = await api('GET', '/api/student', { token: 'complete.garbage' });
  check('malformed token is rejected', junkRes.status === 401, `got ${junkRes.status}`);

  const c4 = await pool.connect();
  let tutorEmail = null;
  try {
    const r = await c4.query(
      `SELECT u.email FROM users u JOIN tutors t ON t.user_id = u.id ORDER BY t.id LIMIT 1`
    );
    tutorEmail = r.rows[0]?.email || null;
  } finally {
    c4.release();
  }

  if (tutorEmail) {
    console.log(`  (tutor account on file: ${tutorEmail} -- log in manually to verify the dashboard)`);
  }

  // -- multi-student -------------------------------------------------
  console.log('\n[7] Multiple students per parent');

  const add = await api('POST', '/api/students', {
    token: loginToken,
    body: { first_name: 'Cara', last_name: 'GammaTest', grade_level: '7', subjects: 'History' },
  });
  check('parent can add a second child', add.status === 201,
    `got ${add.status}: ${JSON.stringify(add.data)}`);
  const caraId = add.data?.student?.id;

  const addDupe = await api('POST', '/api/students', {
    token: loginToken,
    body: { first_name: 'Cara', last_name: 'GammaTest', grade_level: '7' },
  });
  check('duplicate child rejected', addDupe.status === 409, `got ${addDupe.status}`);

  const badGrade = await api('POST', '/api/students', {
    token: loginToken,
    body: { first_name: 'Zed', last_name: 'BadGrade', grade_level: '99' },
  });
  check('invalid grade rejected', badGrade.status === 400, `got ${badGrade.status}`);

  const both = await api('GET', '/api/students', { token: loginToken });
  check('API returns BOTH children', (both.data?.students || []).length === 2,
    `returned ${(both.data?.students || []).length}`);

  const legacy = await api('GET', '/api/student', { token: loginToken });
  check('back-compat: /api/student still returns a single `student`',
    !!legacy.data?.student?.first_name);
  check('back-compat: /api/student also returns the full list',
    (legacy.data?.students || []).length === 2);

  const caraOnly = await api('GET', `/api/student?id=${caraId}`, { token: loginToken });
  check('can fetch a specific child by id', caraOnly.data?.student?.first_name === 'Cara',
    JSON.stringify(caraOnly.data?.student?.first_name));

  const bookCara = await api('POST', '/api/sessions/create', {
    token: loginToken,
    body: {
      subject: 'History',
      scheduled_at: availableSlots[1]?.scheduled_at,
      tutor_id: availableSlots[1]?.tutor_id,
      student_id: caraId,
    },
  });
  check('can book for the second child', bookCara.status === 201, `got ${bookCara.status}`);

  const allSess = await api('GET', '/api/sessions', { token: loginToken });
  const names = new Set((allSess.data?.sessions || []).map((s) => s.student_name));
  check('parent feed shows sessions for both children', names.size === 2,
    `saw: ${[...names].join(', ')}`);

  const filtered = await api('GET', `/api/sessions?student_id=${caraId}`, { token: loginToken });
  check('can filter sessions to one child',
    (filtered.data?.sessions || []).every((s) => s.student_name.startsWith('Cara')));

  const otherKid = await api('GET', `/api/student?id=${caraId}`, { token: tokenB });
  check("parent B cannot read parent A's second child", otherKid.status === 404,
    `got ${otherKid.status}`);

  // -- parent profile --------------------------------------------------
  console.log('\n[8] Parent profile');

  const prof = await api('GET', '/api/parent', { token: loginToken });
  check('parent can read own profile', prof.status === 200 &&
    prof.data?.profile?.email === parentA.email,
    JSON.stringify(prof.data?.profile?.email));
  check('profile never exposes the password hash',
    !JSON.stringify(prof.data || {}).includes('password_hash'));

  const rename = await api('PATCH', '/api/parent', {
    token: loginToken, body: { name: 'Renamed Parent' },
  });
  check('parent can change own name', rename.status === 200 &&
    rename.data?.profile?.name === 'Renamed Parent', `got ${rename.status}`);

  const emailClash = await api('PATCH', '/api/parent', {
    token: loginToken, body: { email: parentB.email },
  });
  check("cannot take another account's email", emailClash.status === 409,
    `got ${emailClash.status}`);

  const badEmail = await api('PATCH', '/api/parent', {
    token: loginToken, body: { email: 'not-an-email' },
  });
  check('malformed email rejected', badEmail.status === 400, `got ${badEmail.status}`);

  const wrongCurrent = await api('POST', '/api/parent/password', {
    token: loginToken,
    body: { current_password: 'not-it', new_password: 'BrandNewPass1!' },
  });
  check('password change requires the correct current password',
    wrongCurrent.status === 401, `got ${wrongCurrent.status}`);

  const tooShort = await api('POST', '/api/parent/password', {
    token: loginToken,
    body: { current_password: parentA.password, new_password: 'abc' },
  });
  check('short new password rejected', tooShort.status === 400, `got ${tooShort.status}`);

  const changed = await api('POST', '/api/parent/password', {
    token: loginToken,
    body: { current_password: parentA.password, new_password: 'BrandNewPass1!' },
  });
  check('password change succeeds', changed.status === 200, `got ${changed.status}`);

  const oldPw = await api('POST', '/api/login', {
    body: { email: parentA.email, password: parentA.password },
  });
  check('old password no longer works', oldPw.status === 401, `got ${oldPw.status}`);

  const newPw = await api('POST', '/api/login', {
    body: { email: parentA.email, password: 'BrandNewPass1!' },
  });
  check('new password works', newPw.status === 200, `got ${newPw.status}`);
  const tokenAfterChange = newPw.token;

  const revoked = await api('GET', '/api/student', { token: loginToken });
  check('password change revokes the previous session', revoked.status === 401,
    `got ${revoked.status}`);

  // -- student logins --------------------------------------------------
  console.log('\n[9] Student logins');

  const studentEmail = `ada-${stamp}@e2e.invalid`;
  const aStudent = stu.data?.student?.id;

  const mkLogin = await api('POST', `/api/students/${aStudent}/login`, {
    token: tokenAfterChange,
    body: { email: studentEmail, password: 'StudentPass1!' },
  });
  check('parent can create a login for their child', mkLogin.status === 201,
    `got ${mkLogin.status}: ${JSON.stringify(mkLogin.data)}`);

  const foreignLogin = await api('POST', `/api/students/${aStudent}/login`, {
    token: tokenB,
    body: { email: `hijack-${stamp}@e2e.invalid`, password: 'StudentPass1!' },
  });
  check("parent B cannot create a login for parent A's child",
    foreignLogin.status === 404, `got ${foreignLogin.status}`);

  const stuLogin = await api('POST', '/api/login', {
    body: { email: studentEmail, password: 'StudentPass1!' },
  });
  check('student can sign in', stuLogin.status === 200, `got ${stuLogin.status}`);
  check('student token carries role=student', stuLogin.data?.role === 'student',
    `role: ${stuLogin.data?.role}`);
  const studentToken = stuLogin.token;

  const stuSelf = await api('GET', '/api/student', { token: studentToken });
  check('student sees their own record', stuSelf.data?.student?.first_name === 'Ada',
    JSON.stringify(stuSelf.data?.student?.first_name));
  check('student sees ONLY themselves, not siblings',
    (stuSelf.data?.students || []).length === 1,
    `saw ${(stuSelf.data?.students || []).length}`);

  const stuSessions = await api('GET', '/api/sessions', { token: studentToken });
  check('student sees only their own sessions',
    (stuSessions.data?.sessions || []).every((s) => s.student_name.startsWith('Ada')),
    JSON.stringify((stuSessions.data?.sessions || []).map((s) => s.student_name)));

  const stuEdit = await api('PATCH', '/api/student/update', {
    token: studentToken, body: { academic_notes: 'i am definitely an A student' },
  });
  check('student cannot rewrite their own academic notes', stuEdit.status === 403,
    `got ${stuEdit.status}`);

  const stuAdd = await api('POST', '/api/students', {
    token: studentToken, body: { first_name: 'Fake', last_name: 'Sibling' },
  });
  check('student cannot add students', stuAdd.status === 403, `got ${stuAdd.status}`);

  const stuTutor = await api('GET', '/api/tutor/sessions', { token: studentToken });
  check('student blocked from tutor endpoint', stuTutor.status === 403,
    `got ${stuTutor.status}`);

  const stuBook = await api('POST', '/api/sessions/create', {
    token: studentToken,
    body: {
      subject: 'Math',
      scheduled_at: availableSlots[2]?.scheduled_at,
      tutor_id: availableSlots[2]?.tutor_id,
    },
  });
  check('student can book their own session', stuBook.status === 201,
    `got ${stuBook.status}`);

  const signedOut = await api('POST', '/api/logout', { token: studentToken });
  check('logout succeeds', signedOut.status === 200, `got ${signedOut.status}`);
  const afterLogout = await api('GET', '/api/student', { token: studentToken });
  check('logout revokes the previous session', afterLogout.status === 401,
    `got ${afterLogout.status}`);

  await cleanup();

  console.log('\n' + '='.repeat(60));
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  }
  console.log('');
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(async (e) => {
  console.error('\nTest run crashed:', e);
  await pool.end();
  process.exit(1);
});
