import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ViewType } from '../components/TimeRecordList';
import { useViewState } from '../contexts/ViewStateContext';

/**
 * Hook that synchronizes view state with URL routing
 * Handles URL-based navigation for different view types
 */
export const useViewRouting = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, setView } = useViewState();

  // Extract view type from URL path
  const getViewFromPath = (pathname: string): ViewType | null => {
    if (pathname.includes('/records/daily')) return 'daily';
    if (pathname.includes('/records/weekly')) return 'weekly';
    if (pathname.includes('/records/monthly')) return 'monthly';
    return null;
  };

  // Update view state when URL changes
  useEffect(() => {
    const viewFromPath = getViewFromPath(location.pathname);
    if (viewFromPath && viewFromPath !== state.currentView) {
      setView(viewFromPath);
    }
  }, [location.pathname, state.currentView, setView]);

  // Update URL when view state changes (but only if we're on a records page)
  useEffect(() => {
    if (location.pathname.startsWith('/records')) {
      const expectedPath = `/records/${state.currentView}`;
      if (location.pathname !== expectedPath) {
        // Preserve query parameters when changing view
        const searchParams = new URLSearchParams(location.search);
        const newPath = `${expectedPath}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
        navigate(newPath, { replace: true });
      }
    }
  }, [state.currentView, location.pathname, location.search, navigate]);

  // Navigation helpers
  const navigateToView = (view: ViewType) => {
    const searchParams = new URLSearchParams(location.search);
    navigate(`/records/${view}${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
  };

  const navigateToRecords = () => {
    navigate('/records');
  };

  return {
    navigateToView,
    navigateToRecords,
    currentPath: location.pathname,
    isRecordsPage: location.pathname.startsWith('/records')
  };
};