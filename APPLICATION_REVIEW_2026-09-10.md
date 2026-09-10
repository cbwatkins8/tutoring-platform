# Take Two Tutoring — Full Application Review

Reviewed: September 10, 2026
Reviewer: Claude (Cowork session), reading `/Users/charleswatkins/tutoring-platform` on this Mac
Scope: all project documentation, every route, library, migration, script and page in the working tree

---

## 1. Executive summary

The application is in materially better shape than the historical documents in
this repository suggest, and the current handoff (`THREAD_HANDOFF_CURRENT.md`)
is an accurate description of intent. The authentication, authorization,
scheduling and database layers are genuinely well built — this is not a
prototype pretending to be a product, and the September repair work described in
`REVIEW_FINDINGS.md` is real and visible in the code.

Two problems stand between the current state and a defensible launch:

1. **None of the recent work is committed.** Twenty-three tracked files are
   modified and fifteen paths are untracked. Everything since commit `e93ffd7` —
   the admin interface, feature flags, tutor-managed availability, brand assets,
   migrations 006 and 007 — exists only on this one machine, with no remote copy.
2. **A consultation request has nowhere to go.** The public MVP's single purpose
   is to collect inquiries, and there is no way to see one without shell access
   to the database. `/admin` contains two feature toggles and no inquiry list,
   despite both `README.md` and the handoff stating that inquiries are reviewed
   there. There is also no email notification. A request submitted tonight is
   invisible until someone runs a script tomorrow.

Everything else in this review is smaller than those two items.

---

## 2. What I verified, and what I could not

| Check | Result |
|---|---|
| `tsc --noEmit` (strict) | **Clean** |
| `eslint` | **Clean** — no errors, no warnings |
| `next build` | **Could not run here.** The build failed loading the SWC native binary for `linux/arm64`. `node_modules` was installed on macOS, and my shell on this machine is a Linux VM; this is an environment mismatch, **not a code defect**. Run `npm run build` in Terminal on the Mac to confirm. |
| `npm run db:check` | **Could not run here.** No Docker/PostgreSQL in the shell available to me. |
| `npm run test:e2e` | **Could not run here.** Same reason — requires a running dev server and live database. |

So: types and lint are confirmed clean by me today. Build, schema and end-to-end
results are **inherited from the handoff, not re-verified**. Re-run all three on
the Mac before treating them as current.

Static inventory: 34 files under `app/`, 5 components, 11 library modules, 7
migrations, 9 scripts — roughly 7,200 lines of TypeScript, TSX, SQL and Node
scripts.

---

## 3. Repository state — highest risk

```
HEAD  e93ffd7  Allow React development diagnostics in CSP
```

Uncommitted and unpushed:

- **Modified (23):** every public page, `layout.tsx`, `SiteNav`, `SiteFooter`,
  `robots.ts`, `sitemap.ts`, `lib/schema.sql`, four API routes, `check-schema.mjs`,
  `e2e-test.mjs`, `README.md`
- **Untracked (15):** `app/admin/`, `app/api/admin/`, `app/api/sessions/[id]/`,
  `app/api/site-features/`, `app/api/tutor/availability/`, `components/BrandLogo.tsx`,
  `components/TutorAvailabilityManager.tsx`, `lib/scheduling.ts`,
  `lib/site-features.ts`, migrations `006`/`007`, `public/brand/`,
  `scripts/reset-staff-password.mjs`, plus the documentation files

A disk failure, an accidental `git checkout .`, or a bad merge loses all of it.
Nothing else in this review matters if the work disappears.

The handoff correctly warns not to stage the historical Markdown files with the
application commit. That is still the right call — but it is an argument for two
commits, not for zero.

---

## 4. Security and authorization — assessment: strong

What is done correctly, and verified in code:

- **Real signed sessions.** `lib/session.ts` issues HS256 JWTs, verifies the
  signature with `crypto.timingSafeEqual`, refuses to sign when `JWT_SECRET` is
  absent or under 32 characters, and validates payload shape and expiry. The
  base64-blob vulnerability described in `REVIEW_FINDINGS.md` is fully closed.
- **Cookies, not localStorage.** `HttpOnly`, `SameSite=Lax`, `Secure` in
  production, 12-hour TTL. The browser keeps only a non-authoritative display
  copy of the user's identity.
