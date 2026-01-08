import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  CognitoIdentityProviderClient, 
  GetUserCommand, 
  UpdateUserAttributesCommand,
  ChangePasswordCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  DeleteUserCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

// Initialize clients
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME!;
const USER_POOL_ID = process.env.USER_POOL_ID!;

// Helper function to create optimized CORS headers
const createCorsHeaders = (event?: APIGatewayProxyEvent) => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,X-Amz-Content-Sha256,X-Amz-Target',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
});

// Helper function to create error response
const createErrorResponse = (statusCode: number, message: string, event?: APIGatewayProxyEvent): APIGatewayProxyResult => ({
  statusCode,
  headers: createCorsHeaders(event),
  body: JSON.stringify({ error: message })
});

// Helper function to create success response
const createSuccessResponse = (statusCode: number, data: any, event?: APIGatewayProxyEvent): APIGatewayProxyResult => ({
  statusCode,
  headers: createCorsHeaders(event),
  body: JSON.stringify(data)
});

// Helper function to extract user ID from request context (IAM authorization)
const extractUserIdFromToken = (event: APIGatewayProxyEvent): string | null => {
  try {
    console.log('=== DEBUG: Extracting User ID (IAM Authorization) ===');
    console.log('Request context:', JSON.stringify(event.requestContext, null, 2));
    
    // With IAM authorization, user info comes from the identity context
    const identity = event.requestContext.identity;
    
    if (identity) {
      console.log('Identity context:', JSON.stringify(identity, null, 2));
      
      // For Cognito Identity Pool, the user ID is in the cognitoIdentityId field
      if (identity.cognitoIdentityId) {
        console.log('SUCCESS: User ID extracted from cognitoIdentityId:', identity.cognitoIdentityId);
        return identity.cognitoIdentityId;
      }
      
      // Alternative: check userArn for Cognito Identity Pool format
      if (identity.userArn) {
        console.log('User ARN:', identity.userArn);
        const arnMatch = identity.userArn.match(/CognitoIdentityCredentials/);
        if (arnMatch && identity.cognitoIdentityId) {
          return identity.cognitoIdentityId;
        }
      }
      
      // Fallback: use user ID if available
      if (identity.user) {
        console.log('SUCCESS: User ID extracted from identity.user:', identity.user);
        return identity.user;
      }
    }
    
    // Additional fallback: check for Cognito authentication ID in request context
    const requestContext = event.requestContext as any;
    if (requestContext.cognitoAuthenticationProvider) {
      console.log('Cognito auth provider:', requestContext.cognitoAuthenticationProvider);
      const match = requestContext.cognitoAuthenticationProvider.match(/CognitoSignIn:([^,]+)/);
      if (match && match[1]) {
        console.log('SUCCESS: User ID extracted from cognitoAuthenticationProvider:', match[1]);
        return match[1];
      }
    }
    
    console.error('ERROR: No user ID found in IAM authorization context');
    console.log('Available identity fields:', identity ? Object.keys(identity) : 'No identity object');
    console.log('Available requestContext fields:', Object.keys(event.requestContext));
    
    return null;
  } catch (error) {
    console.error('Error extracting user ID:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return null;
  }
};

// Helper function to extract access token from Authorization header
const extractAccessToken = (event: APIGatewayProxyEvent): string | null => {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

// GET /api/profile - Get user profile information
const getUserProfile = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found', event);
    }

    const accessToken = extractAccessToken(event);
    if (!accessToken) {
      return createErrorResponse(401, 'Unauthorized: Access token not found', event);
    }

    // Get user information from Cognito
    const getUserCommand = new GetUserCommand({
      AccessToken: accessToken
    });

    const userResult = await cognitoClient.send(getUserCommand);

    // Extract user attributes
    const attributes: Record<string, string> = {};
    userResult.UserAttributes?.forEach(attr => {
      if (attr.Name && attr.Value) {
        attributes[attr.Name] = attr.Value;
      }
    });

    const profile = {
      username: userResult.Username,
      email: attributes.email,
      emailVerified: attributes.email_verified === 'true',
      givenName: attributes.given_name || '',
      familyName: attributes.family_name || '',
      timezone: attributes['custom:timezone'] || '',
      preferences: attributes['custom:preferences'] ? JSON.parse(attributes['custom:preferences']) : {},
      createdAt: new Date().toISOString(), // Cognito doesn't provide creation date in GetUser
      lastModified: new Date().toISOString() // Use current time as last modified
    };

    return createSuccessResponse(200, { profile }, event);
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    if (error.name === 'NotAuthorizedException') {
      return createErrorResponse(401, 'Invalid or expired access token', event);
    }
    return createErrorResponse(500, 'Internal server error', event);
  }
};

