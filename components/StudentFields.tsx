'use client';

import { GRADE_OPTIONS, SUBJECT_OPTIONS } from '@/lib/student-options';

export { GRADE_OPTIONS, SUBJECT_OPTIONS } from '@/lib/student-options';

// The student name / grade / subjects fields, used by BOTH the signup flow and
// the "Add a student" form on the profile page.
//
// These were written twice and drifted apart -- one had subject checkboxes and
// grades 6-12, the other a free-text subjects box and grades 1-12. Sharing one
// component means they cannot diverge again.

export const inputClass =
  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';

export interface StudentFieldsValue {
  firstName: string;
  lastName: string;
  grade: string;
  subjects: string[];
}

export const emptyStudent = (): StudentFieldsValue => ({
  firstName: '',
  lastName: '',
  grade: '9',
  subjects: [],
});

interface Props {
  value: StudentFieldsValue;
  onChange: (next: StudentFieldsValue) => void;
  /** Keeps DOM ids unique if two of these ever render on one page. */
  idPrefix?: string;
}

export default function StudentFields({ value, onChange, idPrefix = 'student' }: Props) {
  const set = <K extends keyof StudentFieldsValue>(
    key: K,
    next: StudentFieldsValue[K]
  ) => onChange({ ...value, [key]: next });

  const toggleSubject = (subject: string) =>
    set(
      'subjects',
      value.subjects.includes(subject)
        ? value.subjects.filter((s) => s !== subject)
        : [...value.subjects, subject]
    );

  return (
    <>
      <div>
        <label
          htmlFor={`${idPrefix}-firstName`}
          className="block text-sm font-medium text-slate-900 mb-2"
        >
          First Name
        </label>
        <input
          id={`${idPrefix}-firstName`}
          type="text"
          value={value.firstName}
          onChange={(e) => set('firstName', e.target.value)}
          placeholder="Emma"
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-lastName`}
          className="block text-sm font-medium text-slate-900 mb-2"
        >
          Last Name
        </label>
        <input
          id={`${idPrefix}-lastName`}
          type="text"
          value={value.lastName}
          onChange={(e) => set('lastName', e.target.value)}
          placeholder="Smith"
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-grade`}
          className="block text-sm font-medium text-slate-900 mb-2"
        >
          Grade Level
        </label>
        <select
          id={`${idPrefix}-grade`}
          value={value.grade}
          onChange={(e) => set('grade', e.target.value)}
          className={inputClass}
        >
          {GRADE_OPTIONS.map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
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
                checked={value.subjects.includes(subject)}
                onChange={() => toggleSubject(subject)}
                className="w-4 h-4 text-teal-500 rounded focus:ring-teal-500"
              />
              <span className="ml-2 text-gray-700">{subject}</span>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