- **Server-side revocation.** `verifiedSessionFromRequest` re-reads the account
  from PostgreSQL on every protected request and compares email, role and
  `session_version`. A logout, password change or email change invalidates
  outstanding tokens immediately. This is better than most small applications do.
- **Centralized ownership.** `lib/access.ts` is the single answer to "who may see
  which student," and it deliberately returns 404 for both unknown and
  someone-else's IDs, so record IDs cannot be enumerated.
- **Parameterized queries everywhere.** I found no string-concatenated SQL.
- **Multi-write operations are transactional.** Signup, add-student, student
  login provisioning and availability saves all use `BEGIN`/`COMMIT` with
  rollback on error.
- **Rate limiting** in PostgreSQL on login, signup, contact, booking and student
  login provisioning.
- **Database-enforced scheduling integrity.** `btree_gist` exclusion constraints
  prevent overlapping scheduled sessions for both tutor and student — correctness
  that survives a bug in the application layer.
- **Security headers.** CSP, `X-Frame-Options: DENY`, `nosniff`, referrer policy,
  permissions policy, HSTS in production, `poweredByHeader: false`. The
  development-only `unsafe-eval` carve-out is scoped correctly.

### Findings

**S1 — Bearer-token fallback is active in production.** *(medium)*
`getSessionFromRequest` falls back to an `Authorization: Bearer` header when no
cookie is present. The comment says it exists for the local test suite, but the
code is not environment-gated. It re-opens the exact attack class the cookie
migration was meant to close: any token that leaks into JavaScript can be
replayed, and `SameSite` protections do not apply to a header. Gate it on
`process.env.NODE_ENV !== 'production'` (the e2e suite runs against dev).

**S2 — `request_rate_limits` grows without bound.** *(low)*
Rows are written per (action, IP-hash) pair and never deleted. The window index
exists but nothing prunes. On a small Vercel/Neon instance this is slow-motion
bloat rather than an outage, but add a periodic `DELETE FROM request_rate_limits
WHERE window_start < NOW() - INTERVAL '1 day'`.

**S3 — `/admin` is protected only on the client.** *(low)*
`app/admin/page.tsx` redirects non-staff after a `refreshCurrentUser()` call in
`useEffect`. The underlying APIs (`/api/admin/site-features`) are properly
role-checked server-side, so no data leaks — but the page shell renders briefly
for anyone who visits the URL. There is no `middleware.ts` in the project at all.
Adding one would move `/admin`, `/dashboard`, `/booking`, `/profile` and
`/tutor-dashboard` behind a server-side gate uniformly.

**S4 — The e2e suite has no production guard.** *(medium, operational)*
`scripts/e2e-test.mjs` flips `client_portal` and `online_booking` to **TRUE** for
the duration of the run and restores them afterwards (including on crash — that
part is handled well). But nothing stops it from being pointed at a production
`DATABASE_URL`. If it is, production briefly exposes the family portal, and a
`Ctrl-C` mid-run leaves it exposed permanently. Refuse to run unless
`DATABASE_URL` points at localhost, or require an explicit opt-in variable.

**S5 — Cosmetic:** the session cookie is still named `civil_session` and the
connection pool global is `civilTutoringPool`, from the pre-rename branding.

---

## 5. The consultation pipeline — the real launch blocker

The entire public product is: a visitor reads three pages and submits one form.
That path works. `POST /api/contact` validates, honeypots, rate-limits, truncates
field lengths and stores the row. The form itself is clean and well-labelled.

What happens next is the problem.

**P1 — There is no inquiry inbox.** `/admin` renders two checkboxes. There is no
`/api/admin/inquiries` route, no inquiry list component, and no reference to the
`inquiries` table anywhere in `app/` except the insert in `/api/contact`. Both
`README.md` and `THREAD_HANDOFF_CURRENT.md` state that the administrator reviews
inquiries at `/admin`. **That is not true of the current code.** The only reader
is `scripts/list-inquiries.mjs`, which requires a terminal and direct database
access — impossible from a phone, and impossible against Vercel + hosted
PostgreSQL without extra setup.

