// AWS Configuration for Production Deployment
// This file will be populated by the CDK deployment process

window.__AWS_CONFIG__ = {
  region: '${AWS_REGION}',
  userPoolId: '${COGNITO_USER_POOL_ID}',
  userPoolWebClientId: '${COGNITO_USER_POOL_CLIENT_ID}',
  cognitoDomain: '${COGNITO_DOMAIN}',
  apiEndpoint: '${API_ENDPOINT}',
  redirectSignIn: '${REDIRECT_SIGN_IN}',
  redirectSignOut: '${REDIRECT_SIGN_OUT}'
};

// Development fallback - if variables aren't replaced, clear the config
if (window.__AWS_CONFIG__.userPoolId.startsWith('${')) {
  window.__AWS_CONFIG__ = null;
}