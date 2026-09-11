# Historical content checklist

> For current business, legal, deployment, and content decisions, use
> `THREAD_HANDOFF_CURRENT.md`. This checklist predates the Take Two Tutoring
> rename and consultation-only public MVP.

The public pages no longer display these placeholders or unsupported promises.
The remaining launch requirement is to add verified tutor credentials, pricing,
contact information, policies, and privacy/operator details. Do not restore
unsourced claims, ratings, testimonials, or outcome figures.

The original checklist follows for reference.

The public pages are built. These spots are deliberately left blank — I won't
invent facts about your business. Search the codebase for `TODO (Chuck)` to find
them in place.

## Must fill before launch

**1. Your background** — `app/page.tsx`, the About section
Currently an orange-bordered placeholder box. Kate's site names her degree and
her CA Teaching Commission number (`#120563373`). That specificity is the whole
point of an about section. Write: your degree, teaching credential or licence
number, years teaching, and the subjects you're strongest in.

**2. Your rate** — `app/how-it-works/page.tsx`, last FAQ item
Reads `[Add your hourly rate and any package pricing here.]`. Kate's site is
explicit that budget shoppers aren't her client; naming a number does that work
for you and filters enquiries before they reach your inbox.

**3. Your real contact email** — `components/SiteFooter.tsx`
Currently `help@civiltutoring.com`, which I made up.

## Removed on purpose

The old homepage claimed **500+ students served, 4.8★ average rating, 92% grade
improvement**. I invented all three as placeholders. They're gone.

When you have real figures — students taught, years teaching, verified review
ratings, actual score gains you can point at — tell me and I'll build the stats
band back. Real numbers with a source beat invented ones badly, and invented
ones on a real business are a liability.

## Worth adding once you have them

- **Testimonials.** Kate's has four on the homepage. Ask two or three current
  families for a sentence. I won't write these.
- **A photo of you.** The About section is text-only. A face converts.
- **Google/Yelp reviews.** Her "★★★★★ on Yelp · 5.0 on Google" is credible
  precisely because it's checkable.
