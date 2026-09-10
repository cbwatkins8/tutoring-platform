'use client';

// Public-site navigation. Flat menu, no dropdowns -- a solo practice does not
// have the service lines or team pages that justify a mega-menu.
//
// Auth-aware: shows Login / Sign Up to visitors, Dashboard / Logout once a
// parent, student or tutor is signed in.

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { refreshCurrentUser, logout, type AuthToken } from '@/lib/auth';
import BrandLogo from '@/components/BrandLogo';

type PublicFeatures = { client_portal: boolean; online_booking: boolean };

const LINKS = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/#standards', label: 'Standards Approach' },
  { href: '/#subjects', label: 'Subjects' },
  { href: '/#about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function SiteNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthToken | null>(null);
  const [open, setOpen] = useState(false);
  const [features, setFeatures] = useState<PublicFeatures>({ client_portal: false, online_booking: false });

  useEffect(() => {
    let active = true;
    Promise.all([
      refreshCurrentUser(),
      fetch('/api/site-features', { cache: 'no-store' }).then((response) => response.json()).catch(() => null),
    ]).then(([current, settings]) => {
      if (!active) return;
      setUser(current);
      if (settings?.features) setFeatures(settings.features);
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setOpen(false);
    router.push('/');
  };

  const dashboardHref = user?.role === 'admin' ? '/admin' : user?.role === 'tutor' ? '/tutor-dashboard' : '/dashboard';
  const staff = user?.role === 'tutor' || user?.role === 'admin';
  const canUsePortal = features.client_portal || staff;
  const showAccountArea = Boolean(user) || features.client_portal;

  return (
    <nav className="bg-slate-900 text-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold flex-shrink-0" aria-label="Take Two Tutoring home">
            <BrandLogo />
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-6">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-gray-200 hover:text-white transition-colors text-sm"
              >
                {l.label}
              </Link>
            ))}

            {showAccountArea && <span className="w-px h-5 bg-slate-700" aria-hidden="true" />}

            {user && canUsePortal ? (
              <>
                <Link href={dashboardHref} className="text-gray-200 hover:text-white transition-colors text-sm">
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Logout
                </button>
              </>
            ) : !user && features.client_portal ? (
              <>
                <Link href="/login" className="text-gray-200 hover:text-white transition-colors text-sm">
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Sign Up
                </Link>
              </>
            ) : user ? (
              <button onClick={handleLogout} className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">Logout</button>
            ) : null}
          </div>

          {/* Mobile toggle -- 44px target so it is comfortable to tap */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 -mr-2 text-white"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden border-t border-slate-700 py-4 space-y-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-2 py-3 text-gray-200 hover:text-white transition-colors"
              >
                {l.label}
              </Link>
            ))}

            {showAccountArea && <div className="pt-3 mt-3 border-t border-slate-700 space-y-2">
              {user && canUsePortal ? (
                <>
                  <Link
                    href={dashboardHref}
                    onClick={() => setOpen(false)}
                    className="block px-2 py-3 text-gray-200 hover:text-white"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full bg-orange-500 hover:bg-orange-600 px-4 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : !user && features.client_portal ? (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="block px-2 py-3 text-gray-200 hover:text-white"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="block text-center bg-orange-500 hover:bg-orange-600 px-4 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              ) : user ? (
                <button onClick={handleLogout} className="w-full bg-orange-500 hover:bg-orange-600 px-4 py-3 rounded-lg font-semibold transition-colors">Logout</button>
              ) : null}
            </div>}
          </div>
        )}
      </div>
    </nav>
  );
}
