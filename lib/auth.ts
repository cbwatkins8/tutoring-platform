'use client';

export interface AuthToken {
  userId: number;
  email: string;
  role: 'parent' | 'tutor' | 'admin' | 'student';
}

const STORAGE_KEY = 'civilUser';
const ROLES = new Set<AuthToken['role']>(['parent', 'tutor', 'admin', 'student']);

function validUser(value: unknown): value is AuthToken {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AuthToken>;
  return (
    typeof candidate.userId === 'number' &&
    typeof candidate.email === 'string' &&
    typeof candidate.role === 'string' &&
    ROLES.has(candidate.role as AuthToken['role'])
  );
}

export function getCurrentUser(): AuthToken | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!validUser(parsed)) {
      clearLocalUser();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: AuthToken): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Authentication still works through the httpOnly cookie.
  }
}

export async function refreshCurrentUser(): Promise<AuthToken | null> {
  try {
    const response = await fetch('/api/auth/session', { cache: 'no-store' });
    if (!response.ok) {
      clearLocalUser();
      return null;
    }
    const data: unknown = await response.json();
    const user = (data as { user?: unknown }).user;
    if (!validUser(user)) {
      clearLocalUser();
      return null;
    }
    setCurrentUser(user);
    return user;
  } catch {
    return getCurrentUser();
  }
}

function clearLocalUser(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('authToken');
  } catch {
    // Nothing else to clear.
  }
}

export async function logout(): Promise<void> {
  clearLocalUser();
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch {
    // The local identity is cleared even if the network is unavailable.
  }
}
