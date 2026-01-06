import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { ViewType } from '../components/TimeRecordList';
import { TimeRecordFilters } from '../types';

// View state interface
interface ViewState {
  currentView: ViewType;
  selectedDate: Date;
  filters: TimeRecordFilters;
}

// Action types for view state management
type ViewStateAction =
  | { type: 'SET_VIEW'; payload: ViewType }
  | { type: 'SET_DATE'; payload: Date }
  | { type: 'SET_FILTERS'; payload: TimeRecordFilters }
  | { type: 'RESET_STATE' }
  | { type: 'RESTORE_STATE'; payload: ViewState };

// Initial state
const initialState: ViewState = {
  currentView: 'daily',
  selectedDate: new Date(),
  filters: {}
};

// View state reducer
const viewStateReducer = (state: ViewState, action: ViewStateAction): ViewState => {
  switch (action.type) {
    case 'SET_VIEW':
      return {
        ...state,
        currentView: action.payload
      };
    case 'SET_DATE':
      return {
        ...state,
        selectedDate: action.payload
      };
    case 'SET_FILTERS':
      return {
        ...state,
        filters: action.payload
      };
    case 'RESET_STATE':
      return initialState;
    case 'RESTORE_STATE':
      return action.payload;
    default:
      return state;
  }
};

// Context interface
interface ViewStateContextType {
  state: ViewState;
  setView: (view: ViewType) => void;
  setDate: (date: Date) => void;
  setFilters: (filters: TimeRecordFilters) => void;
  resetState: () => void;
}

// Create context
const ViewStateContext = createContext<ViewStateContextType | undefined>(undefined);

// Local storage key for persistence
const STORAGE_KEY = 'timeTracker_viewState';

// Utility functions for persistence
const saveStateToStorage = (state: ViewState): void => {
  try {
    const serializedState = {
      ...state,
      selectedDate: state.selectedDate.toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializedState));
  } catch (error) {
    console.warn('Failed to save view state to localStorage:', error);
  }
};

const loadStateFromStorage = (): ViewState | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      selectedDate: new Date(parsed.selectedDate)
    };
  } catch (error) {
    console.warn('Failed to load view state from localStorage:', error);
    return null;
  }
};

// URL state management utilities
const getStateFromURL = (): Partial<ViewState> => {
  const params = new URLSearchParams(window.location.search);
  const state: Partial<ViewState> = {};
  
  const view = params.get('view') as ViewType;
  if (view && ['daily', 'weekly', 'monthly'].includes(view)) {
    state.currentView = view;
  }
  
  const date = params.get('date');
  if (date) {
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      state.selectedDate = parsedDate;
    }
  }
  
  const project = params.get('project');
  if (project) {
    state.filters = { ...state.filters, projectName: project };
  }
  
  const tags = params.get('tags');
  if (tags) {
    state.filters = { ...state.filters, tags: tags.split(',') };
  }
  
  return state;
};

const updateURL = (state: ViewState): void => {
  const params = new URLSearchParams();
  
  // Add view type
  params.set('view', state.currentView);
  
  // Add selected date
  params.set('date', state.selectedDate.toISOString().split('T')[0]);
  
  // Add filters
  if (state.filters.projectName) {
    params.set('project', state.filters.projectName);
  }
  
  if (state.filters.tags && state.filters.tags.length > 0) {
    params.set('tags', state.filters.tags.join(','));
  }
  
  // Update URL without triggering navigation
  const newURL = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', newURL);
};

// Provider component
interface ViewStateProviderProps {
  children: React.ReactNode;
}

export const ViewStateProvider: React.FC<ViewStateProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(viewStateReducer, initialState);

  // Initialize state from URL and localStorage on mount
  useEffect(() => {
    // First try to get state from URL (highest priority)
    const urlState = getStateFromURL();
    
    // Then try to get state from localStorage
    const storedState = loadStateFromStorage();
    
    // Merge states with URL taking precedence
    const mergedState: ViewState = {
      ...initialState,
      ...storedState,
      ...urlState
    };
    
    // Only restore if different from initial state
    if (JSON.stringify(mergedState) !== JSON.stringify(initialState)) {
      dispatch({ type: 'RESTORE_STATE', payload: mergedState });
    }
  }, []);

  // Update URL and localStorage when state changes
  useEffect(() => {
    updateURL(state);
    saveStateToStorage(state);
  }, [state]);

  // Action creators
  const setView = useCallback((view: ViewType) => {
    dispatch({ type: 'SET_VIEW', payload: view });
  }, []);

  const setDate = useCallback((date: Date) => {
    dispatch({ type: 'SET_DATE', payload: date });
  }, []);

  const setFilters = useCallback((filters: TimeRecordFilters) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  const contextValue: ViewStateContextType = {
    state,
    setView,
    setDate,
    setFilters,
    resetState
  };

  return (
    <ViewStateContext.Provider value={contextValue}>
      {children}
    </ViewStateContext.Provider>
  );
};

// Custom hook to use view state context
export const useViewState = (): ViewStateContextType => {
  const context = useContext(ViewStateContext);
  if (context === undefined) {
    throw new Error('useViewState must be used within a ViewStateProvider');
  }
  return context;
};

// Hook for URL-based navigation
export const useViewNavigation = () => {
  const { setView, setDate, setFilters } = useViewState();

  const navigateToView = useCallback((view: ViewType, date?: Date, filters?: TimeRecordFilters) => {
    setView(view);
    if (date) setDate(date);
    if (filters) setFilters(filters);
  }, [setView, setDate, setFilters]);

  const navigateToDate = useCallback((date: Date) => {
    setDate(date);
  }, [setDate]);

  const navigateWithFilters = useCallback((filters: TimeRecordFilters) => {
    setFilters(filters);
  }, [setFilters]);

  return {
    navigateToView,
    navigateToDate,
    navigateWithFilters
  };
};