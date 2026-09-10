'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import { refreshCurrentUser, setCurrentUser } from '@/lib/auth';
import StudentFields, {
  emptyStudent,
  inputClass,
  type StudentFieldsValue,
} from '@/components/StudentFields';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [student, setStudent] = useState<StudentFieldsValue>(emptyStudent());

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshCurrentUser().then((user) => {
      if (user) router.replace(user.role === 'tutor' ? '/tutor-dashboard' : '/dashboard');
    });
  }, [router]);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!parentName || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!student.firstName || !student.lastName || student.subjects.length === 0) {
      setError('Please fill in all student fields and select at least one subject');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_name: parentName,
          email,
          password,
          student_first_name: student.firstName,
          student_last_name: student.lastName,
          grade_level: student.grade,
          subjects: student.subjects.join(', '),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Signup failed');
        setLoading(false);
        return;
      }

      setCurrentUser({ userId: data.userId, email: data.email, role: data.role });
      router.push('/dashboard');
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="text-xl font-bold" aria-label="Take Two Tutoring home">
            <BrandLogo />
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step === 1 ? 'bg-teal-500 text-white' : 'bg-green-500 text-white'
                }`}
              >
                {step === 1 ? '1' : '✓'}
              </div>
              <div
                className={`flex-1 h-1 mx-2 ${step === 2 ? 'bg-teal-500' : 'bg-gray-300'}`}
              ></div>
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step === 2 ? 'bg-teal-500 text-white' : 'bg-gray-300 text-white'
                }`}
              >
                2
              </div>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Parent Info</span>
              <span>Student Info</span>
            </div>
          </div>

          {step === 1 && (
            <>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h1>
              <p className="text-gray-600 mb-8">Enter your parent information</p>

              <form onSubmit={handleStep1Submit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-900 mb-2">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="John Smith"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-900 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-900 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>

                {error && (
                  <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-orange-700 hover:bg-orange-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Next Step
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Student Information</h1>
              <p className="text-gray-600 mb-8">Tell us about your student</p>

              <form onSubmit={handleStep2Submit} className="space-y-4">
                <StudentFields value={student} onChange={setStudent} idPrefix="signup" />

                {error && (
                  <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError('');
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-orange-700 hover:bg-orange-800 disabled:bg-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-teal-600 hover:text-teal-700 font-semibold">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
