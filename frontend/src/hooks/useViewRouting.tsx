import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ViewType } from '../components/TimeRecordList';
import { useViewState } from '../contexts/ViewStateContext';

/**
 * Hook that provides navigation helpers for view routing
 * and syncs URL path to view state
 */
export const useViewRouting = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setView } = useViewState();

  // Extract view type from URL path
  const getViewFromPath = (pathname: string): ViewType | null => {
    if (pathname.includes('/records/daily')) return 'daily';
    if (pathname.includes('/records/weekly')) return 'weekly';
    if (pathname.includes('/records/monthly')) return 'monthly';
    return null;
  };

  // Sync view state from URL on path change (one-way: URL -> state)
  useEffect(() => {
    const viewFromPath = getViewFromPath(location.pathname);
    if (viewFromPath) {
      setView(viewFromPath);
    }
  }, [location.pathname, setView]);

  // Navigation helpers
  const navigateToView = useCallback((view: ViewType) => {
    const searchParams = new URLSearchParams(location.search);
    navigate(`/records/${view}${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
  }, [location.search, navigate]);

  const navigateToRecords = useCallback(() => {
    navigate('/records');
  }, [navigate]);

  return {
    navigateToView,
    navigateToRecords,
    currentPath: location.pathname,
    isRecordsPage: location.pathname.startsWith('/records')
  };
};