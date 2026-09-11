# Code Review — 2026-09-07

> **Historical audit trail:** the findings below describe earlier states of the
> project. The issues were subsequently repaired. `THREAD_HANDOFF_CURRENT.md`
> and `README.md` are the current sources of truth; the latest full verification
> reported before the September 10 handoff passed 80 assertions with 0 failures.

Full audit of every API route against `lib/schema.sql`. **The app did not work
end-to-end before this review.** Signup failed on its third query, which meant
nothing downstream could work either.

Earlier docs in this repo (`MVP_STATUS.md`, `BUILD_SUMMARY.md`) claimed the MVP
was complete and tested. That was not accurate — nothing had been executed
against the database. This file is retained to show the repair history.

---

## Fixed

### 1. `student_guardians.guardian_id` did not exist — CRITICAL
The column is `user_id`. Five places queried `guardian_id`:
`signup`, `student`, `student/update`, `sessions`, `sessions/create`.

Every one threw `column "guardian_id" does not exist`. Because signup ran three
*unwrapped* inserts, the user and student rows committed before the failing
third insert — so a failed signup left an orphaned account and permanently
burned that email address.

### 2. `student_guardians` has no `created_at` — CRITICAL
The signup insert wrote to it. Second guaranteed failure in the same statement.

### 3. `tutor_availability` table never existed — CRITICAL
`/api/availability` selected from it and `setup-tutor` inserted into it, but
`schema.sql` never created it. Added in `lib/migrations/001_fix_mvp_gaps.sql`.

### 4. `sessions.tutor_id` pointed at the wrong table — CRITICAL
It references `tutors(id)`, but the booking code ran `SELECT user_id FROM tutors`
and inserted that. A `users.id` into a `tutors.id` column: foreign-key violation,
or silently the wrong tutor. The tutor dashboard had the mirror-image bug —
it filtered `WHERE tutor_id = <users.id>` — so even a successful booking would
never have appeared there. Both now join through `tutors`.

### 5. Selected subjects were silently discarded
Signup collected subjects, the API accepted them, and no column existed. Thrown
away on every signup. Added `students.subjects`.

### 6. Booking notes were silently discarded
Same shape of bug. Added `sessions.notes`.

### 7. `scripts/setup-tutor.ts` could not run
Needed `ts-node` (never in `package.json`), never loaded `.env.local` so
`DATABASE_URL` was undefined, and wrote a `users.id` into
`tutor_availability.tutor_id`. If it failed partway it left a half-built tutor
and refused to retry. Replaced with `scripts/setup-tutor.mjs` — plain node,
loads `.env.local`, transactional, idempotent, no hardcoded password.

### 8. Tutor endpoint had no server-side role check
`/api/tutor/sessions` checked the role only in the browser. Any signed-in
parent could fetch every student's full schedule by calling it directly.
Now returns 403.

### 9. Other correctness fixes
- Email normalized to lowercase on signup *and* login (otherwise
  `John@x.com` could register but never log in).
- Duplicate signup returns 409, not 400.
- Bookings in the past are rejected.
- Double-booking one tutor slot returns 409.
- A parent passing another family's `student_id` is rejected.
- Password length enforced server-side, not just in the browser.

---

## Open — needs a decision

### A. One student per parent
Signup creates exactly one student and every query is `LIMIT 1`. There is no
way to add a second child. The database handles it fine (`student_guardians`
is a join table); the API and UI do not. **A parent with two kids cannot use
this product.**

### B. No parent profile
`/profile` shows the *student's* school and notes. There is nowhere to view or
change the parent's own name, email, or password.

### C. Students have no accounts
Only parents log in. A student cannot see their own schedule. Worth deciding
whether that is intentional for now.

### D. Dashboard greets the parent by the child's name
A parent named John logging in sees "Welcome back, Ada!" — flagged rather than
changed, since it is a UX call.

### E. SECURITY — tokens are unsigned
`lib/auth.ts` base64-encodes a JSON blob. Base64 is encoding, not signing.
Anyone can paste this in a console:

```js
localStorage.setItem('authToken',
  btoa(JSON.stringify({userId:1, email:'x', role:'tutor', iat:0})))
```

...and get full tutor access to every student's records. The `e2e-test.mjs`
suite has a test for this and it is **expected to fail** until real signed
sessions are in place. This must be fixed before any real student data exists.

### F. Booking ignores tutor availability
`/api/availability` is fetched by the booking page and never used. Any date and
time is accepted, including 3am Sunday.

