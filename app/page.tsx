import Link from 'next/link';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

// Server-rendered on purpose: this is the page search engines and first-time
// visitors see, and none of it depends on who is signed in. SiteNav handles
// the one auth-aware piece.

const SCENARIOS = [
  {
    title: 'Grades slipped in a class that used to be fine',
    body: 'Something changed this year and the old study habits stopped working.',
  },
  {
    title: 'A test is coming and there is no plan',
    body: 'Midterms, finals or a placement exam, and nobody knows where to start.',
  },
  {
    title: 'Homework takes three hours and should not',
    body: 'The work gets done, but the evenings are gone and everyone is worn out.',
  },
  {
    title: 'A capable student who has stopped trying',
    body: 'The ability is there. The confidence went somewhere else.',
  },
];

const GOOD_FIT = [
  'You value direct support from an experienced educator, not a rotating tutor marketplace',
  "You want middle school math instruction connected to your student's actual coursework",
  'You want to understand both the immediate challenge and the skills underneath it',
];

const NOT_A_FIT = [
  'You are looking for drop-in homework completion rather than instruction',
  'You want someone to do the homework rather than teach it',
  'You want a guaranteed grade or test score',
];

const STEPS = [
  {
    n: '1',
    title: 'Private consultation',
    body: 'We talk through the student’s current class, challenges, goals and whether Civil is the right fit.',
  },
  {
    n: '2',
    title: 'A focused plan',
    body: 'Sessions connect current classwork with the Tennessee standards and prerequisite skills that support it.',
  },
  {
    n: '3',
    title: 'Consistent support',
    body: 'Choose an available time, then build steady progress with the same educator from week to week.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteNav />

      {/* 1. Hero */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24 text-center">
          <p className="text-teal-600 font-semibold tracking-wide uppercase text-sm mb-4">
            Private, referral-based support &middot; Online &middot; Grades 6&ndash;8
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Middle school math support, grounded in Tennessee Academic Standards.
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            A small, referral-led practice for families who want direct support from
            Civil&mdash;a Tennessee Level 5 educator with a Master&rsquo;s in Education.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact"
              className="bg-orange-700 hover:bg-orange-800 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg"
            >
              Request a private consultation
            </Link>
            <Link
              href="/how-it-works"
              className="bg-white hover:bg-gray-50 text-slate-900 font-semibold py-3 px-8 rounded-lg transition-colors text-lg border-2 border-slate-900"
            >
              See how it works
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Problem — "families come to us when" */}
      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-10 text-center">
            Families get in touch when&hellip;
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {SCENARIOS.map((s) => (
              <div key={s.title} className="bg-white rounded-lg p-6 border-l-4 border-teal-500 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Fit / not a fit */}
      <section className="bg-white">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg p-6 sm:p-8 border-2 border-teal-500">
              <h3 className="text-xl font-bold text-slate-900 mb-5">This is a good fit if</h3>
              <ul className="space-y-4">
                {GOOD_FIT.map((item) => (
                  <li key={item} className="flex gap-3 text-gray-600 text-sm leading-relaxed">
                    <span className="text-teal-600 font-bold flex-shrink-0" aria-hidden="true">&#10003;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 sm:p-8 border-2 border-gray-200">
              <h3 className="text-xl font-bold text-slate-900 mb-5">Probably not a fit if</h3>
              <ul className="space-y-4">
                {NOT_A_FIT.map((item) => (
                  <li key={item} className="flex gap-3 text-gray-600 text-sm leading-relaxed">
                    <span className="text-gray-400 font-bold flex-shrink-0" aria-hidden="true">&mdash;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Standards foundation */}
      <section id="standards" className="bg-teal-50 border-y border-teal-100 scroll-mt-16">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <p className="text-teal-700 font-semibold tracking-wide uppercase text-sm mb-3">
              The instructional foundation
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Tennessee standards are the starting point, not a script.
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Civil uses the Tennessee Academic Standards to clarify grade-level
              expectations, then adapts instruction to the student&rsquo;s classroom,
              current understanding and learning needs.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-xl p-6 border border-teal-100 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-2">Start with the classroom</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Current assignments, assessments and teacher expectations shape the
                immediate work.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-teal-100 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-2">Find the missing link</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                A struggle with today&rsquo;s lesson often points to a prerequisite skill
                that needs attention first.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-teal-100 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-2">Build durable understanding</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                The aim is conceptual understanding, fluency, reasoning and confidence
                that carry into the next unit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Process */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold mb-12 text-center">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="w-12 h-12 rounded-full bg-teal-700 text-white flex items-center justify-center text-xl font-bold mb-4">
                  {s.n}
                </div>
                <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/how-it-works"
              className="inline-block bg-orange-700 hover:bg-orange-800 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Read the full process
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Subjects */}
      <section id="subjects" className="bg-white scroll-mt-16">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3 text-center">
            Support begins with middle school math
          </h2>
          <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
            Middle school math is the initial focus. Select additional support is
            available by consultation as the practice grows.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="bg-teal-700 rounded-lg py-6 px-5 text-center text-white">
              <p className="font-bold text-lg">Middle School Math</p>
              <p className="text-sm text-teal-100 mt-1">Primary focus for grades 6&ndash;8</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg py-6 px-5 text-center">
              <p className="font-bold text-slate-900 text-lg">ELA Support</p>
              <p className="text-sm text-gray-600 mt-1">Available selectively by consultation</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg py-6 px-5 text-center">
              <p className="font-bold text-slate-900 text-lg">Other Needs</p>
              <p className="text-sm text-gray-600 mt-1">Discuss fit and availability directly</p>
            </div>
          </div>
          <p className="text-gray-600 text-sm text-center mt-8">
            Looking for ELA or another subject?{' '}
            <Link href="/contact" className="text-teal-600 hover:text-teal-700 font-semibold">
              Ask during a private consultation.
            </Link>
          </p>
        </div>
      </section>

      {/* 7. About */}
      <section id="about" className="bg-gray-50 border-y border-gray-200 scroll-mt-16">
        <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
            An educator-led, referral practice.
          </h2>
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>
              Civil is a Tennessee Level 5 educator with a Master&rsquo;s in Education.
              Families work directly with the same educator each week, so instruction
              stays connected to the student&rsquo;s classroom, strengths and next steps.
            </p>
            <p className="bg-white border-l-4 border-orange-500 p-4 text-slate-900">
              Every middle-school math plan begins with the Tennessee Academic Standards,
              current classwork and the skills a student needs next&mdash;not a generic
              worksheet sequence. Select additional support, including ELA, is available
              by consultation as the practice grows.
            </p>
          </div>
        </div>
      </section>

      {/* 8. Closing CTA */}
      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Begin with a private conversation
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Tell Civil about your student&rsquo;s current math class, concerns and goals.
            There is no account required to ask whether this is the right fit.
          </p>
          <Link
            href="/contact"
            className="inline-block bg-orange-700 hover:bg-orange-800 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg"
          >
            Request a private consultation
          </Link>
        </div>
      </section>

      <div className="mt-auto">
        <SiteFooter />
      </div>
    </div>
  );
}
