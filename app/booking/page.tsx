'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { refreshCurrentUser, logout } from '@/lib/auth';
import { inputClass } from '@/components/StudentFields';
import { SUBJECT_OPTIONS } from '@/lib/student-options';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  grade_level: number | null;
}

interface AvailabilitySlot {
  tutor_id: number;
  timezone: string;
  scheduled_at: string;
}

export default function BookingPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState<number | ''>('');
  const [subject, setSubject] = useState('');
  const [slotKey, setSlotKey] = useState('');
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

      const [res, availabilityRes] = await Promise.all([
        fetch('/api/students', { cache: 'no-store' }),
        fetch('/api/availability', { cache: 'no-store' }),
      ]);

      if (res.status === 401) {
        await logout();
        router.push('/login');
        return;
      }

      const data = res.ok ? await res.json() : null;
      const availability = availabilityRes.ok ? await availabilityRes.json() : null;
      const kids: Student[] = data?.students ?? [];
      setStudents(kids);

      // The dashboard passes ?student_id= so the child you were looking at
      // is the one already selected here.
      const wanted = Number(
        new URLSearchParams(window.location.search).get('student_id')
      );
      const preselect = kids.find((k) => k.id === wanted);
      setStudentId(preselect ? preselect.id : kids[0]?.id ?? '');
      setSlots(availability?.slots ?? []);
      setLoadingSlots(false);
    })();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const selectedSlot = slots.find(
      (slot) => `${slot.tutor_id}|${slot.scheduled_at}` === slotKey
    );

    if (!studentId || !subject || !selectedSlot) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          subject,
          scheduled_at: selectedSlot.scheduled_at,
          tutor_id: selectedSlot.tutor_id,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to book session');
        setLoading(false);
        return;
      }

      setSuccess('Session booked successfully!');
      setSubject('');
      setSlotKey('');
      setNotes('');

      setTimeout(() => router.push('/dashboard'), 1500);
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const chosen = students.find((s) => s.id === studentId) ?? null;

  const formatSlot = (slot: AvailabilitySlot) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: slot.timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(new Date(slot.scheduled_at));

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-slate-900 text-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Civil Tutoring
          </Link>
          <div className="flex gap-4 items-center">
            <Link href="/dashboard" className="text-white hover:text-gray-200 text-sm sm:text-base">
              Back to Dashboard
            </Link>
            <button
              onClick={async () => {
                await logout();
                router.push('/');
              }}
              className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
            Book a Session
          </h1>
          <p className="text-gray-600 mb-8">
            Schedule a tutoring session with our expert tutors
          </p>

          {students.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                You need a student on your account before you can book.
              </p>
              <Link
                href="/profile"
                className="inline-block bg-orange-700 hover:bg-orange-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Add a student
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="student" className="block text-sm font-medium text-slate-900 mb-2">
                  Student {students.length > 1 && '*'}
                </label>
                {students.length > 1 ? (
                  <select
                    id="student"
                    value={studentId}
                    onChange={(e) => setStudentId(Number(e.target.value))}
                    className={inputClass}
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name}
                        {s.grade_level ? ` — Grade ${s.grade_level}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={chosen ? `${chosen.first_name} ${chosen.last_name}` : ''}
                    disabled
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
                  />
                )}
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-slate-900 mb-2">
                  Subject *
                </label>
                <select
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a subject</option>
                  {SUBJECT_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="time-slot" className="block text-sm font-medium text-slate-900 mb-2">
                  Available Time *
                </label>
                <select
                  id="time-slot"
                  value={slotKey}
                  onChange={(e) => setSlotKey(e.target.value)}
                  disabled={loadingSlots || slots.length === 0}
                  className={inputClass}
                >
                  <option value="">
                    {loadingSlots
                      ? 'Loading available times…'
                      : slots.length === 0
                        ? 'No times currently available'
                        : 'Choose a time'}
                  </option>
                  {slots.map((slot) => (
                    <option
                      key={`${slot.tutor_id}|${slot.scheduled_at}`}
                      value={`${slot.tutor_id}|${slot.scheduled_at}`}
                    >
                      {formatSlot(slot)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-slate-900 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What topics would you like to focus on?"
                  rows={4}
                  className={inputClass}
                />
              </div>

              {error && (
                <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div role="status" className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-700 hover:bg-orange-800 disabled:bg-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Booking...' : 'Book Session'}
              </button>
            </form>
          )}

          <div className="mt-8 p-4 bg-teal-50 border border-teal-200 rounded-lg">
            <p className="text-sm text-slate-900">
              <strong>Session Duration:</strong> All tutoring sessions are 1 hour long.
            </p>
            <p className="text-sm text-slate-900 mt-2">
              <strong>Changes:</strong> Contact your tutor if you need to change a booked session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
