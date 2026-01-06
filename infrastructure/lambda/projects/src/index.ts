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

// Helper function to create CORS headers
const createCorsHeaders = (event?: APIGatewayProxyEvent) => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': event ? getAllowedOrigin(event) : (
    process.env.CLOUDFRONT_DOMAIN 
      ? `https://${process.env.CLOUDFRONT_DOMAIN}` 
      : 'http://localhost:3001'
  ),
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400'
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

// Helper function to extract user ID from JWT token
const extractUserIdFromToken = (event: APIGatewayProxyEvent): string | null => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return null;
    }

    // For now, we'll extract from the requestContext if available (API Gateway with Cognito authorizer)
    if (event.requestContext?.authorizer?.claims?.sub) {
      return event.requestContext.authorizer.claims.sub;
    }

    // If no authorizer context, we'll need to decode the JWT token
    // For simplicity in this implementation, we'll return null and handle auth later
    return null;
  } catch (error) {
    console.error('Error extracting user ID:', error);
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
    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'RECORD#'
      },
      ProjectionExpression: 'project, updatedAt',
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
    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'RECORD#'
      },
      ProjectionExpression: 'project, duration, updatedAt'
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