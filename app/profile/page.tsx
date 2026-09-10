'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import { refreshCurrentUser, logout } from '@/lib/auth';
import StudentFields, {
  inputClass,
  emptyStudent,
  type StudentFieldsValue,
} from '@/components/StudentFields';
import { SUBJECT_OPTIONS, GRADE_OPTIONS } from '@/lib/student-options';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  grade_level: number | null;
  school_name: string | null;
  academic_notes: string | null;
  subjects: string | null;
  has_login: boolean;
}

interface Profile {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [tab, setTab] = useState<'students' | 'account'>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState('parent');
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [loginForId, setLoginForId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState<StudentFieldsValue>(emptyStudent());
  const [editSubjects, setEditSubjects] = useState<string[]>([]);

  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const call = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
      });
      if (res.status === 401) {
        await logout();
        router.push('/login');
        return { ok: false, data: null };
      }
      let data = null;
      try {
        data = await res.json();
      } catch {
        /* no body */
      }
      return { ok: res.ok, data };
    },
    [router]
  );

  const reload = useCallback(async () => {
    const [list, me] = await Promise.all([call('/api/students'), call('/api/parent')]);
    setStudents(list.data?.students ?? []);
    setProfile(me.data?.profile ?? null);
    setLoading(false);
  }, [call]);

  useEffect(() => {
    refreshCurrentUser().then((user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      if (user.role === 'tutor') {
        router.replace('/tutor-dashboard');
        return;
      }
      setRole(user.role);
      reload();
    });
  }, [router, reload]);

  const flash = (kind: 'ok' | 'err', text: string) => {
    setBanner({ kind, text });
    setTimeout(() => setBanner(null), 4000);
  };

  // ---- student details ----
  const saveStudent = async (e: React.FormEvent<HTMLFormElement>, id: number) => {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const { ok, data } = await call('/api/student/update', {
      method: 'PATCH',
      body: JSON.stringify({
        student_id: id,
        grade_level: f.get('grade_level'),
        school_name: f.get('school_name'),
        subjects: editSubjects.join(', '),
        academic_notes: f.get('academic_notes'),
      }),
    });
    setBusy(false);
    if (ok) {
      flash('ok', 'Saved.');
      setEditingId(null);
      reload();
    } else {
      flash('err', data?.message || 'Could not save.');
    }
  };

  const addStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!addForm.firstName || !addForm.lastName || addForm.subjects.length === 0) {
      flash('err', 'Please fill in all student fields and select at least one subject');
      return;
    }

    setBusy(true);
    const { ok, data } = await call('/api/students', {
      method: 'POST',
      body: JSON.stringify({
        first_name: addForm.firstName,
        last_name: addForm.lastName,
        grade_level: addForm.grade,
        subjects: addForm.subjects.join(', '),
      }),
    });
    setBusy(false);
    if (ok) {
      flash('ok', `${data?.student?.first_name} added.`);
      setAdding(false);
      setAddForm(emptyStudent());
      reload();
    } else {
      flash('err', data?.message || 'Could not add student.');
    }
  };

  const saveLogin = async (e: React.FormEvent<HTMLFormElement>, id: number) => {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const { ok, data } = await call(`/api/students/${id}/login`, {
      method: 'POST',
      body: JSON.stringify({ email: f.get('email'), password: f.get('password') }),
    });
    setBusy(false);
    if (ok) {
      flash('ok', data?.message || 'Sign-in saved.');
      setLoginForId(null);
      reload();
    } else {
      flash('err', data?.message || 'Could not save sign-in.');
    }
  };

  // ---- own account ----
  const saveAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const { ok, data } = await call('/api/parent', {
      method: 'PATCH',
      body: JSON.stringify({ name: f.get('name'), email: f.get('email') }),
    });
    setBusy(false);
    if (!ok) {
      flash('err', data?.message || 'Could not save.');
      return;
    }
    if (data?.reloginRequired) {
      flash('ok', 'Email changed — please sign in again.');
      setTimeout(() => {
        void logout();
        router.push('/login');
      }, 1800);
      return;
    }
    flash('ok', 'Saved.');
    reload();
  };

  const changePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (f.get('new_password') !== f.get('confirm_password')) {
      flash('err', 'The new passwords do not match.');
      return;
    }
    setBusy(true);
    const { ok, data } = await call('/api/parent/password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: f.get('current_password'),
        new_password: f.get('new_password'),
      }),
    });
    setBusy(false);
    if (ok) {
      flash('ok', 'Password changed — please sign in again.');
      form.reset();
      setTimeout(() => {
        void logout();
        router.push('/login');
      }, 1500);
    } else {
      flash('err', data?.message || 'Could not change password.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const isParent = role === 'parent';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-slate-900 text-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold" aria-label="Take Two Tutoring home">
            <BrandLogo />
          </Link>
          <div className="flex gap-4 items-center">
            <Link href="/dashboard" className="text-white hover:text-gray-200 text-sm sm:text-base">
              Dashboard
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
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Profile</h1>

        {isParent && (
          <div className="flex gap-1 mb-6 border-b border-gray-200">
            {(['students', 'account'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-3 font-semibold transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-600 hover:text-slate-900'
                }`}
              >
                {t === 'students' ? 'Students' : 'My Account'}
              </button>
            ))}
          </div>
        )}

        {banner && (
          <div
            role={banner.kind === 'ok' ? 'status' : 'alert'}
            className={`mb-6 px-4 py-3 rounded-lg text-sm border ${
              banner.kind === 'ok'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {banner.text}
          </div>
        )}

        {/* ================= STUDENTS ================= */}
        {(!isParent || tab === 'students') && (
          <div className="space-y-4">
            {students.length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center">
                <p className="text-gray-600">No students on this account yet.</p>
              </div>
            )}

            {students.map((s) => (
              <div key={s.id} className="bg-white rounded-lg shadow-md p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {s.first_name} {s.last_name}
                    </h2>
                    <p className="text-gray-600 text-sm">
                      Grade {s.grade_level ?? '—'}
                      {s.school_name ? ` • ${s.school_name}` : ''}
                    </p>
                  </div>
                  {isParent && (
                    <button
                      onClick={() => {
                        const opening = editingId !== s.id;
                        setEditingId(opening ? s.id : null);
                        if (opening) {
                          setEditSubjects(
                            (s.subjects ?? '')
                              .split(',')
                              .map((x) => x.trim())
                              .filter(Boolean)
                          );
                        }
                      }}
                      className="text-teal-600 hover:text-teal-700 font-semibold text-sm w-fit"
                    >
                      {editingId === s.id ? 'Cancel' : 'Edit'}
                    </button>
                  )}
                </div>

                {s.subjects && (
                  <p className="text-gray-600 text-sm mb-2">
                    <span className="font-medium text-slate-900">Subjects:</span> {s.subjects}
                  </p>
                )}
                {s.academic_notes && (
                  <p className="text-gray-600 text-sm mb-2">
                    <span className="font-medium text-slate-900">Notes:</span> {s.academic_notes}
                  </p>
                )}

                {editingId === s.id && isParent && (
                  <form onSubmit={(e) => saveStudent(e, s.id)} className="space-y-4 mt-6 pt-6 border-t border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">Grade Level</label>
                      <select name="grade_level" defaultValue={s.grade_level ?? ''} className={inputClass}>
                        <option value="">Not set</option>
                        {GRADE_OPTIONS.map((g) => (
                          <option key={g} value={g}>Grade {g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">School Name</label>
                      <input name="school_name" defaultValue={s.school_name ?? ''} placeholder="Lincoln High School" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-3">
                        Subjects (Select at least one)
                      </label>
                      <div className="space-y-2">
                        {SUBJECT_OPTIONS.map((subject) => (
                          <label key={subject} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editSubjects.includes(subject)}
                              onChange={() =>
                                setEditSubjects((prev) =>
                                  prev.includes(subject)
                                    ? prev.filter((x) => x !== subject)
                                    : [...prev, subject]
                                )
                              }
                              className="w-4 h-4 text-teal-500 rounded focus:ring-teal-500"
                            />
                            <span className="ml-2 text-gray-700">{subject}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">Academic Notes</label>
                      <textarea name="academic_notes" defaultValue={s.academic_notes ?? ''} rows={3} placeholder="Anything the tutor should know..." className={inputClass} />
                    </div>
                    <button type="submit" disabled={busy} className="w-full bg-orange-700 hover:bg-orange-800 disabled:bg-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                      {busy ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                )}

                {isParent && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="text-sm text-gray-600">
                        {s.has_login
                          ? `${s.first_name} can sign in to their own account.`
                          : `${s.first_name} has no sign-in yet.`}
                      </p>
                      <button
                        onClick={() => setLoginForId(loginForId === s.id ? null : s.id)}
                        className="text-teal-600 hover:text-teal-700 font-semibold text-sm w-fit"
                      >
                        {loginForId === s.id ? 'Cancel' : s.has_login ? 'Reset password' : 'Give login'}
                      </button>
                    </div>

                    {loginForId === s.id && (
                      <form onSubmit={(e) => saveLogin(e, s.id)} className="space-y-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">Their Email</label>
                          <input name="email" type="email" required placeholder="student@example.com" className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">Password</label>
                          <input name="password" type="password" required minLength={8} placeholder="At least 8 characters" className={inputClass} />
                          <p className="text-xs text-gray-500 mt-1">
                            Share this with {s.first_name}. They can see their own sessions, but not change their academic notes.
                          </p>
                        </div>
                        <button type="submit" disabled={busy} className="w-full bg-teal-700 hover:bg-teal-800 disabled:bg-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                          {busy ? 'Saving...' : s.has_login ? 'Reset Password' : 'Create Sign-In'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isParent && (
              <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
                {!adding ? (
                  <button
                    onClick={() => setAdding(true)}
                    className="w-full border-2 border-dashed border-gray-300 hover:border-teal-500 hover:text-teal-600 text-gray-600 font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    + Add a student
                  </button>
                ) : (
                  <form onSubmit={addStudent} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-slate-900">Add a student</h2>
                      <button type="button" onClick={() => setAdding(false)} className="text-gray-600 hover:text-slate-900 text-sm font-semibold">
                        Cancel
                      </button>
                    </div>
                    <StudentFields value={addForm} onChange={setAddForm} idPrefix="add" />
                    <button type="submit" disabled={busy} className="w-full bg-orange-700 hover:bg-orange-800 disabled:bg-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                      {busy ? 'Adding...' : 'Add Student'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= MY ACCOUNT ================= */}
        {isParent && tab === 'account' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Your details</h2>
              <form onSubmit={saveAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Full Name</label>
                  <input name="name" defaultValue={profile?.name ?? ''} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Email Address</label>
                  <input name="email" type="email" defaultValue={profile?.email ?? ''} required className={inputClass} />
                  <p className="text-xs text-gray-500 mt-1">
                    Changing this signs you out, so you can sign back in with the new address.
                  </p>
                </div>
                <button type="submit" disabled={busy} className="w-full bg-orange-700 hover:bg-orange-800 disabled:bg-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                  {busy ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Change password</h2>
              <form onSubmit={changePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Current Password</label>
                  <input name="current_password" type="password" required className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">New Password</label>
                  <input name="new_password" type="password" required minLength={8} placeholder="At least 8 characters" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Confirm New Password</label>
                  <input name="confirm_password" type="password" required minLength={8} className={inputClass} />
                </div>
                <button type="submit" disabled={busy} className="w-full bg-orange-700 hover:bg-orange-800 disabled:bg-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                  {busy ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
