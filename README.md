# Take Two Tutoring

A Next.js 16 application for a referral-based tutoring practice. The current
public MVP explains the service and accepts private consultation requests.
Family accounts, multi-student support, availability, booking, session
management, and student access are preserved behind administrator-controlled
feature flags for later activation.

For complete project continuity, current deployment status, and the pending
working-tree scope, read `THREAD_HANDOFF_CURRENT.md` before making changes.

## Local setup

Requirements: Node.js 20+, Docker, and Docker Compose.

```bash
docker compose up -d
npm install
npm run db:migrate
node scripts/setup-tutor.mjs
npm run dev
```

Set these values in `.env.local`:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tutoring_dev
JWT_SECRET=replace-with-at-least-32-random-characters
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

Generate a strong session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Verification

Start the development server on the project's current local port:

```bash
npm run dev -- -p 3001
```

Then verify:

```bash
npm run lint
npm run build
npm run db:check
npm run test:e2e
```

The end-to-end suite creates uniquely named `@e2e.invalid` records and removes
only those records when it finishes.

## Security and scheduling

- Authentication uses signed 12-hour sessions in `HttpOnly`, `SameSite=Lax`
  cookies. Password/email changes and logout revoke older sessions.
- Protected APIs verify the current account, role, and revocation version in
  PostgreSQL. Parent/student ownership checks are centralized in `lib/access.ts`.
- Public and sensitive mutation endpoints use a shared PostgreSQL rate limiter.
- Database exclusion constraints prevent overlapping scheduled sessions for
  both tutors and students.
- Booking times are generated from recurring availability in each tutor's IANA
  time zone.

## Product work requiring business decisions

The app does not invent prices, contact details, cancellation or refund terms,
testimonials, or performance claims. Add verified business content before
accepting clients. Payments, automated video links, and tutor session reports
are not implemented and are not promised by public pages. Session cancellation
and rescheduling code exists but remains unavailable to families while online
booking is disabled.

Because student data can involve children, have the privacy notice, website
terms, consultation acknowledgment, and future tutoring agreement reviewed for
the ages and jurisdictions the business will actually serve. Review-ready Word
templates are identified in `THREAD_HANDOFF_CURRENT.md`.
