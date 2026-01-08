import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME!;

// Helper function to create CORS headers
const createCorsHeaders = () => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,X-Amz-Content-Sha256,X-Amz-Target',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Max-Age': '86400',
});

// Helper function to create error response
const createErrorResponse = (statusCode: number, message: string): APIGatewayProxyResult => ({
  statusCode,
  headers: createCorsHeaders(),
  body: JSON.stringify({ error: message })
});

// Helper function to create success response
const createSuccessResponse = (statusCode: number, data: any): APIGatewayProxyResult => ({
  statusCode,
  headers: createCorsHeaders(),
  body: JSON.stringify(data)
});

// Helper function to extract user ID from request context (IAM authorization)
const extractUserIdFromToken = (event: APIGatewayProxyEvent): string | null => {
  try {
    console.log('=== DEBUG: Extracting User ID (IAM Authorization) ===');
    console.log('Request context:', JSON.stringify(event.requestContext, null, 2));
    
    const identity = event.requestContext.identity;
    
    if (identity) {
      console.log('Identity context:', JSON.stringify(identity, null, 2));
      
      // For Cognito Identity Pool, the user ID is in the cognitoIdentityId field
      if (identity.cognitoIdentityId) {
        console.log('SUCCESS: User ID extracted from cognitoIdentityId:', identity.cognitoIdentityId);
        return identity.cognitoIdentityId;
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
    return null;
  } catch (error) {
    console.error('Error extracting user ID:', error);
    return null;
  }
};

// Delete all user records from DynamoDB
const deleteAllUserRecords = async (userId: string): Promise<void> => {
  try {
    console.log(`Starting deletion of all records for user: ${userId}`);
    
    // Query all records for the user
    const queryParams = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`
      }
    };

    let hasMoreItems = true;
    let lastEvaluatedKey: any = undefined;
    let totalDeleted = 0;

    while (hasMoreItems) {
      const queryCommand = new QueryCommand({
        ...queryParams,
        ExclusiveStartKey: lastEvaluatedKey
      });

      const queryResult = await docClient.send(queryCommand);
      const items = queryResult.Items || [];

      console.log(`Found ${items.length} records to delete in this batch`);

      // Delete each record
      for (const item of items) {
        try {
          const deleteCommand = new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
              PK: item.PK,
              SK: item.SK
            }
          });

          await docClient.send(deleteCommand);
          totalDeleted++;
          console.log(`Deleted record: ${item.SK}`);
        } catch (deleteError) {
          console.error(`Failed to delete record ${item.SK}:`, deleteError);
          throw deleteError;
        }
      }

      // Check if there are more items to process
      lastEvaluatedKey = queryResult.LastEvaluatedKey;
      hasMoreItems = !!lastEvaluatedKey;
    }

    console.log(`Successfully deleted ${totalDeleted} records for user: ${userId}`);
  } catch (error) {
    console.error(`Error deleting user records for ${userId}:`, error);
    throw error;
  }
};

// POST /api/user/delete-all-data - Delete all user data
const deleteAllUserData = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found');
    }

    console.log(`Processing delete all data request for user: ${userId}`);

    // Delete all user records from DynamoDB
    await deleteAllUserRecords(userId);

    console.log(`Successfully deleted all data for user: ${userId}`);

    return createSuccessResponse(200, {
      message: 'All user data deleted successfully',
      userId: userId
    });
  } catch (error) {
    console.error('Error deleting user data:', error);
    return createErrorResponse(500, 'Internal server error while deleting user data');
  }
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // Handle CORS preflight requests
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

    // Route requests to appropriate handlers
    if (path === '/api/user/delete-all-data' && method === 'POST') {
      return await deleteAllUserData(event);
    } else {
      return createErrorResponse(404, 'Not found');
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};