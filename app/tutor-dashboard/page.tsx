'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import TutorAvailabilityManager from '@/components/TutorAvailabilityManager';
import { refreshCurrentUser, logout } from '@/lib/auth';

interface Session {
  id: string;
  student_name: string;
  student_id: string;
  subject: string;
  grade_at_time: string;
  scheduled_at: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  zoom_join_url?: string;
}

export default function TutorDashboardPage() {
  const router = useRouter();
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [historySessions, setHistorySessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const updateSession = async (id: string, action: 'complete' | 'cancel') => {
    setError('');
    const response = await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.message || 'Could not update session');
      return;
    }
    setUpcomingSessions((current) => current.filter((session) => session.id !== id));
    if (action === 'complete') {
      const completed = upcomingSessions.find((session) => session.id === id);
      if (completed) setHistorySessions((current) => [{ ...completed, status: 'completed' }, ...current]);
    } else {
      const cancelled = upcomingSessions.find((session) => session.id === id);
      if (cancelled) setHistorySessions((current) => [{ ...cancelled, status: 'cancelled' }, ...current]);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const currentUser = await refreshCurrentUser();
      if (!currentUser) {
        router.replace('/login');
        return;
      }
      if (currentUser.role !== 'tutor') {
        router.replace('/dashboard');
        return;
      }

      try {
        const response = await fetch('/api/tutor/sessions', { cache: 'no-store' });
        if (!response.ok) throw new Error('Could not load sessions');
        const data = await response.json();
        if (!active) return;

        const now = new Date();
        const upcoming = data.sessions.filter(
          (s: Session) => s.status === 'scheduled' && new Date(s.scheduled_at) > now
        );
        const history = data.sessions.filter(
          (s: Session) => s.status === 'completed' || s.status === 'cancelled'
        );

        setUpcomingSessions(upcoming.sort((a: Session, b: Session) =>
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        ));
        setHistorySessions(history.sort((a: Session, b: Session) =>
          new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
        ));
      } catch {
        if (active) setError('Could not load sessions. Please refresh and try again.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navy Header/Navbar */}
      <nav className="bg-slate-900 text-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold" aria-label="Take Two Tutoring home">
            <BrandLogo />
          </Link>
          <div className="flex gap-4 items-center">
            <span className="text-sm sm:text-base">👨‍🏫 Tutor Dashboard</span>
            <button
              onClick={handleLogout}
              className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
            Welcome, Tutor! 👋
          </h1>
          <p className="text-gray-600">
            Manage your sessions and track student progress
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-teal-500 mb-2">
              {upcomingSessions.length}
            </div>
            <p className="text-gray-600">Upcoming Sessions</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-green-500 mb-2">
              {historySessions.filter((session) => session.status === 'completed').length}
            </div>
            <p className="text-gray-600">Completed Sessions</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-orange-500 mb-2">
              {new Set(upcomingSessions.map((s) => s.student_name)).size}
            </div>
            <p className="text-gray-600">Active Students</p>
          </div>
        </div>

        <div className="mb-8">
          <Link href="/admin" className="inline-block bg-slate-700 hover:bg-slate-800 text-white font-semibold py-3 px-5 rounded-lg">
            Site Administration
          </Link>
        </div>

        <TutorAvailabilityManager />

        {/* Upcoming Sessions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Upcoming Sessions</h2>

          {upcomingSessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No upcoming sessions scheduled.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:border-teal-500 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-lg mb-1">
                        {session.student_name}
                      </h3>
                      <p className="text-gray-600 text-sm sm:text-base mb-2">
                        {session.subject} • Grade {session.grade_at_time}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {formatDate(session.scheduled_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {session.zoom_join_url ? (
                        <a href={session.zoom_join_url} target="_blank" rel="noopener noreferrer" className="bg-green-700 hover:bg-green-800 text-white font-semibold py-2 px-3 rounded-lg text-center text-sm">Join Zoom</a>
                      ) : <span className="text-gray-500 text-sm self-center">Awaiting Zoom</span>}
                      <button type="button" onClick={() => updateSession(session.id, 'complete')} className="bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2 px-3 rounded-lg text-sm">Complete</button>
                      <button type="button" onClick={() => updateSession(session.id, 'cancel')} className="border border-red-300 text-red-700 hover:bg-red-50 font-semibold py-2 px-3 rounded-lg text-sm">Cancel</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Sessions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Session History</h2>

          {historySessions.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No completed or cancelled sessions yet.</p>
          ) : (
            <div className="space-y-4">
              {historySessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {session.student_name} • {session.subject}
                      </h3>
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
              {historySessions.length > 5 && (
                <p className="text-gray-500 text-sm text-center pt-4">
                  +{historySessions.length - 5} more sessions
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