**P2 — There is no notification.** The handoff acknowledges this. Combined with
P1, a family who submits a request at 9pm gets "I read every one of these myself
and will get back to you shortly" while, in fact, nobody is notified of anything.
That promise is on the confirmation screen today.

**P3 — The `status` column is never used.** `inquiries.status` has a four-value
CHECK constraint (`new`/`contacted`/`scheduled`/`closed`) and no code path ever
updates it.

For a concierge MVP whose only conversion event is this form, an inquiry list at
`/admin` plus an email notification is not a nice-to-have; it is the product.

---

## 6. Feature-flag gating — leaks on the public site

The flag mechanism itself is sound: stored in PostgreSQL, defaulting to `false`,
enforced server-side in `/api/login`, `/api/signup`, `/api/sessions/create`,
`/api/sessions/[id]` and `/api/availability`. `SiteNav` correctly hides Login and
Sign Up while `client_portal` is off. No family can actually get into the portal.

But four public surfaces still advertise it:

| Location | Problem |
|---|---|
| `components/SiteFooter.tsx` | "Families" column links **Login** and **Create an account** unconditionally. The footer is on every public page. |
| `app/how-it-works/page.tsx` (closing CTA) | A prominent white **"Create an account"** button next to the consultation CTA. `/signup` responds 403. |
| `app/how-it-works/page.tsx` (step 4) | "families can create an account, add their student and choose from the available online session times" — describes a product families cannot use. |
| `app/contact/page.tsx` (below form) | "Already have an account? **Sign in**" |

Also, `app/signup/page.tsx` does not check the flag on load. It renders the full
two-step form and only fails at submit, after the visitor has typed a password.

Net effect: a visitor who follows the footer or the how-it-works CTA hits a dead
end on a site whose whole premise is a careful, personal first impression. All
four are copy-and-conditional changes, not architecture.

`robots.ts` and `sitemap.ts` are correct — the four public pages are listed and
the gated routes are disallowed.

---

## 7. Scheduling and booking — retained, dormant, mostly sound

Availability generation (`/api/availability`) and validation (`lib/scheduling.ts`)
both work from recurring weekly windows in the tutor's IANA time zone, honour
date exceptions in both directions, respect the configured 15/30/60-minute
interval, and exclude times that collide with existing scheduled sessions. The
tutor-facing PUT validates time format, ordering, day range and time zone before
writing, inside a transaction. This is careful work.

**Findings:**

**B1 — Session length is hardcoded to one hour in the logic, but is a column in
the schema.** `sessions.duration_minutes` defaults to 60 and permits up to 240.
Neither `/api/sessions/create` nor the availability queries ever set or read it —
both hardcode `INTERVAL '1 hour'`. Today everything is 60 minutes so nothing is
wrong. The moment a 90-minute session exists, availability generation and the
overlap constraint will disagree with each other. Either drive the interval from
`duration_minutes` or drop the column's flexibility.

**B2 — Booking-window inconsistency.** `/api/availability` generates 28 days
ahead; `isAvailableStart` accepts up to 29 days. Harmless today, but the two
should share one constant.

**B3 — Dead schema.** `payments`, `session_reports`, and the `zoom_meeting_id` /
`zoom_join_url` columns exist and are referenced by nothing. That is fine as
forward planning, but `README.md` should keep saying plainly that payments,
video links and tutor reports are not implemented — it currently does, correctly.

---

## 8. Testing and CI

`scripts/e2e-test.mjs` is 710 lines and 81 assertions covering signup, duplicate
handling, login, token forgery (six separate attacks), ownership isolation,
role escalation, multi-student access, student-role restrictions, booking,
overlap rejection and logout revocation. For a solo project this is a genuinely
good suite, and it is the reason the September repairs can be trusted.

**Gaps:**

- **No CI.** There is no `.github/` directory. Nothing runs on push.
- **No `typecheck` script** in `package.json`, despite `tsc --noEmit` being the
  fastest useful check available.
- **The launch configuration is the one configuration never tested.** The suite
  turns both flags ON before it runs. Nothing asserts that with flags OFF,
  `/signup` returns 403, parent login returns 403, `/api/availability` returns an
  empty slot list, and the public pages still render. That is exactly the state
  production will ship in.
- The suite requires a manually started dev server and a live database, so it
  will not run unattended without work.

