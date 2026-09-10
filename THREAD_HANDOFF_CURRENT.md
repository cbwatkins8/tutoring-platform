# Take Two Tutoring Current Project Handoff

Last updated: September 10, 2026

This is the primary continuity document for a new Codex or ChatGPT conversation. Read this file, `README.md`, `AGENTS.md`, and the current Git status before changing code. Treat `BUILD_SUMMARY.md`, `MVP_STATUS.md`, `QUICK_START.md`, `REVIEW_FINDINGS.md`, `TESTING_GUIDE.md`, and `CONTENT_TODO.md` as historical records unless this document expressly refers to them.

## Project location and repository

- Local project: `/Users/charleswatkins/tutoring-platform`
- GitHub remote: `https://github.com/cbwatkins8/tutoring-platform.git`
- Current branch: `main`
- Current committed HEAD when this handoff was written: `e93ffd7 Allow React development diagnostics in CSP`
- Local development URL: `http://localhost:3001`
- Framework: Next.js 16.3.4 with React 19.2.8 and the App Router
- Database: PostgreSQL through `pg`; local PostgreSQL runs in Docker

Always inspect `git status --short` before editing. The working tree contains substantial intended application work that has not yet been committed. Do not discard or overwrite it. Several older documentation files are also untracked and should remain excluded from the application commit unless the user explicitly chooses to version them.

## Current product decision

The public launch is intentionally a minimal, referral-based concierge MVP for Take Two Tutoring.

The public site currently needs to:

- Explain the tutoring approach and Civil's qualifications.
- Focus initially on middle school mathematics.
- Explain that Tennessee academic standards provide a foundation while instruction is adapted to the student's course, needs, and goals.
- Preserve flexibility to offer ELA and other subjects later.
- Make requesting a private consultation the principal call to action.

The following completed systems remain in the codebase but are hidden from families until the administrator enables them:

- Family and student signup
- Family and student portal access
- Online availability and booking
- Multiple children per parent
- Session display, cancellation, and rescheduling
- Student-specific logins

The feature flags are stored in PostgreSQL. Their intended public-launch values are:

```json
{
  "client_portal": false,
  "online_booking": false
}
```

The administrator can change these settings later at `/admin` without deleting or rebuilding the dormant functionality.

## Brand and public experience

- Brand name: **Take Two Tutoring**
- Core premise: **Every student deserves another way in.**
- Logo: the green tutor figure helps the black student figure upward.
- Current brand assets are in `public/brand/`.
- Shared logo rendering is in `components/BrandLogo.tsx`.
- The logo is intentionally optically offset within its circular container because the source image is not visually centered within its canvas.
- Public navigation and footer are in `components/SiteNav.tsx` and `components/SiteFooter.tsx`.

Do not redesign unrelated UI or change existing behavior when performing brand or content work unless the user explicitly asks.

## Current public routes

- `/` — Take Two Tutoring landing page
- `/how-it-works` — tutoring approach and consultation process
- `/contact` — private consultation request form
- `/privacy` — current short privacy page that should eventually be replaced by counsel-reviewed language
- `/login` — staff login remains directly accessible; family access is blocked while `client_portal` is off
- `/admin` — administrative feature controls and consultation inquiries

Routes for signup, booking, dashboard, profile, and tutor scheduling remain implemented but are gated by feature settings or authentication.

## Consultation-request data

The public form posts to `POST /api/contact` and stores an inquiry in PostgreSQL. It currently collects:

- Parent or guardian name
- Email address
- Optional telephone number
- Optional student name
- Optional grade
- Subject
- Free-text description of the student's situation and goals
- Optional referral source

The endpoint has validation, a honeypot field, and PostgreSQL-backed rate limiting. It stores the inquiry; it does not yet send an email notification. The administrator must inspect inquiries in `/admin` until notifications are implemented.

## Authentication and authorization

- Authentication uses signed HS256 session tokens in `HttpOnly`, `SameSite=Lax` cookies.
- Sessions expire after 12 hours.
- `JWT_SECRET` must be at least 32 characters.
- Session-version checks revoke prior sessions following sensitive account changes.
- Role and ownership checks are enforced on the server.
- Parent/student record ownership is centralized in `lib/access.ts`.
- Login attempts and other sensitive mutations use PostgreSQL-backed rate limits.
- The tutor/admin login is stored in the database. Do not place a password in Markdown, Git, or chat summaries.
- The previously reset staff password applied only to the local database. A production database requires its own staff-account initialization or reset.

## Scheduling implementation retained for later activation

- Weekly availability, date exceptions, interval selection, and IANA time zone are configurable by the tutor.
- Supported slot intervals are 15, 30, or 60 minutes.
- Availability is managed through `components/TutorAvailabilityManager.tsx` and `/api/tutor/availability`.
- Booking is restricted to real generated availability.
- PostgreSQL exclusion constraints prevent scheduled-session overlap for both tutors and students.
- Session responses include student names so families with multiple children can distinguish appointments.
- Authorized sessions can be cancelled or rescheduled through `/api/sessions/[id]` when online booking is enabled.

## Administrator interface

- Route: `/admin`
- Access: tutor and admin roles
- Purpose: review consultation inquiries and toggle public availability of the family portal and online booking
- Feature API: `/api/admin/site-features`
- Public feature-state API: `/api/site-features`
- Feature definitions: `lib/site-features.ts`
- Database migration: `lib/migrations/007_site_features.sql`

Do not expose the administrator route in the public navigation unless the user explicitly asks.

## Database and migrations

Apply every migration in order through the migration runner:

```bash
npm run db:migrate
npm run db:check
```

Current migrations:

