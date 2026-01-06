import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME!;

interface TimeRecord {
  PK: string;           // USER#{userId}
  SK: string;           // RECORD#{timestamp}#{recordId}
  GSI1PK: string;       // PROJECT#{projectName}
  GSI1SK: string;       // DATE#{date}
  recordId: string;     // UUID
  userId: string;       // Cognito user ID
  project: string;      // Project name
  startTime: string;    // ISO 8601 timestamp
  endTime: string;      // ISO 8601 timestamp
  date: string;         // YYYY-MM-DD format
  duration: number;     // Duration in minutes
  comment: string;      // User comment
  tags: string[];       // Array of tags
  createdAt: string;    // ISO 8601 timestamp
  updatedAt: string;    // ISO 8601 timestamp
}

// Helper function to create CORS headers
const createCorsHeaders = () => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
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

// Helper function to calculate duration in minutes
const calculateDuration = (startTime: string, endTime: string): number => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
};

// Helper function to validate time record data
const validateTimeRecord = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.project || typeof data.project !== 'string' || data.project.trim() === '') {
    errors.push('Project is required and must be a non-empty string');
  }

  if (!data.startTime || typeof data.startTime !== 'string') {
    errors.push('Start time is required and must be a valid ISO 8601 string');
  } else {
    const startDate = new Date(data.startTime);
    if (isNaN(startDate.getTime())) {
      errors.push('Start time must be a valid ISO 8601 timestamp');
    }
  }

  if (!data.endTime || typeof data.endTime !== 'string') {
    errors.push('End time is required and must be a valid ISO 8601 string');
  } else {
    const endDate = new Date(data.endTime);
    if (isNaN(endDate.getTime())) {
      errors.push('End time must be a valid ISO 8601 timestamp');
    }
  }

  if (!data.date || typeof data.date !== 'string') {
    errors.push('Date is required and must be in YYYY-MM-DD format');
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.date)) {
      errors.push('Date must be in YYYY-MM-DD format');
    }
  }

  // Validate that end time is after start time
  if (data.startTime && data.endTime) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
      errors.push('End time must be after start time');
    }
  }

  // Validate optional fields
  if (data.comment && typeof data.comment !== 'string') {
    errors.push('Comment must be a string');
  }

  if (data.tags && !Array.isArray(data.tags)) {
    errors.push('Tags must be an array');
  } else if (data.tags && !data.tags.every((tag: any) => typeof tag === 'string')) {
    errors.push('All tags must be strings');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// GET /api/time-records - List user's time records with filtering
const getTimeRecords = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found');
    }

    const queryParams = event.queryStringParameters || {};
    const { startDate, endDate, project, limit = '50' } = queryParams;

    const params: any = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`
      },
      ScanIndexForward: false, // Sort by SK in descending order (newest first)
      Limit: parseInt(limit)
    };

    // Add date range filtering if provided
    if (startDate && endDate) {
      params.KeyConditionExpression += ' AND SK BETWEEN :startSK AND :endSK';
      params.ExpressionAttributeValues[':startSK'] = `RECORD#${startDate}`;
      params.ExpressionAttributeValues[':endSK'] = `RECORD#${endDate}~`; // ~ is after numbers/letters in ASCII
    } else if (startDate) {
      params.KeyConditionExpression += ' AND SK >= :startSK';
      params.ExpressionAttributeValues[':startSK'] = `RECORD#${startDate}`;
    } else if (endDate) {
      params.KeyConditionExpression += ' AND SK <= :endSK';
      params.ExpressionAttributeValues[':endSK'] = `RECORD#${endDate}~`;
    }

    // Add project filtering if provided
    if (project) {
      params.FilterExpression = 'project = :project';
      params.ExpressionAttributeValues[':project'] = project;
    }

    const command = new QueryCommand(params);
    const result = await docClient.send(command);

    const timeRecords = result.Items || [];

    return createSuccessResponse(200, {
      timeRecords,
      count: timeRecords.length,
      lastEvaluatedKey: result.LastEvaluatedKey
    });
  } catch (error) {
    console.error('Error getting time records:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};

// POST /api/time-records - Create new time record
const createTimeRecord = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found');
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const data = JSON.parse(event.body);
    const validation = validateTimeRecord(data);

    if (!validation.isValid) {
      return createErrorResponse(400, `Validation errors: ${validation.errors.join(', ')}`);
    }

    const recordId = uuidv4();
    const now = new Date().toISOString();
    const duration = calculateDuration(data.startTime, data.endTime);

    const timeRecord: TimeRecord = {
      PK: `USER#${userId}`,
      SK: `RECORD#${data.date}#${recordId}`,
      GSI1PK: `PROJECT#${data.project}`,
      GSI1SK: `DATE#${data.date}`,
      recordId,
      userId,
      project: data.project.trim(),
      startTime: data.startTime,
      endTime: data.endTime,
      date: data.date,
      duration,
      comment: data.comment || '',
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now
    };

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: timeRecord
    });

    await docClient.send(command);

    return createSuccessResponse(201, timeRecord);
  } catch (error) {
    console.error('Error creating time record:', error);
    if (error instanceof SyntaxError) {
      return createErrorResponse(400, 'Invalid JSON in request body');
    }
    return createErrorResponse(500, 'Internal server error');
  }
};

