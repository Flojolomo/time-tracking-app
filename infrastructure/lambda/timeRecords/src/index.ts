import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
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
  project: string;      // Project name (optional for active records)
  startTime: string;    // ISO 8601 timestamp
  endTime: string;      // ISO 8601 timestamp (null for active records)
  date: string;         // YYYY-MM-DD format
  duration: number;     // Duration in minutes (calculated when stopped)
  comment: string;      // User comment (optional)
  tags: string[];       // Array of tags (optional)
  isActive: boolean;    // True for currently running records
  createdAt: string;    // ISO 8601 timestamp
  updatedAt: string;    // ISO 8601 timestamp
}

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
    // With IAM authorization, user info comes from the identity context
    const identity = event.requestContext.identity;
    
    if (identity) {
      // For Cognito Identity Pool, the user ID is in the cognitoIdentityId field
      if (identity.cognitoIdentityId) {
        return identity.cognitoIdentityId;
      }
      
      // Alternative: check userArn for Cognito Identity Pool format
      if (identity.userArn) {
        const arnMatch = identity.userArn.match(/CognitoIdentityCredentials/);
        if (arnMatch && identity.cognitoIdentityId) {
          return identity.cognitoIdentityId;
        }
      }
      
      // Fallback: use user ID if available
      if (identity.user) {
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

// Helper function to calculate duration in minutes
const calculateDuration = (startTime: string, endTime: string): number => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
};

// Helper function to validate time record data
const validateTimeRecord = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Accept both project and projectName for backward compatibility
  const projectField = data.projectName || data.project;
  if (!projectField || typeof projectField !== 'string' || projectField.trim() === '') {
    errors.push('Project name is required and must be a non-empty string');
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
      return createErrorResponse(401, 'Unauthorized: User ID not found', event);
    }

    const queryParams = event.queryStringParameters || {};
    const { startDate, endDate, project, tags, limit = '50' } = queryParams;

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

    // Build filter expressions
    const filterExpressions: string[] = [];
    
    // Filter out active records from regular listings
    filterExpressions.push('(attribute_not_exists(isActive) OR isActive = :notActive)');
    params.ExpressionAttributeValues[':notActive'] = false;

    // Add project filtering if provided (project is a reserved keyword)
    if (project) {
      filterExpressions.push('#project = :project');
      // Only add ExpressionAttributeNames when we need it
      if (!params.ExpressionAttributeNames) {
        params.ExpressionAttributeNames = {};
      }
      params.ExpressionAttributeNames['#project'] = 'project';
      params.ExpressionAttributeValues[':project'] = project;
    }

    // Add tag filtering if provided
    if (tags) {
      const tagList = tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      if (tagList.length > 0) {
        // Create filter expression for tags - record must contain ALL specified tags
        const tagFilterExpressions = tagList.map((_, index) => `contains(tags, :tag${index})`);
        filterExpressions.push(`(${tagFilterExpressions.join(' AND ')})`);
        
        // Add tag values to expression attribute values
        tagList.forEach((tag, index) => {
          params.ExpressionAttributeValues[`:tag${index}`] = tag;
        });
      }
    }

    // Combine all filter expressions
    if (filterExpressions.length > 0) {
      params.FilterExpression = filterExpressions.join(' AND ');
    }

    const command = new QueryCommand(params);
    const result = await docClient.send(command);

    // Transform records to match frontend expectations - only return needed fields
    const timeRecords = (result.Items || []).map(item => ({
      id: item.recordId,
      userId: item.userId,
      projectName: item.project,
      description: item.comment || '',
      startTime: item.startTime,
      endTime: item.endTime,
      duration: item.duration,
      tags: item.tags || [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    return createSuccessResponse(200, {
      timeRecords,
      count: timeRecords.length,
      lastEvaluatedKey: result.LastEvaluatedKey
    }, event);
  } catch (error) {
    console.error('Error getting time records:', error);
    return createErrorResponse(500, 'Internal server error', event);
  }
};

// POST /api/time-records - Create new time record
const createTimeRecord = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found', event);
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required', event);
    }

    const data = JSON.parse(event.body);
    const validation = validateTimeRecord(data);

    if (!validation.isValid) {
      return createErrorResponse(400, `Validation errors: ${validation.errors.join(', ')}`, event);
    }

    const recordId = uuidv4();
    const now = new Date().toISOString();
    const duration = data.duration || calculateDuration(data.startTime, data.endTime);
    
    // Use projectName if provided, otherwise fall back to project for backward compatibility
    const projectName = (data.projectName || data.project).trim();

    const timeRecord: TimeRecord = {
      PK: `USER#${userId}`,
      SK: `RECORD#${data.date}#${recordId}`,
      GSI1PK: `PROJECT#${projectName}`,
      GSI1SK: `DATE#${data.date}`,
      recordId,
      userId,
      project: projectName,
      startTime: data.startTime,
      endTime: data.endTime,
      date: data.date,
      duration,
      comment: data.description || data.comment || '',
      tags: data.tags || [],
      isActive: false, // Regular records are not active
      createdAt: now,
      updatedAt: now
    };

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: timeRecord
    });

    await docClient.send(command);

    // Transform response to match frontend expectations - only return needed fields
    const responseRecord = {
      id: timeRecord.recordId,
      userId: timeRecord.userId,
      projectName: timeRecord.project,
      description: timeRecord.comment || '',
      startTime: timeRecord.startTime,
      endTime: timeRecord.endTime,
      duration: timeRecord.duration,
      tags: timeRecord.tags || [],
      createdAt: timeRecord.createdAt,
      updatedAt: timeRecord.updatedAt
    };

    return createSuccessResponse(201, responseRecord, event);
  } catch (error) {
    console.error('Error creating time record:', error);
    if (error instanceof SyntaxError) {
      return createErrorResponse(400, 'Invalid JSON in request body', event);
    }
    return createErrorResponse(500, 'Internal server error', event);
  }
};

