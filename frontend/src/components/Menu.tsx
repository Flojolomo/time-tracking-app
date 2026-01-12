import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const Menu: React.FC<{ setIsMobileMenuOpen: (isOpen: boolean) => void }> = ({ setIsMobileMenuOpen }) => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      setIsMobileMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate to home even if logout fails
      navigate('/');
    }
  };

  const anonymousMenu = <>
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

  const authenticatedMenu = <>
        <div className="px-3 py-1 text-sm text-gray-500">Hello {user?.name || user?.email || 'User'}</div>

        <div className="border-t border-gray-200 pt-2 mt-2">
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
        </div>
        <div className="border-t border-gray-200 pt-2 mt-2">
             <Link
            to="/profile"
            className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
            >
                Profile
            </Link>
            <button
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700 block px-3 py-2 rounded-md text-base font-medium transition-colors w-full text-left"
            >
            Sign out
            </button>
        </div>
    </>

  return (
    <div className="fixed right-4 top-20 z-[9999]">
      <div className="px-2 pt-2 pb-3 space-y-1 bg-white rounded-lg shadow-lg border border-gray-200 min-w-48">
        {isAuthenticated ? authenticatedMenu : anonymousMenu}
      </div>
    </div>
  );
};