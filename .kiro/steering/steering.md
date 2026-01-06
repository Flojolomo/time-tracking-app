---
inclusion: always
---

# Project Development Guidelines

## Architecture & Design Principles

- **Simplicity First**: Prioritize simple, maintainable designs over complex solutions
- **Object-Oriented Programming**: Use OOP practices consistently throughout the codebase
- **Separation of Concerns**: Keep infrastructure and frontend as separate deployable units

## Infrastructure as Code

- **CDK TypeScript**: All infrastructure must be defined using AWS CDK with TypeScript
- **Deployment Strategy**: Infrastructure changes should be deployable independently from frontend applications
- **CI/CD**: Use GitHub Actions for all deployment workflows

## Development Environment

- **Node.js Version**: Web application must be compatible with npm version 10.2.4
- **Library Compatibility**: Ensure all dependencies are compatible with the specified npm version
- **Local Development**: Applications must be runnable locally for testing and development
- **Path Resolution**: If encountering path issues during local startup, create batch scripts to resolve environment-specific paths

## Testing Strategy

- **Unit Testing**: Implement basic unit tests only - avoid over-testing
- **Focus**: Test critical business logic and core functionality

## Web Application Guidelines

- **CORS Configuration**: Implement proper CORS handling to prevent cross-origin issues
- **Local Testing**: Ensure full local development capability with proper environment setup
- **Startup Scripts**: Create platform-specific startup scripts when needed for consistent local development experience