// PUT /api/time-records/{id} - Update existing time record
const updateTimeRecord = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found', event);
    }

    const recordId = event.pathParameters?.id;
    if (!recordId) {
      return createErrorResponse(400, 'Record ID is required', event);
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required', event);
    }

    const data = JSON.parse(event.body);
    const validation = validateTimeRecord(data);

    if (!validation.isValid) {
      return createErrorResponse(400, `Validation errors: ${validation.errors.join(', ')}`, event);
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
      return createErrorResponse(404, 'Time record not found', event);
    }

    const now = new Date().toISOString();
    const duration = data.duration || calculateDuration(data.startTime, data.endTime);
    
    // Use projectName if provided, otherwise fall back to project for backward compatibility
    const projectName = (data.projectName || data.project).trim();

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
        GSI1PK: `PROJECT#${projectName}`,
        GSI1SK: `DATE#${data.date}`,
        recordId,
        userId,
        project: projectName,
        startTime: data.startTime,
        endTime: data.endTime,
        date: data.date,
        duration,
        comment: data.description || data.comment || '',
        tags: data.tags || [],
        isActive: false, // Regular records are not active
        createdAt: existingRecord.createdAt,
        updatedAt: now
      };

      const putCommand = new PutCommand({
        TableName: TABLE_NAME,
        Item: newTimeRecord
      });

      await docClient.send(putCommand);
      
      // Transform response to match frontend expectations - only return needed fields
      const responseRecord = {
        id: newTimeRecord.recordId,
        userId: newTimeRecord.userId,
        projectName: newTimeRecord.project,
        description: newTimeRecord.comment || '',
        startTime: newTimeRecord.startTime,
        endTime: newTimeRecord.endTime,
        duration: newTimeRecord.duration,
        tags: newTimeRecord.tags || [],
        createdAt: newTimeRecord.createdAt,
        updatedAt: newTimeRecord.updatedAt
      };
      
      return createSuccessResponse(200, responseRecord, event);
    } else {
      // Update existing record in place
      const updateCommand = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: existingRecord.PK,
          SK: existingRecord.SK
        },
        UpdateExpression: 'SET #project = :project, startTime = :startTime, endTime = :endTime, #duration = :duration, #comment = :comment, tags = :tags, isActive = :isActive, updatedAt = :updatedAt, GSI1PK = :gsi1pk',
        ExpressionAttributeNames: {
          '#project': 'project',
          '#comment': 'comment',
          '#duration': 'duration'
        },
        ExpressionAttributeValues: {
          ':project': projectName,
          ':startTime': data.startTime,
          ':endTime': data.endTime,
          ':duration': duration,
          ':comment': data.description || data.comment || '',
          ':tags': data.tags || [],
          ':isActive': false, // Regular records are not active
          ':updatedAt': now,
          ':gsi1pk': `PROJECT#${projectName}`
        },
        ReturnValues: 'ALL_NEW'
      });

      const updateResult = await docClient.send(updateCommand);
      
      // Transform response to match frontend expectations - only return needed fields
      const responseRecord = {
        id: updateResult.Attributes?.recordId,
        userId: updateResult.Attributes?.userId,
        projectName: updateResult.Attributes?.project,
        description: updateResult.Attributes?.comment || '',
        startTime: updateResult.Attributes?.startTime,
        endTime: updateResult.Attributes?.endTime,
        duration: updateResult.Attributes?.duration,
        tags: updateResult.Attributes?.tags || [],
        createdAt: updateResult.Attributes?.createdAt,
        updatedAt: updateResult.Attributes?.updatedAt
      };
      
      return createSuccessResponse(200, responseRecord, event);
    }
  } catch (error) {
    console.error('Error updating time record:', error);
    if (error instanceof SyntaxError) {
      return createErrorResponse(400, 'Invalid JSON in request body', event);
    }
    return createErrorResponse(500, 'Internal server error', event);
  }
};

