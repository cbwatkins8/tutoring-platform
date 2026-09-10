'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import { logout, refreshCurrentUser } from '@/lib/auth';

type Features = { client_portal: boolean; online_booking: boolean };

export default function AdminPage() {
  const router = useRouter();
  const [features, setFeatures] = useState<Features>({ client_portal: false, online_booking: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const user = await refreshCurrentUser();
      if (!user) return router.replace('/login');
      if (user.role !== 'tutor' && user.role !== 'admin') return router.replace('/');
      const response = await fetch('/api/admin/site-features', { cache: 'no-store' });
      if (!response.ok) setError('Could not load site settings.');
      else setFeatures((await response.json()).features);
      setLoading(false);
    })();
  }, [router]);

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    const response = await fetch('/api/admin/site-features', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
    });
    const data = await response.json();
    if (response.ok) {
      setFeatures(data.features);
      setMessage('Site settings saved. The public navigation updates immediately.');
    } else setError(data.message || 'Could not save site settings.');
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold"><BrandLogo /></Link>
          <button onClick={async () => { await logout(); router.push('/'); }} className="text-sm hover:text-gray-200">Logout</button>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Site Administration</h1>
            <p className="text-gray-600 mt-1">Control which completed features are visible to families.</p>
          </div>
          <Link href="/tutor-dashboard" className="text-teal-700 hover:text-teal-800 font-semibold">Tutor dashboard</Link>
        </div>

        {loading ? <div className="bg-white rounded-lg shadow-md p-6 text-gray-600">Loading settings…</div> : (
          <section className="bg-white rounded-lg shadow-md divide-y divide-gray-200">
            <label className="flex items-start justify-between gap-6 p-6 cursor-pointer">
              <span><strong className="block text-slate-900">Client portal</strong><span className="block text-sm text-gray-600 mt-1">Show Login and Sign Up and allow parent/student accounts to sign in.</span></span>
              <input type="checkbox" className="mt-1 h-5 w-5" checked={features.client_portal} onChange={(event) => setFeatures((current) => ({ ...current, client_portal: event.target.checked, online_booking: event.target.checked ? current.online_booking : false }))} />
            </label>
            <label className={`flex items-start justify-between gap-6 p-6 ${features.client_portal ? 'cursor-pointer' : 'opacity-50'}`}>
              <span><strong className="block text-slate-900">Online booking</strong><span className="block text-sm text-gray-600 mt-1">Allow signed-in families to book, reschedule and cancel sessions.</span></span>
              <input type="checkbox" className="mt-1 h-5 w-5" disabled={!features.client_portal} checked={features.online_booking} onChange={(event) => setFeatures((current) => ({ ...current, online_booking: event.target.checked }))} />
            </label>
            <div className="p-6 bg-teal-50">
              <strong className="text-slate-900">Current public launch</strong>
              <p className="text-sm text-gray-700 mt-1">The informational website and consultation request remain available regardless of these settings.</p>
            </div>
          </section>
        )}
        {error && <p role="alert" className="mt-5 text-red-700">{error}</p>}
        {message && <p role="status" className="mt-5 text-green-700">{message}</p>}
        {!loading && <button onClick={save} disabled={saving} className="mt-6 bg-orange-700 hover:bg-orange-800 disabled:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg">{saving ? 'Saving…' : 'Save site settings'}</button>}
        <p className="text-sm text-gray-500 mt-8">Staff sign-in remains available at <Link href="/login" className="underline">/login</Link> even while the client portal is hidden.</p>
      </main>
    </div>
  );
}
