'use client';

import { useState } from 'react';
import Link from 'next/link';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import { inputClass } from '@/components/StudentFields';
import { SUBJECT_OPTIONS, GRADE_OPTIONS } from '@/lib/student-options';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    const f = new FormData(e.currentTarget);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_name: f.get('parent_name'),
          email: f.get('email'),
          phone: f.get('phone'),
          student_name: f.get('student_name'),
          grade_level: f.get('grade_level'),
          subject: f.get('subject'),
          message: f.get('message'),
          referral_source: f.get('referral_source'),
          website: f.get('website'), // honeypot
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Something went wrong.');
        setBusy(false);
        return;
      }

      setSent(true);
    } catch {
      setError('Could not send that. Please try again in a moment.');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteNav />

      <section className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-14 sm:py-20 text-center">
          <p className="text-teal-600 font-semibold tracking-wide uppercase text-sm mb-4">
            Private, referral-based support
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-5">
            Request a private consultation
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Tell Civil about your student&rsquo;s current middle school math class, concerns
            and goals. The consultation is private, with no charge or obligation.
          </p>
        </div>
      </section>

      <section className="bg-gray-50 flex-1">
        <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
          {sent ? (
            <div role="status" className="bg-white rounded-lg shadow-md p-8 sm:p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl mx-auto mb-6">
                &#10003;
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Request received</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Thanks for reaching out. I read every one of these myself and will get back
                to you shortly.
              </p>
              <Link
                href="/how-it-works"
                className="inline-block bg-teal-700 hover:bg-teal-800 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
              >
                Read how sessions work
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Honeypot: hidden from people, irresistible to bots. */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="parent_name" className="block text-sm font-medium text-slate-900 mb-2">
                      Your Name *
                    </label>
                    <input id="parent_name" name="parent_name" required placeholder="John Smith" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-900 mb-2">
                      Email *
                    </label>
                    <input id="email" name="email" type="email" required placeholder="you@example.com" className={inputClass} />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-900 mb-2">
                    Phone <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <input id="phone" name="phone" type="tel" placeholder="(555) 123-4567" className={inputClass} />
                </div>

                <div className="pt-2 border-t border-gray-200" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="student_name" className="block text-sm font-medium text-slate-900 mb-2">
                      Student&rsquo;s Name
                    </label>
                    <input id="student_name" name="student_name" placeholder="Emma" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="grade_level" className="block text-sm font-medium text-slate-900 mb-2">
                      Grade
                    </label>
                    <select id="grade_level" name="grade_level" defaultValue="" className={inputClass}>
                      <option value="">Select a grade</option>
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g} value={g}>Grade {g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-slate-900 mb-2">
                    Subject
                  </label>
                  <select id="subject" name="subject" defaultValue="" className={inputClass}>
                    <option value="">Select a subject</option>
                    {SUBJECT_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="Other">Something else</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-900 mb-2">
                    What is going on? *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    placeholder="Which class, what has already been tried, and what you are hoping changes."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="referral_source" className="block text-sm font-medium text-slate-900 mb-2">
                    Who referred you? <span className="text-gray-500 font-normal">(if applicable)</span>
                  </label>
                  <input id="referral_source" name="referral_source" placeholder="A friend, colleague, school, or family member" className={inputClass} />
                </div>

                {error && (
                  <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-orange-700 hover:bg-orange-800 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-lg"
                >
                  {busy ? 'Sending...' : 'Request a private consultation'}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  Your details are used to respond to and manage this consultation request.{' '}
                  <Link href="/privacy" className="underline hover:text-slate-900">Privacy details</Link>
                </p>
              </form>
            </div>
          )}

          <p className="text-center text-gray-600 text-sm mt-8">
            Already have an account?{' '}
            <Link href="/login" className="text-teal-600 hover:text-teal-700 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
