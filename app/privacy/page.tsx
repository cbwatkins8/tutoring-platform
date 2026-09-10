import SiteFooter from '@/components/SiteFooter';
import SiteNav from '@/components/SiteNav';

export const metadata = {
  title: 'Privacy',
  description: 'How Take Two Tutoring handles account, student and consultation information.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteNav />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-14 sm:py-20">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Privacy</h1>
          <p className="text-sm text-gray-500 mb-10">Last updated September 6, 2026</p>

          <div className="space-y-8 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Information collected</h2>
              <p>
                Consultation requests may include a parent or guardian&rsquo;s name,
                contact details, a student&rsquo;s name and grade, the requested subject,
                and the message submitted. Accounts also store login information,
                student profiles and session bookings.
              </p>
            </section>
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">How it is used</h2>
              <p>
                This information is used to respond to inquiries, operate accounts,
                schedule tutoring and provide tutoring services. Passwords are stored
                only as one-way hashes and are not displayed in account pages.
              </p>
            </section>
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Student accounts</h2>
              <p>
                A student sign-in can only be created and managed from the linked
                primary parent or guardian account. Students can view their own profile
                and sessions but cannot edit academic notes or add other students.
              </p>
            </section>
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Questions and requests</h2>
              <p>
                Use the consultation form to ask a privacy question or request access,
                correction or deletion of information associated with your account.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
