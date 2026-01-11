import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME!;

const createCorsHeaders = () => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Max-Age': '86400',
});

const createErrorResponse = (statusCode: number, message: string): APIGatewayProxyResult => ({
  statusCode,
  headers: createCorsHeaders(),
  body: JSON.stringify({ error: message })
});

const createSuccessResponse = (statusCode: number, data: any): APIGatewayProxyResult => ({
  statusCode,
  headers: createCorsHeaders(),
  body: JSON.stringify(data)
});

const extractUserIdFromToken = (event: APIGatewayProxyEvent): string | null => {
  try {
    const identity = event.requestContext.identity;
    
    if (identity?.cognitoIdentityId) {
      return identity.cognitoIdentityId;
    }
    
    const requestContext = event.requestContext as any;
    if (requestContext.cognitoAuthenticationProvider) {
      const match = requestContext.cognitoAuthenticationProvider.match(/CognitoSignIn:([^,]+)/);
      if (match?.[1]) {
        return match[1];
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting user ID:', error);
    return null;
  }
};

const getTags = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found');
    }

    const queryParams = event.queryStringParameters || {};
    const { q: query, limit = '50' } = queryParams;

    const params: any = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'RECORD#'
      },
      ProjectionExpression: 'tags',
      FilterExpression: 'attribute_exists(tags) AND size(tags) > :zero',
      ExpressionAttributeValues: {
        ...params.ExpressionAttributeValues,
        ':zero': 0
      }
    };

    const command = new QueryCommand(params);
    const result = await docClient.send(command);

    // Extract and deduplicate tags
    const tagSet = new Set<string>();
    (result.Items || []).forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => tagSet.add(tag));
      }
    });

    let tags = Array.from(tagSet).sort();

    // Apply query filtering if provided
    if (query) {
      const lowerQuery = query.toLowerCase();
      tags = tags.filter(tag => 
        tag.toLowerCase().includes(lowerQuery)
      );
    }

    // Apply limit
    const limitNum = parseInt(limit);
    if (limitNum > 0) {
      tags = tags.slice(0, limitNum);
    }

    return createSuccessResponse(200, { tags });
  } catch (error) {
    console.error('Error getting tags:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Tags API request received');

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: createCorsHeaders(),
      body: ''
    };
  }

  try {
    const path = event.path;
    const method = event.httpMethod;

    if (path === '/api/tags' && method === 'GET') {
      return await getTags(event);
    } else {
      return createErrorResponse(404, 'Not found');
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};