1. `001_fix_mvp_gaps.sql`
2. `002_students_and_accounts.sql`
3. `003_email_case_normalization.sql`
4. `004_inquiries.sql`
5. `005_scheduling_and_rate_limits.sql`
6. `006_schedule_management.sql`
7. `007_site_features.sql`

Migrations 006 and 007 were applied successfully to the local database before this handoff. The schema check passed.

## Verification state

The last full verification reported before this handoff was:

- Production build: passed
- Database schema check: passed
- End-to-end suite: **80 passed, 0 failed**
- Public feature flags: `client_portal=false`, `online_booking=false`

Re-run verification after any code or configuration change rather than relying solely on these historical results:

```bash
npm run lint
npm run build
npm run db:check
npm run test:e2e
```

Run the application on port 3001:

```bash
npm run dev -- -p 3001
```

The earlier `eval() is not supported` development error was addressed in committed change `e93ffd7`, which allows React development diagnostics in the development CSP while retaining the stricter production policy. Recheck the browser console after changing security headers.

## Environment variables

Required locally and in production:

```dotenv
DATABASE_URL=postgresql://...
JWT_SECRET=at-least-32-random-characters
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

Recommended for a small Vercel deployment:

```dotenv
DATABASE_POOL_SIZE=2
```

Never commit real values. `.env*` and `.vercel` are ignored by Git.

## Vercel readiness and remaining deployment work

The Next.js code and automated tests are ready for deployment, but the current local Docker PostgreSQL database cannot be reached by Vercel. Before a successful production deployment:

1. Provision hosted PostgreSQL, such as Neon or Supabase, preferably using a pooled connection URL.
2. Set `DATABASE_URL`, a new production `JWT_SECRET`, the final HTTPS `NEXT_PUBLIC_SITE_URL`, and a small `DATABASE_POOL_SIZE` in Vercel.
3. Run migrations 001 through 007 against the production database.
4. Initialize or reset the staff account in the production database.
5. Confirm `client_portal=false` and `online_booking=false` in production.
6. Commit only intended application changes and brand assets.
7. Push to GitHub and import/connect the repository in Vercel.
8. Verify `/`, `/contact`, `/login`, `/admin`, the consultation submission, and the production database.

Do not push, create cloud resources, or deploy merely because these steps are documented. Obtain or rely on an explicit user request before performing those external actions.

## Legal and privacy review drafts

Four editable Word drafts were prepared for professional review and are stored outside this Git repository at:

`/Users/charleswatkins/Documents/ChatGPT/CivilTutor/legal-review-drafts/`

Files:

- `01_Take_Two_Privacy_Notice_Review_Draft.docx`
- `02_Take_Two_Website_Terms_Review_Draft.docx`
- `03_Take_Two_Consultation_Acknowledgment_Review_Draft.docx`
- `04_Take_Two_Tutoring_Services_Agreement_Review_Draft.docx`

They are templates, not legal advice. They contain conspicuous placeholders for the legal entity, business address, privacy email, website domain, service providers, retention period, county, rates, cancellation policy, safeguarding practices, and counsel-drafted risk provisions.

The immediate website implementation contemplated by the drafts is:

- Publish a counsel-reviewed privacy notice and website terms.
- Add separate footer links to both documents.
- Add a required, unchecked adult/guardian acknowledgment to the consultation form.
- Warn users not to submit medical records, Social Security numbers, financial information, passwords, or full school records.
- Keep student name, grade, phone, and referral source optional.
- Do not use the public website terms as the tutoring-services contract.

No legal-document language has yet been implemented in the application beyond the existing short privacy page and one-line consultation privacy reference.

## Current working tree and commit scope

At the time of this handoff, relevant modified or new application work included:

- Public and gated pages under `app/`
- Admin routes and APIs under `app/admin/` and `app/api/admin/`
- Session-management and site-feature APIs
- `components/BrandLogo.tsx`
- `components/TutorAvailabilityManager.tsx`
- `public/brand/`
- Migrations 006 and 007
- `lib/scheduling.ts`
- `lib/site-features.ts`
- Updated schema and automated tests
- `scripts/reset-staff-password.mjs`

Older untracked documentation and legacy files were intentionally not included in the pending application commit. Review rather than automatically stage:

- `BUILD_SUMMARY.md`
- `COMMIT_CHANGES.sh`
- `CONTENT_TODO.md`
- `Claude outputs/`
- `MVP_STATUS.md`
- `QUICK_START.md`
- `REVIEW_FINDINGS.md`
- `TESTING_GUIDE.md`
- `scripts/setup-tutor.ts`

This handoff and the refreshed `README.md` are continuity documentation. Ask the user whether they want these Markdown changes committed with the application or kept local.

## Recommended next conversation opening

Use this prompt in a new chat:

> Work in `/Users/charleswatkins/tutoring-platform`. Read `AGENTS.md`, `THREAD_HANDOFF_CURRENT.md`, and `README.md`, then inspect `git status --short` without discarding existing changes. Continue from the current Take Two Tutoring concierge MVP. First report the present state and the safest next action. Do not push or deploy unless I explicitly request it.

## Immediate decisions still needed

- Final legal/business entity name and whether Take Two Tutoring is a registered assumed name
- Final domain and production URL
- Public privacy/terms contact email and business mailing address
- Hosted PostgreSQL provider
- Whether consultation requests should trigger email notifications
- Retention period for inquiries that do not become clients
- Counsel approval of the privacy notice, website terms, acknowledgment, and tutoring agreement
- Tutoring rates, payment timing, cancellation/refund rules, session format, and safeguarding procedures before accepting paying clients