// PUT /api/time-records/{id} - Update existing time record
const updateTimeRecord = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found');
    }

    const recordId = event.pathParameters?.id;
    if (!recordId) {
      return createErrorResponse(400, 'Record ID is required');
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const data = JSON.parse(event.body);
    const validation = validateTimeRecord(data);

    if (!validation.isValid) {
      return createErrorResponse(400, `Validation errors: ${validation.errors.join(', ')}`);
    }

    // First, get the existing record to verify ownership and get the current SK
    const getCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'recordId = :recordId',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'RECORD#',
        ':recordId': recordId
      }
    });

    const getResult = await docClient.send(getCommand);
    const existingRecord = getResult.Items?.[0];

    if (!existingRecord) {
      return createErrorResponse(404, 'Time record not found');
    }

    const now = new Date().toISOString();
    const duration = calculateDuration(data.startTime, data.endTime);

    // If the date changed, we need to delete the old record and create a new one
    // because the SK includes the date
    if (data.date !== existingRecord.date) {
      // Delete old record
      const deleteCommand = new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: existingRecord.PK,
          SK: existingRecord.SK
        }
      });
      await docClient.send(deleteCommand);

      // Create new record with updated date
      const newTimeRecord: TimeRecord = {
        PK: `USER#${userId}`,
        SK: `RECORD#${data.date}#${recordId}`,
        GSI1PK: `PROJECT#${data.project}`,
        GSI1SK: `DATE#${data.date}`,
        recordId,
        userId,
        project: data.project.trim(),
        startTime: data.startTime,
        endTime: data.endTime,
        date: data.date,
        duration,
        comment: data.comment || '',
        tags: data.tags || [],
        createdAt: existingRecord.createdAt,
        updatedAt: now
      };

      const putCommand = new PutCommand({
        TableName: TABLE_NAME,
        Item: newTimeRecord
      });

      await docClient.send(putCommand);
      return createSuccessResponse(200, newTimeRecord);
    } else {
      // Update existing record in place
      const updateCommand = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: existingRecord.PK,
          SK: existingRecord.SK
        },
        UpdateExpression: 'SET project = :project, startTime = :startTime, endTime = :endTime, duration = :duration, comment = :comment, tags = :tags, updatedAt = :updatedAt, GSI1PK = :gsi1pk',
        ExpressionAttributeValues: {
          ':project': data.project.trim(),
          ':startTime': data.startTime,
          ':endTime': data.endTime,
          ':duration': duration,
          ':comment': data.comment || '',
          ':tags': data.tags || [],
          ':updatedAt': now,
          ':gsi1pk': `PROJECT#${data.project}`
        },
        ReturnValues: 'ALL_NEW'
      });

      const updateResult = await docClient.send(updateCommand);
      return createSuccessResponse(200, updateResult.Attributes);
    }
  } catch (error) {
    console.error('Error updating time record:', error);
    if (error instanceof SyntaxError) {
      return createErrorResponse(400, 'Invalid JSON in request body');
    }
    return createErrorResponse(500, 'Internal server error');
  }
};

