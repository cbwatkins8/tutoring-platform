'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Signup() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    parentName: '',
    parentEmail: '',
    parentPassword: '',
    studentName: '',
    studentGrade: '',
    studentSubjects: [],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError(''); // Clear error when user types
  };

  const handleSubjectChange = (subject: string) => {
    setFormData((prev) => ({
      ...prev,
      studentSubjects: prev.studentSubjects.includes(subject)
        ? prev.studentSubjects.filter((s) => s !== subject)
        : [...prev.studentSubjects, subject],
    }));
  };

  const handleNext = () => {
    if (step === 1 && formData.parentName && formData.parentEmail && formData.parentPassword) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create account');
        setLoading(false);
        return;
      }

      // Success! Redirect to dashboard
      alert('Account created! Redirecting to your dashboard...');
      router.push('/dashboard');
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* NAVBAR */}
      <nav className="bg-blue-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Civil Tutoring</h1>
          <a href="/" className="text-gray-200 hover:text-white">
            Back to Home
          </a>
        </div>
      </nav>

      {/* SIGNUP CONTAINER */}
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* HEADER */}
          <h2 className="text-3xl font-bold text-blue-900 mb-2">Create Account</h2>
          <p className="text-slate-600 mb-8">
            {step === 1 ? 'Tell us about yourself' : 'Tell us about your student'}
          </p>

          {/* PROGRESS INDICATOR */}
          <div className="flex gap-2 mb-8">
            <div className={`h-2 flex-1 rounded ${step >= 1 ? 'bg-teal-500' : 'bg-gray-200'}`}></div>
            <div className={`h-2 flex-1 rounded ${step >= 2 ? 'bg-teal-500' : 'bg-gray-200'}`}></div>
          </div>

          {/* ERROR MESSAGE */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit}>
            {/* STEP 1: Parent Information */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    name="parentName"
                    value={formData.parentName}
                    onChange={handleInputChange}
                    placeholder="John Smith"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="parentEmail"
                    value={formData.parentEmail}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    name="parentPassword"
                    value={formData.parentPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  />
                  <p className="text-xs text-slate-500 mt-1">At least 8 characters</p>
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors mt-6"
                >
                  Next →
                </button>
              </div>
            )}

            {/* STEP 2: Student Information */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Student Name
                  </label>
                  <input
                    type="text"
                    name="studentName"
                    value={formData.studentName}
                    onChange={handleInputChange}
                    placeholder="Emma Smith"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Grade Level
                  </label>
                  <select
                    name="studentGrade"
                    value={formData.studentGrade}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  >
                    <option value="">Select Grade</option>
                    <option value="6">6th Grade</option>
                    <option value="7">7th Grade</option>
                    <option value="8">8th Grade</option>
                    <option value="9">9th Grade</option>
                    <option value="10">10th Grade</option>
                    <option value="11">11th Grade</option>
                    <option value="12">12th Grade</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-3">
                    Subjects (Select All That Apply)
                  </label>
                  <div className="space-y-2">
                    {['Math', 'Reading/ELA', 'Science', 'Test Prep (SAT/ACT)'].map((subject) => (
                      <label key={subject} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.studentSubjects.includes(subject)}
                          onChange={() => handleSubjectChange(subject)}
                          className="w-4 h-4 text-teal-500 rounded focus:ring-teal-200"
                        />
                        <span className="ml-3 text-slate-700">{subject}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-200 text-blue-900 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                      loading
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-orange-500 text-white hover:bg-orange-600'
                    }`}
                  >
                    {loading ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* SIGN IN LINK */}
          <p className="text-center text-slate-600 mt-6">
            Already have an account?{' '}
            <a href="/login" className="text-teal-500 font-semibold hover:text-teal-600">
              Sign in
            </a>
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-blue-900 text-gray-300 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          <p>&copy; 2025 Civil Tutoring. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
