import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="bg-slate-900 text-gray-400">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="text-white text-lg font-bold mb-3">Civil Tutoring</div>
            <p className="text-sm leading-relaxed">
              Private, referral-based middle school math support, online.
            </p>
          </div>

          <div>
            <div className="text-white font-semibold mb-3 text-sm">Explore</div>
            <ul className="space-y-2 text-sm">
              <li><Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link href="/#subjects" className="hover:text-white transition-colors">Subjects</Link></li>
              <li><Link href="/#about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-white font-semibold mb-3 text-sm">Families</div>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
              <li><Link href="/signup" className="hover:text-white transition-colors">Create an account</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Get help</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-sm">
          <p>&copy; {new Date().getFullYear()} Civil Tutoring. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