// PUT /api/profile - Update user profile information
const updateUserProfile = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found', event);
    }

    const accessToken = extractAccessToken(event);
    if (!accessToken) {
      return createErrorResponse(401, 'Unauthorized: Access token not found', event);
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required', event);
    }

    const data = JSON.parse(event.body);
    
    // Validate input data
    const allowedFields = ['givenName', 'familyName', 'timezone', 'preferences'];
    const updates: { Name: string; Value: string }[] = [];

    // Build attribute updates
    if (data.givenName !== undefined) {
      updates.push({ Name: 'given_name', Value: String(data.givenName) });
    }
    
    if (data.familyName !== undefined) {
      updates.push({ Name: 'family_name', Value: String(data.familyName) });
    }
    
    if (data.timezone !== undefined) {
      updates.push({ Name: 'custom:timezone', Value: String(data.timezone) });
    }
    
    if (data.preferences !== undefined) {
      updates.push({ Name: 'custom:preferences', Value: JSON.stringify(data.preferences) });
    }

    if (updates.length === 0) {
      return createErrorResponse(400, 'No valid fields to update', event);
    }

    // Update user attributes in Cognito
    const updateCommand = new UpdateUserAttributesCommand({
      AccessToken: accessToken,
      UserAttributes: updates
    });

    await cognitoClient.send(updateCommand);

    return createSuccessResponse(200, { 
      message: 'Profile updated successfully',
      updatedFields: updates.map(u => u.Name)
    }, event);
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    if (error.name === 'NotAuthorizedException') {
      return createErrorResponse(401, 'Invalid or expired access token', event);
    }
    if (error.name === 'InvalidParameterException') {
      return createErrorResponse(400, 'Invalid parameter values', event);
    }
    return createErrorResponse(500, 'Internal server error', event);
  }
};

// PUT /api/profile/password - Update user password
const updateUserPassword = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found', event);
    }

    const accessToken = extractAccessToken(event);
    if (!accessToken) {
      return createErrorResponse(401, 'Unauthorized: Access token not found', event);
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required', event);
    }

    const data = JSON.parse(event.body);
    
    if (!data.currentPassword || !data.newPassword) {
      return createErrorResponse(400, 'Current password and new password are required', event);
    }

    if (typeof data.currentPassword !== 'string' || typeof data.newPassword !== 'string') {
      return createErrorResponse(400, 'Passwords must be strings', event);
    }

    if (data.newPassword.length < 8) {
      return createErrorResponse(400, 'New password must be at least 8 characters long', event);
    }

    // Change password in Cognito
    const changePasswordCommand = new ChangePasswordCommand({
      AccessToken: accessToken,
      PreviousPassword: data.currentPassword,
      ProposedPassword: data.newPassword
    });

    await cognitoClient.send(changePasswordCommand);

    return createSuccessResponse(200, { 
      message: 'Password updated successfully' 
    }, event);
  } catch (error: any) {
    console.error('Error updating password:', error);
    if (error.name === 'NotAuthorizedException') {
      return createErrorResponse(401, 'Invalid current password or expired access token', event);
    }
    if (error.name === 'InvalidPasswordException') {
      return createErrorResponse(400, 'New password does not meet requirements', event);
    }
    if (error.name === 'LimitExceededException') {
      return createErrorResponse(429, 'Too many password change attempts. Please try again later.', event);
    }
    return createErrorResponse(500, 'Internal server error', event);
  }
};

// POST /api/profile/forgot-password - Initiate password reset
const forgotPassword = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required', event);
    }

    const data = JSON.parse(event.body);
    
    if (!data.email || typeof data.email !== 'string') {
      return createErrorResponse(400, 'Email is required and must be a string', event);
    }

    // Initiate forgot password flow
    const forgotPasswordCommand = new ForgotPasswordCommand({
      ClientId: process.env.USER_POOL_CLIENT_ID!,
      Username: data.email
    });

    await cognitoClient.send(forgotPasswordCommand);

    return createSuccessResponse(200, { 
      message: 'Password reset email sent successfully' 
    }, event);
  } catch (error: any) {
    console.error('Error initiating password reset:', error);
    if (error.name === 'UserNotFoundException') {
      // For security, don't reveal if user exists or not
      return createSuccessResponse(200, { 
        message: 'Password reset email sent successfully' 
      }, event);
    }
    if (error.name === 'LimitExceededException') {
      return createErrorResponse(429, 'Too many password reset attempts. Please try again later.', event);
    }
    return createErrorResponse(500, 'Internal server error', event);
  }
};

