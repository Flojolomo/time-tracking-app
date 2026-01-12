import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from '../components/Menu';

export const LandingPage: React.FC<{ children: React.ReactNode; }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobileMenuOpen]);

  const menuIcon = !isMobileMenuOpen ? (
        <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ) : (
        <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )

  const menuButton = <button
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
      aria-expanded="false"
    >
      <span className="sr-only">Open main menu</span>
      {menuIcon}
    </button>

  const headerBar = <div className="relative pt-2 px-4 sm:px-6 lg:px-4">
              <nav className="relative flex items-center justify-between h-8" aria-label="Global">
                <div className="flex items-center">
                  <h1 
                    className="text-2xl font-bold text-indigo-600 cursor-pointer hover:text-indigo-700 transition-colors"
                    onClick={() => navigate('/')}
                  >
                    TimeTracker
                  </h1>
                </div>
                <div className="flex items-center">
                  {menuButton}
                </div>
              </nav>
            </div>

  const footer = <footer className="bg-white">
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

  
  
  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-4 bg-gradient-to-br from-blue-50 to-indigo-100 w-full">
            {headerBar}
            {isMobileMenuOpen && <Menu setIsMobileMenuOpen={setIsMobileMenuOpen}/> }
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 py-6 overflow-auto">
        {children}
      </div>
      {footer}
    </div>
  );
};