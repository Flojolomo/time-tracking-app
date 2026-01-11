import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const LandingPage: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  
  // No data requests on landing page - keep it lightweight
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-gradient-to-br from-blue-50 to-indigo-100 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <svg
              className="hidden lg:block absolute right-0 inset-y-0 h-full w-48 text-blue-50 transform translate-x-1/2"
              fill="currentColor"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <polygon points="50,0 100,0 50,100 0,100" />
            </svg>

            <div className="relative pt-6 px-4 sm:px-6 lg:px-8">
              <nav className="relative flex items-center justify-between sm:h-10" aria-label="Global">
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-indigo-600">TimeTracker</h1>
                </div>
                
                {/* Menu button on the right */}
                <div>
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                    aria-expanded="false"
                  >
                    <span className="sr-only">Open main menu</span>
                    {!isMobileMenuOpen ? (
                      <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    ) : (
                      <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                </div>
              </nav>

              {/* Menu dropdown positioned on the right */}
              {isMobileMenuOpen && (
                <div className="absolute right-0 top-16 z-50">
                  <div className="px-2 pt-2 pb-3 space-y-1 bg-white rounded-lg shadow-lg border border-gray-200 min-w-48">
                    {!isAuthenticated ? (
                      <>
                        <Link
                          to="/login"
                          className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Log in
                        </Link>
                        <Link
                          to="/signup"
                          className="text-indigo-600 hover:text-indigo-500 block px-3 py-2 rounded-md text-base font-medium transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Sign up
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/active-timer"
                          className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Active Timer
                        </Link>
                        <Link
                          to="/records"
                          className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Time Records
                        </Link>
                        <Link
                          to="/analytics"
                          className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Analytics
                        </Link>
                        <Link
                          to="/profile"
                          className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Profile
                        </Link>
                        <div className="border-t border-gray-200 pt-2 mt-2">
                          <div className="px-3 py-1 text-sm text-gray-500">{user?.email}</div>
                          <button
                            onClick={() => {
                              logout();
                              setIsMobileMenuOpen(false);
                            }}
                            className="text-red-600 hover:text-red-700 block px-3 py-2 rounded-md text-base font-medium transition-colors w-full text-left"
                          >
                            Sign out
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Track your time,</span>{' '}
                  <span className="block text-indigo-600 xl:inline">boost productivity</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Simple, powerful time tracking for professionals. Monitor your projects, analyze your productivity, 
                  and make data-driven decisions about how you spend your time.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <Link
                      to="/signup"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10 transition-colors"
                    >
                      Get started free
                    </Link>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <button
                      onClick={() => {
                        const demoSection = document.getElementById('demo-section');
                        demoSection?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 md:py-4 md:text-lg md:px-10 transition-colors"
                    >
                      View demo
                    </button>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="h-56 w-full bg-gradient-to-r from-indigo-500 to-purple-600 sm:h-72 md:h-96 lg:w-full lg:h-full flex items-center justify-center">
            <div className="text-white text-center">
              <div className="w-32 h-32 mx-auto mb-4 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-lg font-medium">Visual Time Tracking</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to track time effectively
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Powerful features designed to help you understand and optimize how you spend your time.
            </p>
          </div>

          <div className="mt-10">
            <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Smart Time Tracking</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Easily log time with start/end times, project categorization, and detailed comments. 
                  Auto-suggestions help you maintain consistency across projects.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Multiple Views</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  View your time records in daily, weekly, or monthly formats. 
                  Switch between views while maintaining your selected date ranges and context.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Analytics & Insights</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Get detailed statistics on time spent per project and tag. 
                  Visual charts help you understand your productivity patterns and optimize your workflow.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Mobile Responsive</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Track time on any device. Our responsive design ensures full functionality 
                  across desktop, tablet, and mobile devices with touch-friendly interfaces.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Demo Section */}
      <div id="demo-section" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Demo</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              See TimeTracker in action
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Explore the interface and features with sample data to understand how TimeTracker can help you.
            </p>
          </div>

          <div className="mt-10">
            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Sample Time Record */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-900">Web Development</h3>
                      <span className="text-sm text-gray-500">2.5 hours</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">9:00 AM - 11:30 AM</p>
                    <p className="text-xs text-gray-500">Frontend component development</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        React
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Frontend
                      </span>
                    </div>
                  </div>

                  {/* Sample Time Record */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-900">Client Meeting</h3>
                      <span className="text-sm text-gray-500">1.0 hour</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">2:00 PM - 3:00 PM</p>
                    <p className="text-xs text-gray-500">Project requirements discussion</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        Meeting
                      </span>
                    </div>
                  </div>

                  {/* Sample Time Record */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-900">Documentation</h3>
                      <span className="text-sm text-gray-500">1.5 hours</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">3:30 PM - 5:00 PM</p>
                    <p className="text-xs text-gray-500">API documentation update</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Documentation
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        API
                      </span>
                    </div>
                  </div>
                </div>

                {/* Demo Statistics */}
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Today's Summary</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="bg-indigo-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-indigo-600">5.0</div>
                      <div className="text-sm text-gray-600">Total Hours</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">3</div>
                      <div className="text-sm text-gray-600">Projects</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">6</div>
                      <div className="text-sm text-gray-600">Tasks</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/signup"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Start tracking your time
              <svg className="ml-2 -mr-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <p className="text-center text-sm text-gray-400">
              &copy; 2024 TimeTracker. Built with simplicity in mind.
            </p>
          </div>
          <div className="mt-8 md:mt-0 md:order-1">
            <p className="text-center text-base text-gray-400">
              Track time. Boost productivity. Make better decisions.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};