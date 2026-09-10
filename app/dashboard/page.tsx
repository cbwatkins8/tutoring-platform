'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import { refreshCurrentUser, logout } from '@/lib/auth';

interface Session {
  id: number;
  student_id: number;
  student_name: string;
  subject: string;
  scheduled_at: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  zoom_join_url?: string;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  grade_level: number | null;
  school_name: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [accountName, setAccountName] = useState('');
  const [role, setRole] = useState<string>('parent');
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [bookingEnabled, setBookingEnabled] = useState(false);

  const authedFetch = useCallback(async (url: string) => {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.status === 401) {
      await logout();
      router.push('/login');
      return null;
    }
    return res.ok ? res.json() : null;
  }, [router]);

  useEffect(() => {
    (async () => {
      const user = await refreshCurrentUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      if (user.role === 'tutor') {
        router.replace('/tutor-dashboard');
        return;
      }
      setRole(user.role);

      const [profile, list, sess, publicSettings] = await Promise.all([
        authedFetch('/api/parent'),
        authedFetch('/api/students'),
        authedFetch('/api/sessions'),
        fetch('/api/site-features', { cache: 'no-store' }).then((response) => response.json()).catch(() => null),
      ]);

      // Greet the account holder by their own name, not their child's.
      if (profile?.profile?.name) setAccountName(profile.profile.name);

      const kids: Student[] = list?.students ?? [];
      setStudents(kids);
      if (kids.length > 0) setSelectedId(kids[0].id);

      setSessions(sess?.sessions ?? []);
      setBookingEnabled(Boolean(publicSettings?.features?.online_booking));
      setLoading(false);
    })();
  }, [router, authedFetch]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const cancelSession = async (sessionId: number) => {
    if (!window.confirm('Cancel this session? The record will remain in session history.')) return;
    setSessionError('');
    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    });
    const data = await response.json();
    if (!response.ok) {
      setSessionError(data.message || 'Could not cancel the session.');
      return;
    }
    setSessions((current) => current.map((session) =>
      session.id === sessionId ? { ...session, status: 'cancelled' } : session
    ));
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const selected = students.find((s) => s.id === selectedId) ?? null;
  const isParent = role === 'parent';

  // With one child (or a student signing in) the tabs add nothing, so hide them.
  const showTabs = isParent && students.length > 1;

  const visible = selectedId
    ? sessions.filter((s) => s.student_id === selectedId)
    : sessions;

  const upcoming = visible.filter((s) => s.status === 'scheduled');
  const past = visible.filter((s) => s.status === 'completed' || s.status === 'cancelled');

  const firstName = accountName.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-slate-900 text-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold" aria-label="Take Two Tutoring home">
            <BrandLogo />
          </Link>
          <button
            onClick={handleLogout}
            className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
            Welcome back, {firstName}! 👋
          </h1>
          {isParent ? (
            <p className="text-gray-600">
              {students.length === 0
                ? 'No students on your account yet.'
                : `${students.length} student${students.length === 1 ? '' : 's'} on your account`}
            </p>
          ) : (
            selected && (
              <p className="text-gray-600">
                Grade {selected.grade_level ?? '—'}
                {selected.school_name ? ` • ${selected.school_name}` : ''}
              </p>
            )
          )}
        </div>

        {/* Child switcher. Scrolls sideways rather than wrapping on a phone. */}
        {showTabs && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`flex-shrink-0 px-5 py-2 rounded-lg font-semibold transition-colors border-2 ${
                  s.id === selectedId
                    ? 'bg-teal-500 border-teal-500 text-white'
                    : 'bg-white border-gray-200 text-slate-900 hover:border-teal-500'
                }`}
              >
                {s.first_name}
              </button>
            ))}
            <Link
              href="/profile"
              className="flex-shrink-0 px-5 py-2 rounded-lg font-semibold border-2 border-dashed border-gray-300 text-gray-600 hover:border-teal-500 hover:text-teal-600 transition-colors"
            >
              + Add student
            </Link>
          </div>
        )}

        {selected && isParent && (
          <p className="text-gray-600 mb-6">
            Grade {selected.grade_level ?? '—'}
            {selected.school_name ? ` • ${selected.school_name}` : ''}
          </p>
        )}

        {sessionError && (
          <p role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {sessionError}
          </p>
        )}

        {isParent && students.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-center py-12">
            <p className="text-gray-600 mb-4">
              Add a student to start booking sessions.
            </p>
            <Link
              href="/profile"
              className="inline-block bg-orange-700 hover:bg-orange-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Add a student
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <Link
              href={bookingEnabled ? (selectedId ? `/booking?student_id=${selectedId}` : '/booking') : '/contact'}
              className="bg-teal-700 hover:bg-teal-800 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-center"
            >
              {bookingEnabled ? '📅 Book a Session' : 'Request a Consultation'}
            </Link>
            <Link
              href="/profile"
              className="bg-blue-700 hover:bg-blue-800 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-center"
            >
              ⚙️ {isParent ? 'My Profile' : 'My Details'}
            </Link>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            Upcoming Sessions
            {showTabs && selected ? ` — ${selected.first_name}` : ''}
          </h2>

          {upcoming.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                {selected
                  ? `${selected.first_name} has no upcoming sessions.`
                  : "You don't have any upcoming sessions."}
              </p>
              {students.length > 0 && bookingEnabled && (
                <Link
                  href={selectedId ? `/booking?student_id=${selectedId}` : '/booking'}
                  className="inline-block bg-orange-700 hover:bg-orange-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Book a Session
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {upcoming.map((session) => (
                <div
                  key={session.id}
                  className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:border-teal-500 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg mb-1">
                        {session.subject}
                      </h3>
                      <p className="text-gray-700 text-sm font-medium mb-1">{session.student_name}</p>
                      <p className="text-gray-600 text-sm sm:text-base">
                        {formatDate(session.scheduled_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {session.zoom_join_url && (
                        <a href={session.zoom_join_url} target="_blank" rel="noopener noreferrer" className="bg-green-700 hover:bg-green-800 text-white font-semibold py-2 px-3 rounded-lg text-center text-sm">Join Session</a>
                      )}
                      <Link href={`/booking?session_id=${session.id}`} className="border border-teal-600 text-teal-700 hover:bg-teal-50 font-semibold py-2 px-3 rounded-lg text-center text-sm">Reschedule</Link>
                      <button type="button" onClick={() => cancelSession(session.id)} className="border border-red-300 text-red-700 hover:bg-red-50 font-semibold py-2 px-3 rounded-lg text-sm">Cancel</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Session History</h2>

          {past.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No completed or cancelled sessions yet.</p>
          ) : (
            <div className="space-y-4">
              {past.map((session) => (
                <div
                  key={session.id}
                  className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">{session.subject}</h3>
                      <p className="text-gray-700 text-sm font-medium">{session.student_name}</p>
                      <p className="text-gray-600 text-sm">
                        {formatDate(session.scheduled_at)}
                      </p>
                    </div>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold w-fit ${session.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {session.status === 'cancelled' ? 'Cancelled' : '✓ Completed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
