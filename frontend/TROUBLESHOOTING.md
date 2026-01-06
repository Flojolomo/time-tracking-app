# Troubleshooting Guide

## Common Issues and Solutions

### 1. ReferenceError: global is not defined

**Problem**: When running the application locally, you see the error "ReferenceError: global is not defined".

**Cause**: AWS Amplify expects Node.js globals that aren't available in the browser environment.

**Solution**: This has been fixed with the following changes:

1. **Vite Configuration** (`vite.config.ts`):
   ```typescript
   define: {
     global: 'globalThis',
     'process.env': {}
   }
   ```

2. **HTML Polyfill** (`index.html`):
   ```html
   <script>
     if (typeof global === 'undefined') {
       var global = globalThis;
     }
   </script>
   ```

3. **Polyfills File** (`src/polyfills.ts`):
   - Provides comprehensive polyfills for Node.js globals
   - Imported at the top of `main.tsx`

### 2. Module Resolution Issues

**Problem**: Import errors or module not found errors related to AWS SDK.

**Solution**: The Vite configuration includes:
```typescript
resolve: {
  alias: {
    './runtimeConfig': './runtimeConfig.browser',
  },
},
optimizeDeps: {
  include: ['aws-amplify'],
  exclude: ['@aws-amplify/ui-react']
}
```

### 3. Environment Variables Not Loading

**Problem**: AWS configuration not working, environment variables undefined.

**Solution**:
1. Create `.env` file based on `.env.example`
2. Ensure all variables start with `VITE_`
3. Restart the development server after adding new environment variables
4. Use `import.meta.env` instead of `process.env` in Vite

**Example `.env`**:
```env
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=your-user-pool-id
VITE_COGNITO_USER_POOL_CLIENT_ID=your-user-pool-client-id
```

### 4. Amplify Configuration Errors

**Problem**: "Amplify has not been configured correctly" or "OAuth responses require a User Pool defined in config"

**Cause**: Missing or incorrect AWS Cognito configuration in amplify_outputs.json.

**Solution**:

**AWS Amplify Gen 2 Configuration:**
1. **Update amplify_outputs.json**: Add your AWS Cognito configuration
2. **Deploy Infrastructure**: Use CDK to deploy AWS resources first
3. **Get Configuration Values**: Copy User Pool ID and Client ID from AWS Console
4. **Restart Dev Server**: Configuration is loaded at startup

**Required Configuration in amplify_outputs.json**:
```json
{
  "version": "1",
  "auth": {
    "aws_region": "us-east-1",
    "user_pool_id": "your-user-pool-id",
    "user_pool_client_id": "your-client-id",
    "identity_pool_id": "your-identity-pool-id"
  }
}
```

**Development Mode**: If AWS is not configured, the app will show a configuration status message with setup instructions.

### 5. Static Hosting Configuration

**Problem**: Configuration not loading in production S3 deployment.

**Cause**: amplify_outputs.json not properly included in build or deployment.

**Solution**: 
1. **Verify Build Process**: Ensure amplify_outputs.json is included in dist folder
2. **CDK Integration**: Update deployment to inject real values into amplify_outputs.json
3. **No Environment Variables**: Production uses amplify_outputs.json, not .env files
4. **Runtime Loading**: Configuration is loaded dynamically at application startup

**Example CDK Integration**:
```typescript
// In your CDK stack, after building the frontend
// Update amplify_outputs.json with deployed resource values
const amplifyConfig = {
  version: "1",
  auth: {
    aws_region: this.region,
    user_pool_id: userPool.userPoolId,
    user_pool_client_id: client.userPoolClientId
  }
};
```

### 4. Authentication Errors

**Problem**: Login/signup not working, authentication errors.

**Possible Causes & Solutions**:

1. **Missing AWS Configuration**:
   - Ensure all required environment variables are set
   - Check that Cognito User Pool and Client are properly configured

2. **CORS Issues**:
   - Ensure API Gateway has proper CORS configuration
   - Check that redirect URLs match exactly

3. **User Pool Configuration**:
   - Verify email verification is enabled if using email signup
   - Check password policy requirements

### 5. Build Issues

**Problem**: Build fails with TypeScript or bundling errors.

**Solutions**:
1. **TypeScript Errors**: Ensure all imports are properly typed
2. **Bundle Size**: AWS Amplify is large; consider code splitting
3. **Polyfill Issues**: Ensure polyfills are loaded before Amplify

### 6. Development Server Issues

**Problem**: Hot reload not working, or server crashes.

**Solutions**:
1. **Port Conflicts**: Change port in `vite.config.ts` if 3000 is in use
2. **Memory Issues**: Increase Node.js memory limit if needed
3. **File Watching**: Ensure file system permissions allow watching

## Performance Optimization

### Bundle Size Optimization

AWS Amplify can significantly increase bundle size. Consider:

1. **Tree Shaking**: Import only needed modules
   ```typescript
   // Instead of
   import { Auth } from 'aws-amplify';
   
   // Use specific imports when possible
   import { Auth } from '@aws-amplify/auth';
   ```

2. **Code Splitting**: Use dynamic imports for authentication components
   ```typescript
   const LoginForm = lazy(() => import('./components/LoginForm'));
   ```

3. **Bundle Analysis**: Use `npm run build -- --analyze` to analyze bundle size

### Development Performance

1. **Optimize Dependencies**: Exclude unnecessary packages from optimization
2. **Source Maps**: Disable in production for smaller builds
3. **Hot Reload**: Configure file watching patterns appropriately

## Getting Help

If you encounter issues not covered here:

1. Check the browser console for detailed error messages
2. Verify AWS Cognito configuration in the AWS Console
3. Test authentication flow step by step
4. Check network requests in browser dev tools
5. Refer to AWS Amplify documentation for specific authentication issues

## Useful Commands

```bash
# Clean install dependencies
rm -rf node_modules package-lock.json && npm install

# Build with verbose output
npm run build -- --mode development

# Start with specific port
npm run dev -- --port 3001

# Check bundle size
npm run build && npx vite-bundle-analyzer dist
```