import Link from 'next/link';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: 'How It Works',
  description:
    'A private, Tennessee-standards-informed approach to middle school math support.',
};

const STEPS = [
  {
    n: '1',
    title: 'A private consultation, at no charge',
    body: [
      'We talk about the student’s current math class, teacher expectations, recent assessments, what has already been tried and what feels difficult right now.',
      'Civil’s practice is intentionally small and referral-led. If the fit is not right, she will say so before anyone commits to ongoing sessions.',
    ],
  },
  {
    n: '2',
    title: 'Build a standards-informed starting point',
    body: [
      'Tennessee Academic Standards provide the grade-level foundation. Current classwork and assessments show where the student is relative to that foundation.',
      'The goal is not to race through a standards checklist. It is to identify the knowledge and reasoning a student needs for the work in front of them.',
    ],
  },
  {
    n: '3',
    title: 'Teach the current unit and the skills beneath it',
    body: [
      'Sessions focus on the material a student is being graded on—this week’s assignment, an upcoming assessment or the topic that did not land in class.',
      'When a prerequisite skill is getting in the way, Civil addresses it directly so the student can make sense of the current unit rather than merely finish the next worksheet.',
    ],
  },
  {
    n: '4',
    title: 'Continue with consistency',
    body: [
      'After the consultation, families can create an account, add their student and choose from the available online session times.',
      'The same educator works with the student over time, preserving context from one session to the next.',
    ],
  },
];

const FAQ = [
  {
    q: 'How long is a session?',
    a: 'One hour, one-on-one.',
  },
  {
    q: 'What subjects are available?',
    a: 'Middle school math is the initial focus. Select additional support, including ELA, may be available by consultation as the practice grows.',
  },
  {
    q: 'How are Tennessee standards used?',
    a: 'They clarify the grade-level knowledge and skills a student is expected to develop. Civil uses them alongside classroom work and assessment evidence to plan instruction for that individual student.',
  },
  {
    q: 'What is the cancellation policy?',
    a: 'Cancellation and rescheduling terms are confirmed during the consultation. Contact the tutor directly if an existing booking needs to change.',
  },
  {
    q: 'Are sessions online or in person?',
    a: 'Online. Your tutor provides the video-session details directly.',
  },
  {
    q: 'Can two students share a session?',
    a: 'Sessions are one-on-one. If you have more than one student, each books their own — both sit on the same parent account.',
  },
  {
    q: 'Do you guarantee a grade or a score?',
    a: 'No. Anyone who guarantees a specific grade is guessing about a classroom they do not sit in. What I will do is tell you honestly, after a few sessions, whether this is working.',
  },
  {
    q: 'What does it cost?',
    a: 'Current pricing is discussed during the free consultation before you commit to a session.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteNav />

      <section className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-14 sm:py-20 text-center">
          <p className="text-teal-600 font-semibold tracking-wide uppercase text-sm mb-4">
            The process
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-5">How it works</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            A direct, educator-led approach to middle school math support.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-4 py-14 sm:py-20">
          <div className="space-y-12">
            {STEPS.map((s) => (
              <div key={s.n} className="flex gap-5 sm:gap-8">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-teal-700 text-white flex items-center justify-center text-xl font-bold">
                    {s.n}
                  </div>
                </div>
                <div className="pt-1">
                  <h2 className="text-2xl font-bold text-slate-900 mb-3">{s.title}</h2>
                  {s.body.map((p, i) => (
                    <p key={i} className="text-gray-600 leading-relaxed mb-3 last:mb-0">
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-14 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-10">
            Common questions
          </h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold text-slate-900 mb-2">{item.q}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-4 py-14 sm:py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Still deciding?</h2>
          <p className="text-lg text-gray-300 mb-8">
            The consultation costs nothing and there is no obligation after it.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact"
              className="bg-orange-700 hover:bg-orange-800 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg"
            >
              Request a private consultation
            </Link>
            <Link
              href="/signup"
              className="bg-white hover:bg-gray-100 text-slate-900 font-semibold py-3 px-8 rounded-lg transition-colors text-lg"
            >
              Create an account
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-auto">
        <SiteFooter />
      </div>
    </div>
  );
}
