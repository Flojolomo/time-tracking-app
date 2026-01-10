# Pages

This directory contains page-level components for the Time Tracking App. These are top-level route components that represent complete application screens.

## Page Components

### LandingPage
The main landing page with marketing content and navigation to authentication.

**Features:**
- Hero section with app description
- Feature highlights
- Demo section with sample data
- Responsive navigation
- Call-to-action buttons

### ProfilePage
User profile management page for authenticated users.

**Features:**
- Profile information editing
- Password change functionality
- Password reset via email
- Account deletion (danger zone)
- Tabbed interface for different settings

### StatsDashboard
Analytics dashboard showing time tracking statistics and visualizations.

**Features:**
- Key metrics cards
- Project time distribution charts
- Daily timeline visualization
- Date range selection (week/month/quarter)
- Project breakdown table

### TimeRecordViews
Main interface for viewing and managing time records.

**Features:**
- Multiple view types (daily/weekly/monthly)
- Time record filtering
- Add/edit time record forms
- Date navigation
- Integration with timer widget

### ForgotPasswordPage
Password reset request page for users who forgot their password.

**Features:**
- Email input for reset request
- Verification code entry
- New password form
- Multi-step flow
- Error handling for various scenarios

### PasswordResetPage
Password reset confirmation page accessed via email links.

**Features:**
- Token and email validation
- New password form with confirmation
- Password strength requirements
- Success/error handling
- Automatic redirect to login

## Usage

```tsx
import { LandingPage, ProfilePage, StatsDashboard } from '../pages';

// In routing configuration
<Route path="/" element={<LandingPage />} />
<Route path="/profile" element={<ProfilePage />} />
<Route path="/analytics" element={<StatsDashboard />} />
```

## Structure

Pages are organized as:
- Each page is a self-contained component
- Pages import components from `../components`
- Pages handle routing-level concerns
- Pages integrate multiple components into complete screens

## Testing

Page tests are located in the `__tests__/` subdirectory and focus on:
- Page rendering and navigation
- Integration between components
- User workflows and interactions
- Authentication and authorization flows