// DELETE /api/time-records/{id} - Delete time record
const deleteTimeRecord = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found', event);
    }

    const recordId = event.pathParameters?.id;
    if (!recordId) {
      return createErrorResponse(400, 'Record ID is required', event);
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
      return createErrorResponse(404, 'Time record not found', event);
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

    return createSuccessResponse(200, { message: 'Time record deleted successfully', recordId }, event);
  } catch (error) {
    console.error('Error deleting time record:', error);
    return createErrorResponse(500, 'Internal server error', event);
  }
};

// GET /api/stats - Get aggregated statistics
const getStatistics = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found', event);
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
      ProjectionExpression: '#project, duration, #date, tags',
      ExpressionAttributeNames: {
        '#project': 'project',
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

    return createSuccessResponse(200, statistics, event);
  } catch (error) {
    console.error('Error getting statistics:', error);
    return createErrorResponse(500, 'Internal server error', event);
  }
};

// POST /api/time-records/start - Start a new active time record
const startTimeRecord = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found', event);
    }

    // Check if user already has an active record
    const activeRecordQuery = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'isActive = :isActive',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'RECORD#',
        ':isActive': true
      }
    });

    const activeResult = await docClient.send(activeRecordQuery);
    
    if (activeResult.Items && activeResult.Items.length > 0) {
      return createErrorResponse(400, 'User already has an active time record. Stop the current record before starting a new one.', event);
    }

    const recordId = uuidv4();
    const now = new Date().toISOString();
    const today = now.split('T')[0]; // YYYY-MM-DD format

    const activeRecord: TimeRecord = {
      PK: `USER#${userId}`,
      SK: `RECORD#${today}#${recordId}`,
      GSI1PK: `PROJECT#ACTIVE`, // Temporary project for active records
      GSI1SK: `DATE#${today}`,
      recordId,
      userId,
      project: '', // Will be filled when stopped
      startTime: now,
      endTime: '', // Will be filled when stopped
      date: today,
      duration: 0, // Will be calculated when stopped
      comment: '', // Will be filled when stopped
      tags: [], // Will be filled when stopped
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: activeRecord
    });

    await docClient.send(command);

    // Transform response to match frontend expectations
    const responseRecord = {
      id: activeRecord.recordId,
      userId: activeRecord.userId,
      projectName: activeRecord.project,
      description: activeRecord.comment,
      startTime: activeRecord.startTime,
      endTime: activeRecord.endTime,
      duration: activeRecord.duration,
      tags: activeRecord.tags,
      isActive: activeRecord.isActive,
      createdAt: activeRecord.createdAt,
      updatedAt: activeRecord.updatedAt
    };

    return createSuccessResponse(201, responseRecord, event);
  } catch (error) {
    console.error('Error starting time record:', error);
    return createErrorResponse(500, 'Internal server error', event);
  }
};

