import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME!;

// Helper function to get allowed origin based on request
const getAllowedOrigin = (event: APIGatewayProxyEvent): string => {
  const origin = event.headers.origin || event.headers.Origin;
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  
  // Add CloudFront domain if available
  if (process.env.CLOUDFRONT_DOMAIN) {
    allowedOrigins.push(`https://${process.env.CLOUDFRONT_DOMAIN}`);
  }
  
  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }
  
  // Default to CloudFront domain or first allowed origin
  return process.env.CLOUDFRONT_DOMAIN 
    ? `https://${process.env.CLOUDFRONT_DOMAIN}` 
    : allowedOrigins[0];
};

// Helper function to create optimized CORS headers (avoid preflight when possible)
const createCorsHeaders = (event?: APIGatewayProxyEvent) => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*', // More permissive to avoid preflight
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,X-Amz-Content-Sha256,X-Amz-Target',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
  'Vary': 'Origin', // Help with caching
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
        // ARN format: arn:aws:sts::account:assumed-role/Cognito_IdentityPoolAuth_Role/CognitoIdentityCredentials
        // Extract the identity ID from the ARN if it contains Cognito info
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
      // Extract user ID from the authentication provider string
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

// GET /api/projects/suggestions - Get project suggestions
const getProjectSuggestions = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found', event);
    }

    const queryParams = event.queryStringParameters || {};
    const { q: query = '', limit = '10' } = queryParams;

    // Query user's time records to get unique projects
    // Note: 'project' is a DynamoDB reserved keyword, so we use ExpressionAttributeNames
    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'RECORD#'
      },
      ExpressionAttributeNames: {
        '#proj': 'project'
      },
      ProjectionExpression: '#proj, updatedAt',
      ScanIndexForward: false, // Get most recent first
      Limit: 100 // Get more records to find unique projects
    };

    const command = new QueryCommand(params);
    const result = await docClient.send(command);

    // Extract unique projects and filter by query
    const projectsMap = new Map<string, { project: string; lastUsed: string }>();
    
    (result.Items || []).forEach(item => {
      if (item.project && (!query || item.project.toLowerCase().includes(query.toLowerCase()))) {
        if (!projectsMap.has(item.project) || item.updatedAt > projectsMap.get(item.project)!.lastUsed) {
          projectsMap.set(item.project, {
            project: item.project,
            lastUsed: item.updatedAt
          });
        }
      }
    });

    // Convert to array and sort by last used (most recent first)
    const projects = Array.from(projectsMap.values())
      .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
      .slice(0, parseInt(limit))
      .map(p => p.project);

    return createSuccessResponse(200, {
      suggestions: projects,
      count: projects.length
    }, event);
  } catch (error) {
    console.error('Error getting project suggestions:', error);
    return createErrorResponse(500, 'Internal server error', event);
  }
};

// GET /api/projects - Get all user projects
const getProjects = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found', event);
    }

    // Query user's time records to get project statistics
    // Note: 'project' is a DynamoDB reserved keyword, so we use ExpressionAttributeNames
    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'RECORD#'
      },
      ExpressionAttributeNames: {
        '#proj': 'project'
      },
      ProjectionExpression: '#proj, duration, updatedAt'
    };

    const command = new QueryCommand(params);
    const result = await docClient.send(command);

    // Aggregate project statistics
    const projectsMap = new Map<string, {
      projectName: string;
      totalDuration: number;
      totalRecords: number;
      lastUsed: string;
    }>();

    (result.Items || []).forEach(item => {
      if (item.project) {
        const existing = projectsMap.get(item.project);
        if (existing) {
          existing.totalDuration += item.duration || 0;
          existing.totalRecords += 1;
          if (item.updatedAt > existing.lastUsed) {
            existing.lastUsed = item.updatedAt;
          }
        } else {
          projectsMap.set(item.project, {
            projectName: item.project,
            totalDuration: item.duration || 0,
            totalRecords: 1,
            lastUsed: item.updatedAt
          });
        }
      }
    });

    // Convert to array and sort by last used
    const projects = Array.from(projectsMap.values())
      .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());

    return createSuccessResponse(200, {
      projects,
      count: projects.length
    }, event);
  } catch (error) {
    console.error('Error getting projects:', error);
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
    if (path === '/api/projects/suggestions' && method === 'GET') {
      return await getProjectSuggestions(event);
    } else if (path === '/api/projects' && method === 'GET') {
      return await getProjects(event);
    } else {
      return createErrorResponse(404, 'Not found', event);
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return createErrorResponse(500, 'Internal server error', event);
  }
};