# Architecture Cleanup: CDK-Only Approach

## Overview

This document summarizes the cleanup performed to remove the unused AWS Amplify Gen 2 directory and focus exclusively on the AWS CDK approach for infrastructure management.

## Changes Made

### 1. Removed Amplify Directory
- **Deleted**: `amplify/` directory and all its contents
- **Reason**: The project was using AWS CDK for infrastructure, making the Amplify Gen 2 definitions redundant

### 2. Updated Root Configuration
- **File**: `package.json`
- **Changes**:
  - Removed Amplify CLI scripts (`build`, `sandbox`, `deploy`, `generate`)
  - Removed `@aws-amplify/backend-cli` dependency
  - Added simplified scripts for development and deployment
  - Set main deploy script to use `./deploy.sh`

### 3. Refactored API Client
- **Renamed**: `frontend/src/utils/amplifyClient.ts` → `frontend/src/utils/apiClient.ts`
- **Changes**:
  - Removed Amplify GraphQL client dependencies
  - Added REST API utility functions
  - Updated function names (`formatDateForDB` → `formatDateForAPI`)
  - Added functions for API base URL and authentication headers

### 4. Updated Service Layer
- **Files**: `timeRecordService.ts`, `projectService.ts`
- **Changes**:
  - Replaced Amplify GraphQL calls with REST API calls
  - Updated to use `fetch()` for HTTP requests
  - Added proper error handling for HTTP responses
  - Updated import statements to use new `apiClient`

### 5. Updated Tests
- **File**: `frontend/src/utils/__tests__/dataAccessLayer.test.ts`
- **Changes**:
  - Updated import statements
  - Fixed function name references
  - Maintained test coverage for utility functions

### 6. Updated Exports
- **File**: `frontend/src/utils/index.ts`
- **Changes**: Updated to export from `apiClient` instead of `amplifyClient`

## Current Architecture

### Infrastructure
- **AWS CDK** (TypeScript) in `infrastructure/` directory
- **Manual deployment** via CDK commands
- **Configuration generation** via CDK outputs to `amplify_outputs.json`

### Frontend
- **React + TypeScript** with Vite
- **REST API integration** using native `fetch()`
- **AWS Cognito authentication** via `aws-amplify/auth`
- **Static hosting** on S3 with CloudFront CDN

### API Layer
- **API Gateway** + **Lambda** functions
- **DynamoDB** for data persistence
- **REST endpoints** for CRUD operations
- **JWT authentication** via Cognito User Pool

## Benefits of This Approach

1. **Simplified Architecture**: Single infrastructure management approach
2. **More Control**: Direct control over AWS resources via CDK
3. **Clearer Separation**: Infrastructure and frontend are clearly separated
4. **Reduced Complexity**: No confusion between Amplify and CDK approaches
5. **Better Maintainability**: Single source of truth for infrastructure

## Deployment Workflow

```bash
# Deploy infrastructure
cd infrastructure
npm run deploy

# Update frontend configuration
node ../update-amplify-config.js

# Build and deploy frontend
cd ../frontend
npm run build
# Upload dist/ to S3 bucket (handled by CDK)
```

## Files Affected

### Removed
- `amplify/` (entire directory)

### Modified
- `package.json` (root)
- `frontend/src/utils/apiClient.ts` (renamed from amplifyClient.ts)
- `frontend/src/utils/timeRecordService.ts`
- `frontend/src/utils/projectService.ts`
- `frontend/src/utils/__tests__/dataAccessLayer.test.ts`
- `frontend/src/utils/index.ts`

### Unchanged
- All infrastructure code in `infrastructure/`
- All React components and UI code
- Authentication system (still uses AWS Cognito)
- Deployment scripts (`deploy.sh`, `update-amplify-config.js`)

## Next Steps

The project now follows a clean, single-approach architecture using AWS CDK for infrastructure management and REST APIs for data access. Future development should continue with this pattern:

1. **Infrastructure changes**: Use CDK in `infrastructure/` directory
2. **API changes**: Update Lambda functions and API Gateway routes
3. **Frontend changes**: Use REST API calls via the `apiClient` utilities
4. **Deployment**: Use the existing CDK-based deployment workflow

This cleanup eliminates architectural confusion and provides a solid foundation for continued development.