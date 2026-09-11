# Take Two Tutoring — Brand Rename Checklist

**Premise:** Every student deserves another way in.

**Status:** Trademark verified clear (USPTO class 41, no conflicts found)  
**Decision:** Replacing "Civil Tutoring" throughout codebase

---

## 1. UI & Navigation

### Header/Navigation
- [ ] Main site logo/wordmark (if text-based, update to "Take Two Tutoring" or abbreviated "Take Two")
- [ ] Navigation bar brand text
- [ ] Mobile menu brand reference

**File likely:** `app/layout.tsx`, `components/Navigation.tsx`, or header component

### Hero Section
- [ ] Hero heading text mentioning brand
- [ ] Hero subheading/tagline
- [ ] Call-to-action buttons

**File likely:** `app/page.tsx` (home page) or `components/Hero.tsx`

### Footer
- [ ] Footer brand name
- [ ] Footer tagline or mission statement
- [ ] Company name in copyright notice (© Take Two Tutoring)
- [ ] Footer links mentioning the brand

**File likely:** `components/Footer.tsx` or `app/layout.tsx`

---

## 2. Page Metadata & SEO

- [ ] `<title>` tags (all pages) — update from "Civil Tutoring" to "Take Two Tutoring"
- [ ] `<meta name="description">` — update brand name
- [ ] `<meta name="og:title">` (Open Graph) — update brand
- [ ] `<meta name="og:description">` — if mentions brand
- [ ] `<meta name="twitter:title">` — update brand
- [ ] Favicon alt text (if any)

**Files likely:** `app/layout.tsx`, any `page.tsx` with metadata, `next.config.js` or `metadata` export

---

## 3. Email & Communication

- [ ] Contact email address
  - **Old example:** `info@civiltutoring.com` or `support@civiltutoring.com`
  - **New:** `info@taketwotutoring.com` or domain-dependent equivalent
- [ ] Password reset/confirmation emails (template text mentioning brand)
- [ ] Booking confirmation emails
- [ ] Session reminder emails
- [ ] Any hardcoded "Civil Tutoring" text in email bodies

**Files likely:** 
- `lib/email.ts` or email utilities
- API routes handling email (e.g., `app/api/auth/reset.ts`)
- Email templates (may be in a `templates/` or `emails/` folder)

---

## 4. Authentication & Seeded Data

### Demo/Seeded Tutor Account
- [ ] Tutor name (if "Civil Tutor" or similar) — update to reflect "Take Two Tutoring"
- [ ] Tutor bio/profile mentioning the organization
- [ ] Initial password or setup instructions

**Files likely:** 
- `lib/migrations/` (check for seed data in migration files, e.g., 001-004)
- `scripts/seed.ts` or similar
- Initial setup documentation

### Session/Auth References
- [ ] JWT issuer claim (if includes brand name)
- [ ] Session cookie domain (if brand-specific)
- [ ] Any hardcoded organization references in auth logic

**Files likely:** `lib/session.ts`, `lib/auth.ts`

---

## 5. Sitemap & Robots

- [ ] `sitemap.xml` — if it includes the domain name or organization name in comments
- [ ] `robots.txt` — if it mentions brand in comments

**Files likely:** `public/sitemap.xml`, `public/robots.txt`

---

## 6. Configuration Files

- [ ] `package.json` — `"name"` field (should be "take-two-tutoring" or similar)
- [ ] `next.config.js` — if any references to brand
- [ ] Environment variables (`.env.local`, `.env.example`) — if they include brand-specific values
- [ ] `tsconfig.json` — unlikely but check for path aliases mentioning brand

**Files likely:** Root-level config files

---

## 7. Documentation (Update or Flag for Deprecation)

These were identified as stale in the code review. Update brand references:

- [ ] `BUILD_SUMMARY.md` — mentions "Civil Tutoring" in context, project overview
- [ ] `REVIEW_FINDINGS.md` — may reference old brand in examples
- [ ] `TESTING_GUIDE.md` — may have "Civil Tutoring" in test setup examples
- [ ] `README.md` — project overview, likely mentions brand
- [ ] `CONTENT_TODO.md` — **placeholder updates needed:**
  - [ ] Brand background section
  - [ ] Hourly rate placeholder
  - [ ] Contact email placeholder