// POST /api/profile/reset-password - Complete password reset
const resetPassword = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required', event);
    }

    const data = JSON.parse(event.body);
    
    if (!data.email || !data.confirmationCode || !data.newPassword) {
      return createErrorResponse(400, 'Email, confirmation code, and new password are required', event);
    }

    if (typeof data.email !== 'string' || typeof data.confirmationCode !== 'string' || typeof data.newPassword !== 'string') {
      return createErrorResponse(400, 'All fields must be strings', event);
    }

    if (data.newPassword.length < 8) {
      return createErrorResponse(400, 'New password must be at least 8 characters long', event);
    }

    // Confirm forgot password with new password
    const confirmForgotPasswordCommand = new ConfirmForgotPasswordCommand({
      ClientId: process.env.USER_POOL_CLIENT_ID!,
      Username: data.email,
      ConfirmationCode: data.confirmationCode,
      Password: data.newPassword
    });

    await cognitoClient.send(confirmForgotPasswordCommand);

    return createSuccessResponse(200, { 
      message: 'Password reset completed successfully' 
    }, event);
  } catch (error: any) {
    console.error('Error completing password reset:', error);
    if (error.name === 'CodeMismatchException') {
      return createErrorResponse(400, 'Invalid confirmation code', event);
    }
    if (error.name === 'ExpiredCodeException') {
      return createErrorResponse(400, 'Confirmation code has expired', event);
    }
    if (error.name === 'InvalidPasswordException') {
      return createErrorResponse(400, 'New password does not meet requirements', event);
    }
    if (error.name === 'UserNotFoundException') {
      return createErrorResponse(404, 'User not found', event);
    }
    return createErrorResponse(500, 'Internal server error', event);
  }
};

// DELETE /api/profile - Delete user profile and all associated data
const deleteUserProfile = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found', event);
    }

    const accessToken = extractAccessToken(event);
    if (!accessToken) {
      return createErrorResponse(401, 'Unauthorized: Access token not found', event);
    }

    // First, get the user's username from Cognito to ensure we have the right user
    const getUserCommand = new GetUserCommand({
      AccessToken: accessToken
    });

    let username: string;
    try {
      const userResult = await cognitoClient.send(getUserCommand);
      username = userResult.Username!;
    } catch (error) {
      console.error('Error getting user info for deletion:', error);
      return createErrorResponse(401, 'Invalid or expired access token', event);
    }

    // Delete all user's time records from DynamoDB
    try {
      // Query all user's records
      const queryCommand = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`
        }
      });

      const queryResult = await docClient.send(queryCommand);
      
      // Delete each record
      if (queryResult.Items && queryResult.Items.length > 0) {
        const deletePromises = queryResult.Items.map(item => {
          const deleteCommand = new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
              PK: item.PK,
              SK: item.SK
            }
          });
          return docClient.send(deleteCommand);
        });

        await Promise.all(deletePromises);
        console.log(`Deleted ${queryResult.Items.length} time records for user ${userId}`);
      }
    } catch (error) {
      console.error('Error deleting user time records:', error);
      // Continue with user deletion even if time record deletion fails
    }

    // Delete the user from Cognito
    try {
      const deleteUserCommand = new DeleteUserCommand({
        AccessToken: accessToken
      });

      await cognitoClient.send(deleteUserCommand);
    } catch (error) {
      console.error('Error deleting user from Cognito:', error);
      
      // If self-deletion fails, try admin deletion as fallback
      try {
        const adminDeleteCommand = new AdminDeleteUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: username
        });

        await cognitoClient.send(adminDeleteCommand);
      } catch (adminError) {
        console.error('Error with admin user deletion:', adminError);
        return createErrorResponse(500, 'Failed to delete user account', event);
      }
    }

    return createSuccessResponse(200, { 
      message: 'User profile and all associated data deleted successfully' 
    }, event);
  } catch (error: any) {
    console.error('Error deleting user profile:', error);
    return createErrorResponse(500, 'Internal server error', event);
  }
};

// Main handler function
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: createCorsHeaders(event),
      body: ''
    };
  }

  try {
    const path = event.path;
    const method = event.httpMethod;

    // Route requests to appropriate handlers
    if (path === '/api/profile' && method === 'GET') {
      return await getUserProfile(event);
    } else if (path === '/api/profile' && method === 'PUT') {
      return await updateUserProfile(event);
    } else if (path === '/api/profile/password' && method === 'PUT') {
      return await updateUserPassword(event);
    } else if (path === '/api/profile/forgot-password' && method === 'POST') {
      return await forgotPassword(event);
    } else if (path === '/api/profile/reset-password' && method === 'POST') {
      return await resetPassword(event);
    } else if (path === '/api/profile' && method === 'DELETE') {
      return await deleteUserProfile(event);
    } else {
      return createErrorResponse(404, 'Not found', event);
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return createErrorResponse(500, 'Internal server error', event);
  }
};