// PUT /api/time-records/stop/{id} - Stop an active time record
const stopTimeRecord = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found', event);
    }

    const recordId = event.pathParameters?.id;
    if (!recordId) {
      return createErrorResponse(400, 'Record ID is required', event);
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required', event);
    }

    const data = JSON.parse(event.body);
    
    // Validate required fields for stopping
    if (!data.project || typeof data.project !== 'string' || data.project.trim() === '') {
      return createErrorResponse(400, 'Project name is required when stopping a time record', event);
    }

    // Get the existing active record
    const getCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'recordId = :recordId AND isActive = :isActive',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'RECORD#',
        ':recordId': recordId,
        ':isActive': true
      }
    });

    const getResult = await docClient.send(getCommand);
    const existingRecord = getResult.Items?.[0];

    if (!existingRecord) {
      return createErrorResponse(404, 'Active time record not found', event);
    }

    const now = new Date().toISOString();
    const duration = calculateDuration(existingRecord.startTime, now);
    const projectName = data.project.trim();

    // Update the record to stop it
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: existingRecord.PK,
        SK: existingRecord.SK
      },
      UpdateExpression: 'SET #project = :project, endTime = :endTime, #duration = :duration, #comment = :comment, tags = :tags, isActive = :isActive, updatedAt = :updatedAt, GSI1PK = :gsi1pk',
      ExpressionAttributeNames: {
        '#project': 'project',
        '#comment': 'comment',
        '#duration': 'duration'
      },
      ExpressionAttributeValues: {
        ':project': projectName,
        ':endTime': now,
        ':duration': duration,
        ':comment': data.description || data.comment || '',
        ':tags': data.tags || [],
        ':isActive': false,
        ':updatedAt': now,
        ':gsi1pk': `PROJECT#${projectName}`
      },
      ReturnValues: 'ALL_NEW'
    });

    const updateResult = await docClient.send(updateCommand);

    // Transform response to match frontend expectations
    const responseRecord = {
      id: updateResult.Attributes?.recordId,
      userId: updateResult.Attributes?.userId,
      projectName: updateResult.Attributes?.project,
      description: updateResult.Attributes?.comment || '',
      startTime: updateResult.Attributes?.startTime,
      endTime: updateResult.Attributes?.endTime,
      duration: updateResult.Attributes?.duration,
      tags: updateResult.Attributes?.tags || [],
      isActive: updateResult.Attributes?.isActive,
      createdAt: updateResult.Attributes?.createdAt,
      updatedAt: updateResult.Attributes?.updatedAt
    };

    return createSuccessResponse(200, responseRecord, event);
  } catch (error) {
    console.error('Error stopping time record:', error);
    if (error instanceof SyntaxError) {
      return createErrorResponse(400, 'Invalid JSON in request body', event);
    }
    return createErrorResponse(500, 'Internal server error', event);
  }
};

// GET /api/time-records/active - Get user's currently active record
const getActiveTimeRecord = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found', event);
    }

    const activeRecordQuery = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'isActive = :isActive',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'RECORD#',
        ':isActive': true
      }
    });

    const result = await docClient.send(activeRecordQuery);
    
    if (!result.Items || result.Items.length === 0) {
      return createSuccessResponse(200, { activeRecord: null }, event);
    }

    const activeRecord = result.Items[0];

    // Transform response to match frontend expectations
    const responseRecord = {
      id: activeRecord.recordId,
      userId: activeRecord.userId,
      projectName: activeRecord.project,
      description: activeRecord.comment || '',
      startTime: activeRecord.startTime,
      endTime: activeRecord.endTime,
      duration: activeRecord.duration,
      tags: activeRecord.tags || [],
      isActive: activeRecord.isActive,
      createdAt: activeRecord.createdAt,
      updatedAt: activeRecord.updatedAt
    };

    return createSuccessResponse(200, { activeRecord: responseRecord }, event);
  } catch (error) {
    console.error('Error getting active time record:', error);
    return createErrorResponse(500, 'Internal server error', event);
  }
};

