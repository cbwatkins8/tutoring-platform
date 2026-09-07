# Civil Tutoring

A Next.js 16 application for one-on-one online tutoring. Parents can manage
multiple students, book real tutor availability, and review sessions. Students
can receive a restricted login, and tutors have a scoped session dashboard.

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
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Generate a strong session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Verification

With the development server running:

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

The app does not invent credentials, prices, contact details, cancellation or
refund terms, testimonials, or performance claims. Add verified business content
before launch. Payments, automated video links, cancellation/rescheduling, and
tutor session reports are not implemented and are not promised by public pages.

Because student data can involve children, have the privacy notice and account
flow reviewed for the ages and jurisdictions the business will actually serve.