### G. No pre-deploy checks
No tests, no CI, and `npm run build` has never been run successfully here.

---

## How to verify

```bash
# 1. apply the migration (non-destructive)
psql "postgresql://postgres:postgres@localhost:5432/tutoring_dev" \
  -f lib/migrations/001_fix_mvp_gaps.sql

# 2. create the tutor
node scripts/setup-tutor.mjs
# or with your own credentials:
# node scripts/setup-tutor.mjs you@yourdomain.com 'your-password' 'Your Name'

# 3. run the app
npm run dev

# 4. in a second terminal, run the suite
node scripts/e2e-test.mjs
```

The suite creates accounts under `@e2e.invalid` and deletes them afterward.
Two failures are expected and intentional — they mark gaps E and A above.

---

# Round 2 — 2026-09-07 (backend only, no `.tsx` touched)

## Closed

### E. Unsigned tokens — FIXED
`lib/session.ts` issues real HS256 JWTs signed with `JWT_SECRET` (generated into
`.env.local`, which is gitignored). Signature is compared in constant time;
tokens now expire after 30 days. Every API route verifies through
`getSessionFromRequest` — `parseToken` is gone from the server entirely.

`lib/auth.ts` keeps the exact same exports, so **no page needed editing**. The
browser can still read the payload to decide what to render, but it cannot mint
or edit one the server will accept.

Six new tests cover this: forged token, payload tampered to `role: tutor` with
the original signature, bad signature, expired, malformed, and JWT shape.

### A/B/C. Multi-student, parent profile, student logins — backend done
- `POST /api/students` adds another child; `GET /api/students` lists them.
- `GET /api/student` now returns `students` (all) *and* `student` (first) so
  existing pages keep working untouched.
- `?id=` / `student_id` select a specific child everywhere, always resolved
  against what the caller owns — an unknown id and someone else's id both
  return 404, so ids cannot be enumerated.
- `GET/PATCH /api/parent` and `POST /api/parent/password` (requires current
  password).
- `POST /api/students/[id]/login` lets a parent give a child a sign-in.
  Students get `role: 'student'`: they see only themselves, cannot see siblings,
  cannot edit academic notes, cannot add students, cannot reach tutor routes.
- `lib/access.ts` centralises "who may see which student" so a future endpoint
  cannot forget the check.

### New: `@types/pg` was missing — would have broken deployment
`npm run build` typechecks in strict mode and `pg` had no type declarations,
so the build would have failed on Vercel. Added to `devDependencies`;
**run `npm install`**. `tsc --noEmit` is otherwise clean.

## Still open

- **D. Dashboard greets the parent by the child's name** — UI call, not changed.
- **F. Booking ignores tutor availability** — any time is still accepted, and
  `/api/availability` is fetched by the booking page but never rendered.
- **G. No CI.** `scripts/e2e-test.mjs` exists (74 assertions) but nothing runs
  it automatically.
- **Not yet in the UI.** All of the above is API-only. No page shows a second
  child, a parent profile, or a student-login form yet — that work is pending
  design approval.
- **httpOnly cookies.** Tokens are signed but still live in `localStorage`, so
  an XSS bug could steal one. Moving to httpOnly cookies is the next hardening
  step and does require touching the pages.

## Verify

```bash
npm install                                  # picks up @types/pg
psql "$DATABASE_URL" -f lib/migrations/001_fix_mvp_gaps.sql
psql "$DATABASE_URL" -f lib/migrations/002_students_and_accounts.sql
node scripts/setup-tutor.mjs
npm run dev                                  # terminal 1
node scripts/e2e-test.mjs                    # terminal 2
```

---

# Round 3 — UI (approved designs)

- **Dashboard**: child switcher tabs (hidden when there is only one child, so a
  single-child family sees no change), `+ Add student` chip, greeting now uses
  the **account holder's** own name from `users.name` — gap D closed. Tabs
  scroll sideways rather than wrapping at 375px.
- **Profile**: `Students` / `My Account` tabs. Students tab edits each child
  inline, and gives or resets a child's sign-in. My Account tab edits name and
  email and changes the password. Students signing in see a read-only view of
  just themselves with no tabs.
- **Booking**: student picker appears only when there is more than one child;
  `?student_id=` from the dashboard preselects. Date input has `min=today`.
  Removed the dead `/api/availability` fetch that was firing and going unused.

Colors, spacing, card and input classes are unchanged throughout —
Navy `slate-900`, Teal `teal-500`, Orange `orange-500`, Green `green-500`.

`tsc --noEmit` is clean.