// PUT /api/time-records/active/{id} - Update active time record fields
const updateActiveTimeRecord = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = extractUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, 'Unauthorized: User ID not found', event);
    }

    const recordId = event.pathParameters?.id;
    if (!recordId) {
      return createErrorResponse(400, 'Record ID is required', event);
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required', event);
    }

    const data = JSON.parse(event.body);

    // Get the existing active record
    const getCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'recordId = :recordId AND isActive = :isActive',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'RECORD#',
        ':recordId': recordId,
        ':isActive': true
      }
    });

    const getResult = await docClient.send(getCommand);
    const existingRecord = getResult.Items?.[0];

    if (!existingRecord) {
      return createErrorResponse(404, 'Active time record not found', event);
    }

    const now = new Date().toISOString();
    
    // Build update expression dynamically based on provided fields
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {
      ':updatedAt': now
    };

    // Always update the updatedAt timestamp
    updateExpressions.push('updatedAt = :updatedAt');

    // Update project if provided
    if (data.project !== undefined && typeof data.project === 'string') {
      updateExpressions.push('#project = :project');
      updateExpressions.push('GSI1PK = :gsi1pk');
      expressionAttributeNames['#project'] = 'project';
      expressionAttributeValues[':project'] = data.project.trim();
      expressionAttributeValues[':gsi1pk'] = `PROJECT#${data.project.trim()}`;
    }

    // Update description/comment if provided
    if (data.description !== undefined) {
      updateExpressions.push('#comment = :comment');
      expressionAttributeNames['#comment'] = 'comment';
      expressionAttributeValues[':comment'] = typeof data.description === 'string' ? data.description : '';
    }

    // Update tags if provided
    if (data.tags !== undefined) {
      if (!Array.isArray(data.tags)) {
        return createErrorResponse(400, 'Tags must be an array', event);
      }
      if (!data.tags.every((tag: any) => typeof tag === 'string')) {
        return createErrorResponse(400, 'All tags must be strings', event);
      }
      updateExpressions.push('tags = :tags');
      expressionAttributeValues[':tags'] = data.tags;
    }

    // Update start time if provided (Requirement 8.6)
    if (data.startTime !== undefined) {
      if (typeof data.startTime !== 'string') {
        return createErrorResponse(400, 'Start time must be a valid ISO 8601 string', event);
      }
      
      const newStartTime = new Date(data.startTime);
      if (isNaN(newStartTime.getTime())) {
        return createErrorResponse(400, 'Start time must be a valid ISO 8601 timestamp', event);
      }

      // Validate that new start time is not in the future
      const now = new Date();
      if (newStartTime > now) {
        return createErrorResponse(400, 'Start time cannot be in the future', event);
      }

      updateExpressions.push('startTime = :startTime');
      expressionAttributeValues[':startTime'] = data.startTime;
    }

    // If no fields to update besides timestamp, return error
    if (updateExpressions.length === 1) {
      return createErrorResponse(400, 'No valid fields provided for update', event);
    }

    // Update the record
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: existingRecord.PK,
        SK: existingRecord.SK
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    const updateResult = await docClient.send(updateCommand);

    // Transform response to match frontend expectations
    const responseRecord = {
      id: updateResult.Attributes?.recordId,
      userId: updateResult.Attributes?.userId,
      projectName: updateResult.Attributes?.project,
      description: updateResult.Attributes?.comment || '',
      startTime: updateResult.Attributes?.startTime,
      endTime: updateResult.Attributes?.endTime,
      duration: updateResult.Attributes?.duration,
      tags: updateResult.Attributes?.tags || [],
      isActive: updateResult.Attributes?.isActive,
      createdAt: updateResult.Attributes?.createdAt,
      updatedAt: updateResult.Attributes?.updatedAt
    };

    return createSuccessResponse(200, responseRecord, event);
  } catch (error) {
    console.error('Error updating active time record:', error);
    if (error instanceof SyntaxError) {
      return createErrorResponse(400, 'Invalid JSON in request body', event);
    }
    return createErrorResponse(500, 'Internal server error', event);
  }
};

