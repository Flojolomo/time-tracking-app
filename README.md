# Time Tracking App

A comprehensive time tracking web application built with React and AWS serverless architecture.

## Project Structure

```
├── frontend/           # React TypeScript frontend
├── infrastructure/     # AWS CDK infrastructure as code
├── start-dev.sh       # Unix/Linux/macOS development startup script
├── start-dev.bat      # Windows development startup script
└── README.md          # This file
```

## Prerequisites

- Node.js (compatible with npm 10.2.4)
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed globally: `npm install -g aws-cdk`

## Quick Start

### Option 1: Use Platform-Specific Scripts

**Unix/Linux/macOS:**
```bash
./start-dev.sh
```

**Windows:**
```cmd
start-dev.bat
```

### Option 2: Manual Setup

1. **Install Frontend Dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Install Infrastructure Dependencies:**
   ```bash
   cd infrastructure
   npm install
   ```

3. **Start Frontend Development Server:**
   ```bash
   cd frontend
   npm run dev
   ```

## Development Commands

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests

### Infrastructure
- `npm run synth` - Synthesize CloudFormation template
- `npm run deploy` - Deploy to AWS
- `npm run destroy` - Destroy AWS resources
- `npm run diff` - Show differences with deployed stack

## Architecture

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: AWS Lambda + API Gateway + DynamoDB
- **Authentication**: AWS Cognito
- **Hosting**: S3 + CloudFront
- **Infrastructure**: AWS CDK with TypeScript

## Features

- User authentication and registration
- Time record management (CRUD operations)
- Project management with auto-suggestions
- Multiple time views (daily, weekly, monthly)
- Statistics and analytics
- Responsive design for all devices
- Offline support

## Environment Compatibility

This project is configured to work with npm version 10.2.4 and uses compatible versions of all dependencies.

## CORS Configuration

The API Gateway is configured with proper CORS headers to support local development and production deployment.

## Next Steps

After running the setup, you can:
1. Start implementing authentication components
2. Create time record management features
3. Deploy infrastructure to AWS
4. Build and deploy the frontend

For detailed implementation, refer to the tasks in `.kiro/specs/time-tracking-app/tasks.md`.