**Note:** Review each doc to distinguish between:
1. **Stale references** (update to Take Two Tutoring)
2. **General process docs** (may not need brand names)

---

## 8. Database & Seed Data

### Check migration files for hardcoded org name:
- [ ] `lib/migrations/001_initial_schema.sql` — any seed data mentioning "Civil"
- [ ] `lib/migrations/002-005_*.sql` — check all migrations for organization name references
- [ ] Any default values in table definitions

---

## 9. Form Components & UI Text

- [ ] `components/StudentFields.tsx` — check for help text or labels mentioning brand
- [ ] Form placeholders
- [ ] Error messages
- [ ] Success messages
- [ ] Loading states or onboarding text

---

## 10. Test Files (Optional, but recommended)

If your E2E test suite (81 assertions) contains hardcoded text:

- [ ] Test fixtures or setup data mentioning "Civil Tutoring"
- [ ] Assertion messages mentioning brand
- [ ] Mock data in test files

**Files likely:** `e2e/`, `__tests__/`, or similar test directory

---

## 11. Comments & Code References

- [ ] Comments in code files that mention "Civil Tutoring"
- [ ] TODO/FIXME comments mentioning old brand
- [ ] Variable names or class names (less critical but good practice)

---

## Verification Checklist

After completing all renames:

- [ ] Search codebase for "Civil" (case-insensitive) — should return 0 results in meaningful code
- [ ] Search for "civil tutoring" — should return 0 results
- [ ] Load site in browser and verify:
  - [ ] Page titles are correct
  - [ ] Navigation shows "Take Two Tutoring"
  - [ ] Footer shows correct company name
  - [ ] Hero section displays brand correctly
- [ ] Check email templates manually (send a test booking confirmation)
- [ ] Verify seeded tutor account loads correctly with new branding

---

## Domain & Email Setup (Separate from Code)

Once code is ready:

- [ ] Register domain: `taketwotutoring.com` (or variant if preferred)
- [ ] Set up email: `info@taketwotutoring.com` (or similar)
- [ ] Update DNS/MX records for email
- [ ] Test email sending end-to-end
- [ ] Update footer & contact pages with new email address

---

## Notes

- **Premise:** "Every student deserves another way in" — consider where this message can be reinforced (hero, about, footer)
- **Color scheme:** Remains the same (navy #0F172A, teal #0D9488, orange #F97316)
- **Tone:** Stays warm, subject-neutral, family-facing
- **Trademark:** Clear in class 41; safe to proceed

---

## Quick Reference: Search & Replace Patterns

If using find-and-replace across your entire project:

```
Search: Civil Tutoring
Replace: Take Two Tutoring

Search: civil-tutoring
Replace: take-two-tutoring

Search: civil_tutoring
Replace: take_two_tutoring

Search: civiltutoring
Replace: taketwotutoring
```

**⚠️ Warning:** Use regex/case-sensitive mode and verify each match before replacing, especially in comments and documentation. Some matches may be examples or non-brand references.

---

## Files Identified from Code Review (Primary Focus)

Based on the previous session's code review, prioritize these files:

1. **Page Templates:**
   - `app/layout.tsx` (metadata, nav, footer)
   - `app/page.tsx` (home/hero)
   - `app/dashboard/page.tsx`
   - `app/profile/page.tsx`
   - `app/booking/page.tsx`

2. **Component Files:**
   - `components/Navigation.tsx` (or header/nav component)
   - `components/Footer.tsx`
   - `components/StudentFields.tsx`
   - Other shared components with brand text

3. **Auth/Session:**
   - `lib/session.ts`
   - `lib/auth.ts`
   - API routes in `app/api/auth/`

4. **Database:**
   - `lib/migrations/` (all files)

5. **Documentation:**
   - `CONTENT_TODO.md`
   - `BUILD_SUMMARY.md`
   - `README.md`

---

**Last Updated:** Sept 10, 2026  
**Reviewed by:** Claude (Haiku 4.5)
