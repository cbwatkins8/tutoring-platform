'use client';

import { useEffect, useState } from 'react';
import { inputClass } from '@/components/StudentFields';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type WeeklyDay = {
  day_of_week: number;
  enabled: boolean;
  start_time: string;
  end_time: string;
};

type Exception = {
  id?: number;
  exception_date: string;
  available: boolean;
  start_time: string;
  end_time: string;
  note: string;
};

const blankWeek = (): WeeklyDay[] => DAYS.map((_, day) => ({
  day_of_week: day,
  enabled: false,
  start_time: '15:00',
  end_time: '20:00',
}));

export default function TutorAvailabilityManager() {
  const [weekly, setWeekly] = useState<WeeklyDay[]>(blankWeek);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [timezone, setTimezone] = useState('America/Chicago');
  const [interval, setIntervalMinutes] = useState(30);
  const [exceptionDate, setExceptionDate] = useState('');
  const [exceptionKind, setExceptionKind] = useState<'closed' | 'available'>('closed');
  const [exceptionStart, setExceptionStart] = useState('15:00');
  const [exceptionEnd, setExceptionEnd] = useState('20:00');
  const [exceptionNote, setExceptionNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/tutor/availability', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load availability');
        return response.json();
      })
      .then((data) => {
        const next = blankWeek();
        for (const row of data.weekly ?? []) {
          const day = Number(row.day_of_week);
          if (next[day] && !next[day].enabled) {
            next[day] = {
              day_of_week: day,
              enabled: true,
              start_time: String(row.start_time).slice(0, 5),
              end_time: String(row.end_time).slice(0, 5),
            };
          }
        }
        setWeekly(next);
        setTimezone(data.timezone || 'America/Chicago');
        setIntervalMinutes(Number(data.slot_interval_minutes) || 30);
        setExceptions((data.exceptions ?? []).map((row: Exception) => ({
          ...row,
          exception_date: String(row.exception_date).slice(0, 10),
          start_time: row.start_time ? String(row.start_time).slice(0, 5) : '',
          end_time: row.end_time ? String(row.end_time).slice(0, 5) : '',
          note: row.note || '',
        })));
      })
      .catch(() => setError('Could not load availability.'))
      .finally(() => setLoading(false));
  }, []);

  const updateDay = (day: number, updates: Partial<WeeklyDay>) => {
    setWeekly((current) => current.map((row) => row.day_of_week === day ? { ...row, ...updates } : row));
  };

  const addException = () => {
    setError('');
    if (!exceptionDate) {
      setError('Choose a date for the exception.');
      return;
    }
    if (exceptionKind === 'available' && exceptionEnd <= exceptionStart) {
      setError('Added availability must end after it begins.');
      return;
    }
    const next: Exception = {
      exception_date: exceptionDate,
      available: exceptionKind === 'available',
      start_time: exceptionKind === 'available' ? exceptionStart : '',
      end_time: exceptionKind === 'available' ? exceptionEnd : '',
      note: exceptionNote.trim(),
    };
    setExceptions((current) => [
      ...current.filter((row) => !(row.exception_date === next.exception_date && !row.available && !next.available)),
      next,
    ]);
    setExceptionDate('');
    setExceptionNote('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/tutor/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone,
          slot_interval_minutes: interval,
          weekly: weekly.filter((row) => row.enabled),
          exceptions,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not save availability');
      setMessage('Availability saved. New booking times are now active.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save availability');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-gray-600">Loading availability…</div>;
  }

  return (
    <section className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Availability</h2>
        <p className="text-gray-600 text-sm mt-1">Set your normal week, booking start times and date-specific changes.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <label className="text-sm font-medium text-slate-900">
          Time zone
          <input value={timezone} onChange={(event) => setTimezone(event.target.value)} className={`${inputClass} mt-2`} list="timezones" />
          <datalist id="timezones">
            <option value="America/New_York" />
            <option value="America/Chicago" />
            <option value="America/Denver" />
            <option value="America/Los_Angeles" />
          </datalist>
        </label>
        <label className="text-sm font-medium text-slate-900">
          Offer a starting time every
          <select value={interval} onChange={(event) => setIntervalMinutes(Number(event.target.value))} className={`${inputClass} mt-2`}>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </label>
      </div>

      <div className="space-y-3 mb-8">
        {weekly.map((row) => (
          <div key={row.day_of_week} className="grid grid-cols-[7rem_1fr_1fr] sm:grid-cols-[9rem_1fr_1fr] gap-3 items-center">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <input type="checkbox" checked={row.enabled} onChange={(event) => updateDay(row.day_of_week, { enabled: event.target.checked })} />
              {DAYS[row.day_of_week]}
            </label>
            <input aria-label={`${DAYS[row.day_of_week]} start time`} type="time" value={row.start_time} disabled={!row.enabled} onChange={(event) => updateDay(row.day_of_week, { start_time: event.target.value })} className={inputClass} />
            <input aria-label={`${DAYS[row.day_of_week]} end time`} type="time" value={row.end_time} disabled={!row.enabled} onChange={(event) => updateDay(row.day_of_week, { end_time: event.target.value })} className={inputClass} />
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="font-bold text-slate-900 mb-1">Date exceptions</h3>
        <p className="text-gray-600 text-sm mb-4">Close a date or add hours outside your normal week.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <label className="text-sm font-medium text-slate-900">Date<input type="date" min={new Date().toISOString().slice(0, 10)} value={exceptionDate} onChange={(event) => setExceptionDate(event.target.value)} className={`${inputClass} mt-2`} /></label>
          <label className="text-sm font-medium text-slate-900">Change<select value={exceptionKind} onChange={(event) => setExceptionKind(event.target.value as 'closed' | 'available')} className={`${inputClass} mt-2`}><option value="closed">Closed all day</option><option value="available">Add hours</option></select></label>
          <label className="text-sm font-medium text-slate-900">Start<input type="time" disabled={exceptionKind === 'closed'} value={exceptionStart} onChange={(event) => setExceptionStart(event.target.value)} className={`${inputClass} mt-2`} /></label>
          <label className="text-sm font-medium text-slate-900">End<input type="time" disabled={exceptionKind === 'closed'} value={exceptionEnd} onChange={(event) => setExceptionEnd(event.target.value)} className={`${inputClass} mt-2`} /></label>
          <button type="button" onClick={addException} className="bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-lg">Add</button>
        </div>
        <label className="block text-sm font-medium text-slate-900 mt-3">Optional note<input value={exceptionNote} onChange={(event) => setExceptionNote(event.target.value)} placeholder="Holiday, special opening…" className={`${inputClass} mt-2`} /></label>

        {exceptions.length > 0 && (
          <div className="mt-5 space-y-2">
            {exceptions.map((row, index) => (
              <div key={`${row.exception_date}-${row.start_time}-${index}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm">
                <span><strong>{new Date(`${row.exception_date}T12:00:00`).toLocaleDateString()}</strong> — {row.available ? `${row.start_time}–${row.end_time}` : 'Closed all day'}{row.note ? ` · ${row.note}` : ''}</span>
                <button type="button" onClick={() => setExceptions((current) => current.filter((_, i) => i !== index))} className="text-red-700 hover:text-red-800 font-semibold self-start sm:self-auto">Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p role="alert" className="mt-5 text-red-700 text-sm">{error}</p>}
      {message && <p role="status" className="mt-5 text-green-700 text-sm">{message}</p>}
      <button type="button" onClick={save} disabled={saving} className="mt-6 bg-orange-700 hover:bg-orange-800 disabled:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg">
        {saving ? 'Saving…' : 'Save availability'}
      </button>
    </section>
  );
}