---

## 9. Legal, privacy and content

The handoff describes four counsel-review Word drafts stored outside the repo and
lists what the website must implement. **None of it is implemented yet.**
Specifically, still missing:

- A counsel-reviewed privacy notice (the current `/privacy` page is four short
  paragraphs, dated September 6, and reads as a placeholder)
- A website terms page (no route exists) and a footer link to it
- A required, unchecked adult/guardian acknowledgment on the consultation form
- A warning not to submit medical records, SSNs, financial information,
  passwords or full school records

The consultation form collects **a child's first name and grade level** today,
with no acknowledgment gate and no sensitive-data warning. That is the single
highest-consequence content gap, because it involves minors' data.

Also open:

- **No contact email anywhere on the site.** The fabricated
  `help@civiltutoring.com` was correctly removed from the footer, but nothing
  replaced it. There is no way to reach the business except the form.
- **The tutor is never named.** The site says "a Tennessee Level 5 educator with
  a Master's in Education." For a referral-based practice where the entire pitch
  is working with the same person every week, an anonymous educator undercuts the
  proposition — and a referred family arrives already knowing the name.
- **The brand premise is absent.** "Every student deserves another way in" is in
  the handoff as the core premise and appears on no page.
- No business address, entity name, rate, or cancellation policy — all correctly
  listed in the handoff as pending business decisions rather than invented. That
  restraint is the right call and should hold.

---

## 10. Documentation

`THREAD_HANDOFF_CURRENT.md` is a strong continuity document — specific, honest
about what is unverified, and explicit about not deploying without being asked.
The five historical documents carry clear warning banners. This is good practice.

Two corrections needed:

- `README.md` and the handoff both say inquiries are reviewed at `/admin`.
  They are not (§5).
- The handoff cites "80 passed"; the suite contains 81 `check()` calls. Minor,
  but re-run rather than quote.

One gap: `CLAUDE.md` contains only `@AGENTS.md`, and `AGENTS.md` is Next.js
boilerplate. Any Claude Code session starting here gets no project context and
must be told to read the handoff manually. Pointing `CLAUDE.md` at
`THREAD_HANDOFF_CURRENT.md` would fix that in one line.

---

## 11. Recommended order of work

**Do first — today**

1. Commit the working tree in two commits (application + brand assets; then
   documentation) and push to GitHub. Nothing else should happen before this.

**Before accepting a single real inquiry**

2. Build the inquiry list at `/admin` — a `GET /api/admin/inquiries` route behind
   the existing staff check, and a table on the admin page. Add `status` updates
   while you are in there.
3. Decide on email notification. Even a single transactional-email provider on
   the contact route would remove the dependency on remembering to check.
4. Close the four gating leaks in §6 and gate the `/signup` page on load.
5. Add the guardian acknowledgment checkbox and the sensitive-data warning to the
   consultation form. This is the one item involving minors' data.

**Before public launch**

6. Publish the counsel-reviewed privacy notice and a terms page; link both in the
   footer.
7. Name the tutor on the About section and publish a real contact email.
8. Gate the bearer-token fallback to non-production (§S1) and add the e2e
   production guard (§S4).
9. Provision hosted PostgreSQL, run migrations 001–007, initialize the staff
   account, confirm both flags are `false`, deploy, then verify `/`, `/contact`,
   `/login`, `/admin` and a real submission against the production database.

**Soon after**

10. Add CI (typecheck + lint on push at minimum) and a `typecheck` script.
11. Add flags-OFF assertions to the e2e suite.
12. Prune `request_rate_limits`; reconcile `duration_minutes` with the hardcoded
    hour; consider `middleware.ts` for uniform route protection.

---

## 12. Bottom line

The engineering is sound and the security work is above the standard typical for
a project this size — signed revocable sessions, centralized authorization,
database-level scheduling integrity and a real adversarial test suite are all
present and correct. The discipline of refusing to invent rates, credentials,
testimonials or outcome statistics is the right instinct and should be preserved.

The gap is not in the code's quality; it is that the one workflow the public MVP
exists to serve — receive a consultation request, see it, respond to it — is the
one workflow that is not finished. Commit the work, build the inbox, close the
portal leaks, and add the guardian acknowledgment. That is a launchable product.
