# Components

This directory contains reusable UI components for the Time Tracking App.

## Component Categories

### Authentication Components
- `LoginForm` - User login form with validation
- `SignupForm` - User registration form with email verification
- `AuthDemo` - Demo component showcasing authentication flow
- `ConfigurationStatus` - Shows AWS configuration status
- `ProtectedRoute` - Route wrapper for authenticated access

### Time Tracking Components
- `TimeRecordForm` - Form for creating/editing time records
- `TimeRecordList` - List view for time records with different view types
- `TimerWidget` - Active timer component for real-time tracking
- `ViewSelector` - Component for switching between daily/weekly/monthly views
- `RecordFilters` - Filtering interface for time records

### Data Visualization Components
- `ProjectChart` - Charts for project time distribution
- `TimelineChart` - Timeline visualization for daily patterns
- `MetricsCards` - Key performance indicator cards

### Utility Components
- `ProjectAutocomplete` - Autocomplete input for project names
- `LoadingSpinner` - Loading indicators and overlays
- `ErrorMessage` - Error display components
- `ErrorBoundary` - Error boundary for component error handling

### Status Components
- `NetworkStatusBanner` - Network connectivity status
- `OfflineStatusBar` - Offline mode and sync status
- `NotificationContainer` - Toast notifications display

## Pages

Page-level components have been moved to the `src/pages/` directory:
- `LandingPage` - Application landing page
- `ProfilePage` - User profile management
- `StatsDashboard` - Analytics dashboard
- `TimeRecordViews` - Main time records interface
- `ForgotPasswordPage` - Password reset request
- `PasswordResetPage` - Password reset confirmation

## Usage

```tsx
import { LoginForm, TimeRecordForm, TimerWidget } from '../components';
import { LandingPage, ProfilePage } from '../pages';
```

## Testing

Component tests are located in `__tests__/` subdirectories. Page tests are in `src/pages/__tests__/`.