---
inclusion: always
---

# Time Tracking Application Development Guidelines

## Project Architecture

This is a full-stack serverless time tracking application:
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS in `/frontend`
- **Backend**: AWS CDK v2 + Lambda functions + DynamoDB in `/infrastructure`
- **Authentication**: AWS Cognito with JWT tokens
- **Deployment**: Independent frontend/infrastructure deployments

## Critical Development Rules

### TypeScript Requirements
- ALL code must be TypeScript with strict mode enabled
- Use explicit return types for functions
- Return early to ensure readable code
- Define classes or components where it makes sense to have maintainable code
- Avoid `any` type - use proper interfaces and types
- Import types with `import type` syntax when possible

### File Organization Patterns
- Components: `/frontend/src/components/ComponentName.tsx`
- Hooks: `/frontend/src/hooks/useHookName.tsx`
- Services: `/frontend/src/utils/serviceName.ts`
- Types: `/frontend/src/types/index.ts` (use barrel exports)
- Lambda functions: `/infrastructure/lambda/functionName/src/index.ts`

### React Component Standards
- Use functional components with hooks only
- PascalCase for component names and files
- Export components as default exports
- Use React.memo() for performance-critical components
- Implement proper error boundaries for all major sections

### State Management Rules
- Use React Context for global state (auth, notifications, view state)
- Use local useState for component-specific state
- Avoid prop drilling - use context when passing data 3+ levels deep
- Keep state as close to where it's used as possible

### AWS Infrastructure Patterns
- Each Lambda function must have its own directory with package.json
- Use CDK constructs for reusable infrastructure patterns
- Model all environments in CDK
- Different environments should consider respective configuration, especially for CORS
- Follow CDK best practices
- Ensure lcost efficient 
- All API endpoints must use API Gateway with proper CORS
- Implement least-privilege IAM roles for all resources
- Use environment variables for configuration, not hardcoded values

### API Design Standards
- RESTful endpoints: GET /api/timeRecords, POST /api/timeRecords, etc.
- Always return proper HTTP status codes (200, 201, 400, 401, 404, 500)
- Use consistent error response format: `{ error: string, details?: any }`
- All protected endpoints require Authorization header with Cognito JWT
- Implement request validation in Lambda functions

### Error Handling Requirements
- Frontend: Use ErrorBoundary components to catch React errors
- Backend: Always catch and log errors in Lambda functions
- User-facing errors must be human-readable, not technical
- Log all errors with context (user ID, request ID, timestamp)
- Never expose internal error details to frontend

### Performance & Offline Guidelines
- Implement service worker for offline functionality
- Use React.lazy() for code splitting on route level
- Cache API responses in localStorage for offline access
- Implement optimistic updates for better UX
- Use Tailwind CSS utility classes, avoid custom CSS when possible

### Testing Approach
- Focus testing on business logic and critical user flows
- Test custom hooks and utility functions thoroughly
- Avoid over-testing UI components - focus on behavior, not implementation
- Use Jest + React Testing Library for frontend tests
- Mock AWS services in Lambda function tests

### Development Commands
- Frontend dev server: `cd frontend && npm run dev`
- Build frontend: `cd frontend && npm run build`
- Deploy infrastructure: `cd infrastructure && npm run deploy`
- Run tests: `cd frontend && npm test`

### Security Requirements
- All user data must be associated with authenticated Cognito user
- Validate all inputs on both frontend and backend
- Use HTTPS only - no HTTP endpoints
- Implement proper CORS configuration
- Never log sensitive data (passwords, tokens, PII)
