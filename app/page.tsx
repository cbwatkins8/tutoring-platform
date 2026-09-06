export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* NAVBAR - Navy Shell (Trust for Parents) */}
      <nav className="bg-blue-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Civil Tutoring</h1>
          <div className="space-x-4">
            <a
              href="/login"
              className="text-gray-200 hover:text-white font-medium"
            >
              Login
            </a>
            <a
              href="/signup"
              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 font-semibold transition-colors"
            >
              Sign Up
            </a>
          </div>
        </div>
      </nav>

      {/* HERO SECTION - Teal/White for Student Engagement */}
      <div className="bg-white border-b-4 border-teal-500">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h2 className="text-5xl font-bold text-blue-900 mb-4">
            Learn With Civil
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            1-on-1 Online Tutoring for Math, Reading & Science
          </p>
          <button className="bg-orange-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-orange-600 transition-colors shadow-md">
            Book a Session
          </button>
        </div>
      </div>

      {/* FEATURES SECTION - Navy Shell with Teal Accents */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center text-blue-900 mb-12">
            Why Choose Civil Tutoring?
          </h3>

          <div className="grid grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white rounded-lg shadow-md border-l-4 border-teal-500 p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4 text-teal-500">✓</div>
              <h4 className="text-lg font-bold text-blue-900 mb-2">
                Expert Tutoring
              </h4>
              <p className="text-slate-600">
                Personalized 1-on-1 sessions tailored to your learning style
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-lg shadow-md border-l-4 border-teal-500 p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4 text-green-500">📈</div>
              <h4 className="text-lg font-bold text-blue-900 mb-2">
                Track Progress
              </h4>
              <p className="text-slate-600">
                See real improvement with detailed progress reports and insights
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-lg shadow-md border-l-4 border-teal-500 p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4 text-orange-500">⏰</div>
              <h4 className="text-lg font-bold text-blue-900 mb-2">
                Flexible Scheduling
              </h4>
              <p className="text-slate-600">
                Book sessions whenever works best for your schedule
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SOCIAL PROOF SECTION - For Parents */}
      <div className="bg-blue-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold mb-8">Trusted by Families</h3>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">500+</div>
              <p className="text-gray-200">Students Tutored</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">4.8★</div>
              <p className="text-gray-200">Average Rating</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">92%</div>
              <p className="text-gray-200">Grade Improvement</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA SECTION - Orange Action */}
      <div className="bg-orange-50 py-16 border-t-4 border-orange-500">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-blue-900 mb-4">
            Ready to improve your grades?
          </h3>
          <p className="text-lg text-slate-600 mb-8">
            Start with a free consultation. No credit card required.
          </p>
          <button className="bg-orange-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-orange-600 transition-colors shadow-lg">
            Schedule a Free Consultation
          </button>
        </div>
      </div>

      {/* FOOTER - Navy Shell */}
      <footer className="bg-blue-900 text-gray-300 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold text-white mb-4">About</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white">
                    Our Story
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Our Tutors
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Follow</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white">
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Instagram
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-blue-800 pt-8 text-center text-sm">
            <p>&copy; 2025 Civil Tutoring. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