// DELETE /api/time-records/{id} - Delete time record
const deleteTimeRecord = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found');
    }

    const recordId = event.pathParameters?.id;
    if (!recordId) {
      return createErrorResponse(400, 'Record ID is required');
    }

    // First, get the existing record to verify ownership and get the SK
    const getCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'recordId = :recordId',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'RECORD#',
        ':recordId': recordId
      }
    });

    const getResult = await docClient.send(getCommand);
    const existingRecord = getResult.Items?.[0];

    if (!existingRecord) {
      return createErrorResponse(404, 'Time record not found');
    }

    // Delete the record
    const deleteCommand = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: existingRecord.PK,
        SK: existingRecord.SK
      }
    });

    await docClient.send(deleteCommand);

    return createSuccessResponse(200, { message: 'Time record deleted successfully', recordId });
  } catch (error) {
    console.error('Error deleting time record:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};

// GET /api/stats - Get aggregated statistics
const getStatistics = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found');
    }

    const queryParams = event.queryStringParameters || {};
    const { startDate, endDate } = queryParams;

    const params: any = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'RECORD#'
      },
      ProjectionExpression: 'project, duration, #date, tags',
      ExpressionAttributeNames: {
        '#date': 'date'
      }
    };

    // Add date range filtering if provided
    if (startDate && endDate) {
      params.KeyConditionExpression += ' AND SK BETWEEN :startSK AND :endSK';
      params.ExpressionAttributeValues[':startSK'] = `RECORD#${startDate}`;
      params.ExpressionAttributeValues[':endSK'] = `RECORD#${endDate}~`;
    } else if (startDate) {
      params.KeyConditionExpression += ' AND SK >= :startSK';
      params.ExpressionAttributeValues[':startSK'] = `RECORD#${startDate}`;
    } else if (endDate) {
      params.KeyConditionExpression += ' AND SK <= :endSK';
      params.ExpressionAttributeValues[':endSK'] = `RECORD#${endDate}~`;
    }

    const command = new QueryCommand(params);
    const result = await docClient.send(command);

    const records = result.Items || [];

    // Calculate statistics
    const projectStats = new Map<string, number>();
    const tagStats = new Map<string, number>();
    const dailyStats = new Map<string, number>();
    let totalDuration = 0;

    records.forEach(record => {
      const duration = record.duration || 0;
      totalDuration += duration;

      // Project statistics
      if (record.project) {
        projectStats.set(record.project, (projectStats.get(record.project) || 0) + duration);
      }

      // Tag statistics
      if (record.tags && Array.isArray(record.tags)) {
        record.tags.forEach((tag: string) => {
          tagStats.set(tag, (tagStats.get(tag) || 0) + duration);
        });
      }

      // Daily statistics
      if (record.date) {
        dailyStats.set(record.date, (dailyStats.get(record.date) || 0) + duration);
      }
    });

    // Convert maps to arrays and sort
    const projectTotals = Array.from(projectStats.entries())
      .map(([project, duration]) => ({ project, duration }))
      .sort((a, b) => b.duration - a.duration);

    const tagTotals = Array.from(tagStats.entries())
      .map(([tag, duration]) => ({ tag, duration }))
      .sort((a, b) => b.duration - a.duration);

    const dailyTotals = Array.from(dailyStats.entries())
      .map(([date, duration]) => ({ date, duration }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate averages
    const totalDays = dailyStats.size;
    const averageDailyTime = totalDays > 0 ? totalDuration / totalDays : 0;

    const statistics = {
      totalDuration,
      totalRecords: records.length,
      totalDays,
      averageDailyTime: Math.round(averageDailyTime),
      projectTotals,
      tagTotals,
      dailyTotals
    };

    return createSuccessResponse(200, statistics);
  } catch (error) {
    console.error('Error getting statistics:', error);
    return createErrorResponse(500, 'Internal server error');
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
    if (path === '/api/time-records' && method === 'GET') {
      return await getTimeRecords(event);
    } else if (path === '/api/time-records' && method === 'POST') {
      return await createTimeRecord(event);
    } else if (path.match(/^\/api\/time-records\/[^/]+$/) && method === 'PUT') {
      return await updateTimeRecord(event);
    } else if (path.match(/^\/api\/time-records\/[^/]+$/) && method === 'DELETE') {
      return await deleteTimeRecord(event);
    } else if (path === '/api/stats' && method === 'GET') {
      return await getStatistics(event);
    } else {
      return createErrorResponse(404, 'Not found');
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};