// User cleanup function - deletes all records for a specific user
const cleanupUserRecords = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Get Identity Pool user ID from query parameters (sent by profile lambda)
    const identityPoolUserId = event.queryStringParameters?.identityPoolUserId;

    if (!identityPoolUserId) {
      return createErrorResponse(400, 'Identity Pool User ID is required as query parameter', event);
    }

    if (typeof identityPoolUserId !== 'string') {
      return createErrorResponse(400, 'Identity Pool User ID must be a string', event);
    }

    console.log('Starting cleanup of user records');
    
    // Query all user's records using the Identity Pool user ID
    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `USER#${identityPoolUserId}`
      }
    });

    const queryResult = await docClient.send(queryCommand);
    
    // TODO probably need pagination
    // Delete each record
    if (queryResult.Items && queryResult.Items.length > 0) {
      console.log(`Found ${queryResult.Items.length} records to delete`);
      
      // Process deletions in batches to avoid overwhelming DynamoDB
      const batchSize = 25; // DynamoDB batch write limit
      const batches = [];
      
      for (let i = 0; i < queryResult.Items.length; i += batchSize) {
        const batch = queryResult.Items.slice(i, i + batchSize);
        batches.push(batch);
      }
      
      // Process each batch
      for (const batch of batches) {
        const deletePromises = batch.map(item => {
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
        console.log(`Deleted batch of ${batch.length} records`);
        
        // Small delay between batches to be gentle on DynamoDB
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`Successfully completed cleanup of ${queryResult.Items.length} records`);
      
      return createSuccessResponse(200, { 
        message: `Successfully deleted ${queryResult.Items.length} records for Identity Pool user ${identityPoolUserId}`,
        deletedCount: queryResult.Items.length
      }, event);
    } else {
      console.log('No time records found for cleanup');
      return createSuccessResponse(200, { 
        message: `No records found for Identity Pool user ${identityPoolUserId}`,
        deletedCount: 0
      }, event);
    }
  } catch (error) {
    console.error(`Error during cleanup for Identity Pool user:`, error);
    return createErrorResponse(500, 'Internal server error during user cleanup', event);
  }
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Time records API request received');

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
    if (path === '/api/time-records' && method === 'GET') {
      return await getTimeRecords(event);
    } else if (path === '/api/time-records' && method === 'POST') {
      return await createTimeRecord(event);
    } else if (path === '/api/time-records/user-cleanup' && method === 'DELETE') {
      return await cleanupUserRecords(event);
    } else if (path === '/api/time-records/start' && method === 'POST') {
      return await startTimeRecord(event);
    } else if (path === '/api/time-records/active' && method === 'GET') {
      return await getActiveTimeRecord(event);
    } else if (path.match(/^\/api\/time-records\/active\/[^/]+$/) && method === 'PUT') {
      return await updateActiveTimeRecord(event);
    } else if (path.match(/^\/api\/time-records\/stop\/[^/]+$/) && method === 'PUT') {
      return await stopTimeRecord(event);
    } else if (path.match(/^\/api\/time-records\/[^/]+$/) && method === 'PUT') {
      return await updateTimeRecord(event);
    } else if (path.match(/^\/api\/time-records\/[^/]+$/) && method === 'DELETE') {
      return await deleteTimeRecord(event);
    } else if (path === '/api/stats' && method === 'GET') {
      return await getStatistics(event);
    } else {
      return createErrorResponse(404, 'Not found', event);
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return createErrorResponse(500, 'Internal server error', event);
  }
};