# AWS Cognito User Pool Configuration

## Overview
This document describes the AWS Cognito User Pool configuration for the Time Tracking application.

## Configuration Details

### User Pool Settings
- **Name**: TimeTrackingUsers
- **Sign-in Method**: Email address
- **Self Sign-up**: Enabled
- **Email Verification**: Required and automatic
- **Case Sensitivity**: Disabled for usernames

### Password Policy
- **Minimum Length**: 8 characters
- **Requirements**: 
  - Lowercase letters: Required
  - Uppercase letters: Required
  - Numbers: Required
  - Symbols: Not required

### User Attributes
**Standard Attributes:**
- Email (required, mutable)
- Given Name (optional, mutable)
- Family Name (optional, mutable)

**Custom Attributes:**
- `timezone`: User's timezone preference (1-50 characters)
- `preferences`: User application preferences (1-1000 characters)

### OAuth Configuration
**Supported Flows:**
- Authorization Code Grant: Enabled
- Implicit Grant: Disabled (for security)

**OAuth Scopes:**
- `email`: Access to user's email
- `openid`: OpenID Connect
- `profile`: Access to user profile information

**Callback URLs:**
- Local Development: `http://localhost:5173/auth/callback`
- Production: `https://{account}.execute-api.{region}.amazonaws.com/prod/auth/callback`

**Logout URLs:**
- Local Development: `http://localhost:5173/`
- Production: `https://{account}.execute-api.{region}.amazonaws.com/prod/`

### Authentication Flows
- **Admin User Password**: Enabled
- **User Password**: Enabled
- **User SRP**: Enabled (Secure Remote Password)
- **Custom**: Enabled

### Token Configuration
- **Refresh Token Validity**: 30 days
- **Access Token Validity**: 1 hour
- **ID Token Validity**: 1 hour
- **Token Revocation**: Enabled

### Security Features
- **Prevent User Existence Errors**: Enabled
- **Account Recovery**: Email only
- **User Verification**: Email with custom messages

### Email Templates
**Verification Email:**
- Subject: "Time Tracker - Verify your email"
- Body: Welcome message with verification link

**Invitation Email:**
- Subject: "Welcome to Time Tracker"
- Body: Welcome message with temporary credentials

### User Pool Domain
- **Domain Prefix**: `time-tracking-{account}-{region}`
- **Purpose**: Enables hosted UI and OAuth flows

## Environment Variables
The following environment variables are available to Lambda functions:
- `USER_POOL_ID`: Cognito User Pool ID
- `USER_POOL_CLIENT_ID`: User Pool Client ID
- `USER_POOL_DOMAIN`: User Pool Domain name
- `REGION`: AWS Region

## CloudFormation Outputs
- `UserPoolId`: The Cognito User Pool ID
- `UserPoolClientId`: The User Pool Client ID
- `UserPoolDomain`: The User Pool Domain name
- `UserPoolRegion`: The AWS Region

## Requirements Satisfied
- ✅ **Requirement 1.3**: Authentication system provides login and registration functionality
- ✅ **Requirement 1.4**: User authentication with redirect to main application interface
- ✅ **Email Verification**: Automatic email verification for new users
- ✅ **OAuth Settings**: Proper OAuth configuration for web application
- ✅ **User Attributes**: Standard and custom attributes for user preferences

## Next Steps
1. Deploy the infrastructure using `cdk deploy`
2. Implement frontend authentication components using the Cognito configuration
3. Test the authentication flow with the configured OAuth settings