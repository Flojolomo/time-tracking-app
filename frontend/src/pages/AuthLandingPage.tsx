import React from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthLandingPage: React.FC<{ children: React.ReactNode; showBackButton?: boolean; }> = ({ 
  children, 
  showBackButton = true 
}) => {
  const navigate = useNavigate();

  const headerBar = (
    <div className="relative pt-2 px-4 sm:px-6 lg:px-4">
      <nav className="relative flex items-center justify-between h-8" aria-label="Global">
        <div className="flex items-center">
          <h1 
            className="text-2xl font-bold text-indigo-600 cursor-pointer hover:text-indigo-700 transition-colors"
            onClick={() => navigate('/')}
          >
            TimeTracker
          </h1>
        </div>
        {showBackButton && (
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          </div>
        )}
      </nav>
    </div>
  );

  const footer = (
    <footer className="bg-white">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 text-center lg:px-8">
        <p className="text-sm text-gray-400">
          &copy; 2024 TimeTracker. Built with simplicity in mind.
        </p>
      </div>
    </footer>
  );

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-4 bg-gradient-to-br from-blue-50 to-indigo-100 w-full">
            {headerBar}
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 overflow-auto flex items-center justify-center">
        {children}
      </div>
      {footer}
    </div>
  );
};