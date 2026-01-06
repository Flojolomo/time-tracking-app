"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
// Initialize DynamoDB client
const client = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;
// Helper function to create CORS headers
const createCorsHeaders = () => ({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
});
// Helper function to create error response
const createErrorResponse = (statusCode, message) => ({
    statusCode,
    headers: createCorsHeaders(),
    body: JSON.stringify({ error: message })
});
// Helper function to create success response
const createSuccessResponse = (statusCode, data) => ({
    statusCode,
    headers: createCorsHeaders(),
    body: JSON.stringify(data)
});
// Helper function to extract user ID from JWT token
const extractUserIdFromToken = (event) => {
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
    }
    catch (error) {
        console.error('Error extracting user ID:', error);
        return null;
    }
};
// Helper function to calculate duration in minutes
const calculateDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
};
// Helper function to validate time record data
const validateTimeRecord = (data) => {
    const errors = [];
    if (!data.project || typeof data.project !== 'string' || data.project.trim() === '') {
        errors.push('Project is required and must be a non-empty string');
    }
    if (!data.startTime || typeof data.startTime !== 'string') {
        errors.push('Start time is required and must be a valid ISO 8601 string');
    }
    else {
        const startDate = new Date(data.startTime);
        if (isNaN(startDate.getTime())) {
            errors.push('Start time must be a valid ISO 8601 timestamp');
        }
    }
    if (!data.endTime || typeof data.endTime !== 'string') {
        errors.push('End time is required and must be a valid ISO 8601 string');
    }
    else {
        const endDate = new Date(data.endTime);
        if (isNaN(endDate.getTime())) {
            errors.push('End time must be a valid ISO 8601 timestamp');
        }
    }
    if (!data.date || typeof data.date !== 'string') {
        errors.push('Date is required and must be in YYYY-MM-DD format');
    }
    else {
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
    }
    else if (data.tags && !data.tags.every((tag) => typeof tag === 'string')) {
        errors.push('All tags must be strings');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
};
// GET /api/time-records - List user's time records with filtering
const getTimeRecords = async (event) => {
    try {
        const userId = extractUserIdFromToken(event);
        if (!userId) {
            return createErrorResponse(401, 'Unauthorized: User ID not found');
        }
        const queryParams = event.queryStringParameters || {};
        const { startDate, endDate, project, limit = '50' } = queryParams;
        const params = {
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
        }
        else if (startDate) {
            params.KeyConditionExpression += ' AND SK >= :startSK';
            params.ExpressionAttributeValues[':startSK'] = `RECORD#${startDate}`;
        }
        else if (endDate) {
            params.KeyConditionExpression += ' AND SK <= :endSK';
            params.ExpressionAttributeValues[':endSK'] = `RECORD#${endDate}~`;
        }
        // Add project filtering if provided
        if (project) {
            params.FilterExpression = 'project = :project';
            params.ExpressionAttributeValues[':project'] = project;
        }
        const command = new lib_dynamodb_1.QueryCommand(params);
        const result = await docClient.send(command);
        const timeRecords = result.Items || [];
        return createSuccessResponse(200, {
            timeRecords,
            count: timeRecords.length,
            lastEvaluatedKey: result.LastEvaluatedKey
        });
    }
    catch (error) {
        console.error('Error getting time records:', error);
        return createErrorResponse(500, 'Internal server error');
    }
};
// POST /api/time-records - Create new time record
const createTimeRecord = async (event) => {
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
        const recordId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const duration = calculateDuration(data.startTime, data.endTime);
        const timeRecord = {
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
        const command = new lib_dynamodb_1.PutCommand({
            TableName: TABLE_NAME,
            Item: timeRecord
        });
        await docClient.send(command);
        return createSuccessResponse(201, timeRecord);
    }
    catch (error) {
        console.error('Error creating time record:', error);
        if (error instanceof SyntaxError) {
            return createErrorResponse(400, 'Invalid JSON in request body');
        }
        return createErrorResponse(500, 'Internal server error');
    }
};
// PUT /api/time-records/{id} - Update existing time record
const updateTimeRecord = async (event) => {
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
        const getCommand = new lib_dynamodb_1.QueryCommand({
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
            const deleteCommand = new lib_dynamodb_1.DeleteCommand({
                TableName: TABLE_NAME,
                Key: {
                    PK: existingRecord.PK,
                    SK: existingRecord.SK
                }
            });
            await docClient.send(deleteCommand);
            // Create new record with updated date
            const newTimeRecord = {
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
            const putCommand = new lib_dynamodb_1.PutCommand({
                TableName: TABLE_NAME,
                Item: newTimeRecord
            });
            await docClient.send(putCommand);
            return createSuccessResponse(200, newTimeRecord);
        }
        else {
            // Update existing record in place
            const updateCommand = new lib_dynamodb_1.UpdateCommand({
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
    }
    catch (error) {
        console.error('Error updating time record:', error);
        if (error instanceof SyntaxError) {
            return createErrorResponse(400, 'Invalid JSON in request body');
        }
        return createErrorResponse(500, 'Internal server error');
    }
};
// DELETE /api/time-records/{id} - Delete time record
const deleteTimeRecord = async (event) => {
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
        const getCommand = new lib_dynamodb_1.QueryCommand({
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
        const deleteCommand = new lib_dynamodb_1.DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: existingRecord.PK,
                SK: existingRecord.SK
            }
        });
        await docClient.send(deleteCommand);
        return createSuccessResponse(200, { message: 'Time record deleted successfully', recordId });
    }
    catch (error) {
        console.error('Error deleting time record:', error);
        return createErrorResponse(500, 'Internal server error');
    }
};
// GET /api/stats - Get aggregated statistics
const getStatistics = async (event) => {
    try {
        const userId = extractUserIdFromToken(event);
        if (!userId) {
            return createErrorResponse(401, 'Unauthorized: User ID not found');
        }
        const queryParams = event.queryStringParameters || {};
        const { startDate, endDate } = queryParams;
        const params = {
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
        }
        else if (startDate) {
            params.KeyConditionExpression += ' AND SK >= :startSK';
            params.ExpressionAttributeValues[':startSK'] = `RECORD#${startDate}`;
        }
        else if (endDate) {
            params.KeyConditionExpression += ' AND SK <= :endSK';
            params.ExpressionAttributeValues[':endSK'] = `RECORD#${endDate}~`;
        }
        const command = new lib_dynamodb_1.QueryCommand(params);
        const result = await docClient.send(command);
        const records = result.Items || [];
        // Calculate statistics
        const projectStats = new Map();
        const tagStats = new Map();
        const dailyStats = new Map();
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
                record.tags.forEach((tag) => {
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
    }
    catch (error) {
        console.error('Error getting statistics:', error);
        return createErrorResponse(500, 'Internal server error');
    }
};
const handler = async (event) => {
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
        }
        else if (path === '/api/time-records' && method === 'POST') {
            return await createTimeRecord(event);
        }
        else if (path.match(/^\/api\/time-records\/[^/]+$/) && method === 'PUT') {
            return await updateTimeRecord(event);
        }
        else if (path.match(/^\/api\/time-records\/[^/]+$/) && method === 'DELETE') {
            return await deleteTimeRecord(event);
        }
        else if (path === '/api/stats' && method === 'GET') {
            return await getStatistics(event);
        }
        else {
            return createErrorResponse(404, 'Not found');
        }
    }
    catch (error) {
        console.error('Unhandled error:', error);
        return createErrorResponse(500, 'Internal server error');
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw4REFBMEQ7QUFDMUQsd0RBQW1JO0FBQ25JLCtCQUFvQztBQUVwQyw2QkFBNkI7QUFDN0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztBQUN0RSxNQUFNLFNBQVMsR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFdEQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFXLENBQUM7QUFvQjNDLHlDQUF5QztBQUN6QyxNQUFNLGlCQUFpQixHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDL0IsY0FBYyxFQUFFLGtCQUFrQjtJQUNsQyw2QkFBNkIsRUFBRSxHQUFHO0lBQ2xDLDhCQUE4QixFQUFFLHNFQUFzRTtJQUN0Ryw4QkFBOEIsRUFBRSw2QkFBNkI7Q0FDOUQsQ0FBQyxDQUFDO0FBRUgsMkNBQTJDO0FBQzNDLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxVQUFrQixFQUFFLE9BQWUsRUFBeUIsRUFBRSxDQUFDLENBQUM7SUFDM0YsVUFBVTtJQUNWLE9BQU8sRUFBRSxpQkFBaUIsRUFBRTtJQUM1QixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQztDQUN6QyxDQUFDLENBQUM7QUFFSCw2Q0FBNkM7QUFDN0MsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLFVBQWtCLEVBQUUsSUFBUyxFQUF5QixFQUFFLENBQUMsQ0FBQztJQUN2RixVQUFVO0lBQ1YsT0FBTyxFQUFFLGlCQUFpQixFQUFFO0lBQzVCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztDQUMzQixDQUFDLENBQUM7QUFFSCxvREFB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S0FBSyxDQUFDLENBQUM7UUFDcEMsQ0FBQzthQUFNLENBQUM7WUFDTixPQUFPLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUMvQyxDQUFDO0lBQ0gsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sbUJBQW1CLENBQUMsR0FBRyxFQUFFLHVCQUF1QixDQUFDLENBQUM7SUFDM0QsQ0FBQztBQUNILENBQUMsQ0FBQztBQWxDVyxRQUFBLE9BQU8sV0FrQ2xCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgUXVlcnlDb21tYW5kLCBQdXRDb21tYW5kLCBVcGRhdGVDb21tYW5kLCBEZWxldGVDb21tYW5kLCBHZXRDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xuXG4vLyBJbml0aWFsaXplIER5bmFtb0RCIGNsaWVudFxuY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIH0pO1xuY29uc3QgZG9jQ2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKGNsaWVudCk7XG5cbmNvbnN0IFRBQkxFX05BTUUgPSBwcm9jZXNzLmVudi5UQUJMRV9OQU1FITtcblxuaW50ZXJmYWNlIFRpbWVSZWNvcmQge1xuICBQSzogc3RyaW5nOyAgICAgICAgICAgLy8gVVNFUiN7dXNlcklkfVxuICBTSzogc3RyaW5nOyAgICAgICAgICAgLy8gUkVDT1JEI3t0aW1lc3RhbXB9I3tyZWNvcmRJZH1cbiAgR1NJMVBLOiBzdHJpbmc7ICAgICAgIC8vIFBST0pFQ1Qje3Byb2plY3ROYW1lfVxuICBHU0kxU0s6IHN0cmluZzsgICAgICAgLy8gREFURSN7ZGF0ZX1cbiAgcmVjb3JkSWQ6IHN0cmluZzsgICAgIC8vIFVVSURcbiAgdXNlcklkOiBzdHJpbmc7ICAgICAgIC8vIENvZ25pdG8gdXNlciBJRFxuICBwcm9qZWN0OiBzdHJpbmc7ICAgICAgLy8gUHJvamVjdCBuYW1lXG4gIHN0YXJ0VGltZTogc3RyaW5nOyAgICAvLyBJU08gODYwMSB0aW1lc3RhbXBcbiAgZW5kVGltZTogc3RyaW5nOyAgICAgIC8vIElTTyA4NjAxIHRpbWVzdGFtcFxuICBkYXRlOiBzdHJpbmc7ICAgICAgICAgLy8gWVlZWS1NTS1ERCBmb3JtYXRcbiAgZHVyYXRpb246IG51bWJlcjsgICAgIC8vIER1cmF0aW9uIGluIG1pbnV0ZXNcbiAgY29tbWVudDogc3RyaW5nOyAgICAgIC8vIFVzZXIgY29tbWVudFxuICB0YWdzOiBzdHJpbmdbXTsgICAgICAgLy8gQXJyYXkgb2YgdGFnc1xuICBjcmVhdGVkQXQ6IHN0cmluZzsgICAgLy8gSVNPIDg2MDEgdGltZXN0YW1wXG4gIHVwZGF0ZWRBdDogc3RyaW5nOyAgICAvLyBJU08gODYwMSB0aW1lc3RhbXBcbn1cblxuLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNyZWF0ZSBDT1JTIGhlYWRlcnNcbmNvbnN0IGNyZWF0ZUNvcnNIZWFkZXJzID0gKCkgPT4gKHtcbiAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLFgtQW16LURhdGUsQXV0aG9yaXphdGlvbixYLUFwaS1LZXksWC1BbXotU2VjdXJpdHktVG9rZW4nLFxuICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdHRVQsUE9TVCxQVVQsREVMRVRFLE9QVElPTlMnXG59KTtcblxuLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNyZWF0ZSBlcnJvciByZXNwb25zZVxuY29uc3QgY3JlYXRlRXJyb3JSZXNwb25zZSA9IChzdGF0dXNDb2RlOiBudW1iZXIsIG1lc3NhZ2U6IHN0cmluZyk6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCA9PiAoe1xuICBzdGF0dXNDb2RlLFxuICBoZWFkZXJzOiBjcmVhdGVDb3JzSGVhZGVycygpLFxuICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBtZXNzYWdlIH0pXG59KTtcblxuLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNyZWF0ZSBzdWNjZXNzIHJlc3BvbnNlXG5jb25zdCBjcmVhdGVTdWNjZXNzUmVzcG9uc2UgPSAoc3RhdHVzQ29kZTogbnVtYmVyLCBkYXRhOiBhbnkpOiBBUElHYXRld2F5UHJveHlSZXN1bHQgPT4gKHtcbiAgc3RhdHVzQ29kZSxcbiAgaGVhZGVyczogY3JlYXRlQ29yc0hlYWRlcnMoKSxcbiAgYm9keTogSlNPTi5zdHJpbmdpZnkoZGF0YSlcbn0pO1xuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gZXh0cmFjdCB1c2VyIElEIGZyb20gSldUIHRva2VuXG5jb25zdCBleHRyYWN0VXNlcklkRnJvbVRva2VuID0gKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IHN0cmluZyB8IG51bGwgPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IGF1dGhIZWFkZXIgPSBldmVudC5oZWFkZXJzLkF1dGhvcml6YXRpb24gfHwgZXZlbnQuaGVhZGVycy5hdXRob3JpemF0aW9uO1xuICAgIGlmICghYXV0aEhlYWRlcikge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gRm9yIG5vdywgd2UnbGwgZXh0cmFjdCBmcm9tIHRoZSByZXF1ZXN0Q29udGV4dCBpZiBhdmFpbGFibGUgKEFQSSBHYXRld2F5IHdpdGggQ29nbml0byBhdXRob3JpemVyKVxuICAgIGlmIChldmVudC5yZXF1ZXN0Q29udGV4dD8uYXV0aG9yaXplcj8uY2xhaW1zPy5zdWIpIHtcbiAgICAgIHJldHVybiBldmVudC5yZXF1ZXN0Q29udGV4dC5hdXRob3JpemVyLmNsYWltcy5zdWI7XG4gICAgfVxuXG4gICAgLy8gSWYgbm8gYXV0aG9yaXplciBjb250ZXh0LCB3ZSdsbCBuZWVkIHRvIGRlY29kZSB0aGUgSldUIHRva2VuXG4gICAgLy8gRm9yIHNpbXBsaWNpdHkgaW4gdGhpcyBpbXBsZW1lbnRhdGlvbiwgd2UnbGwgcmV0dXJuIG51bGwgYW5kIGhhbmRsZSBhdXRoIGxhdGVyXG4gICAgcmV0dXJuIG51bGw7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZXh0cmFjdGluZyB1c2VyIElEOicsIGVycm9yKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufTtcblxuLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNhbGN1bGF0ZSBkdXJhdGlvbiBpbiBtaW51dGVzXG5jb25zdCBjYWxjdWxhdGVEdXJhdGlvbiA9IChzdGFydFRpbWU6IHN0cmluZywgZW5kVGltZTogc3RyaW5nKTogbnVtYmVyID0+IHtcbiAgY29uc3Qgc3RhcnQgPSBuZXcgRGF0ZShzdGFydFRpbWUpO1xuICBjb25zdCBlbmQgPSBuZXcgRGF0ZShlbmRUaW1lKTtcbiAgcmV0dXJuIE1hdGgucm91bmQoKGVuZC5nZXRUaW1lKCkgLSBzdGFydC5nZXRUaW1lKCkpIC8gKDEwMDAgKiA2MCkpO1xufTtcblxuLy8gSGVscGVyIGZ1bmN0aW9uIHRvIHZhbGlkYXRlIHRpbWUgcmVjb3JkIGRhdGFcbmNvbnN0IHZhbGlkYXRlVGltZVJlY29yZCA9IChkYXRhOiBhbnkpOiB7IGlzVmFsaWQ6IGJvb2xlYW47IGVycm9yczogc3RyaW5nW10gfSA9PiB7XG4gIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcblxuICBpZiAoIWRhdGEucHJvamVjdCB8fCB0eXBlb2YgZGF0YS5wcm9qZWN0ICE9PSAnc3RyaW5nJyB8fCBkYXRhLnByb2plY3QudHJpbSgpID09PSAnJykge1xuICAgIGVycm9ycy5wdXNoKCdQcm9qZWN0IGlzIHJlcXVpcmVkIGFuZCBtdXN0IGJlIGEgbm9uLWVtcHR5IHN0cmluZycpO1xuICB9XG5cbiAgaWYgKCFkYXRhLnN0YXJ0VGltZSB8fCB0eXBlb2YgZGF0YS5zdGFydFRpbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgZXJyb3JzLnB1c2goJ1N0YXJ0IHRpbWUgaXMgcmVxdWlyZWQgYW5kIG11c3QgYmUgYSB2YWxpZCBJU08gODYwMSBzdHJpbmcnKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBzdGFydERhdGUgPSBuZXcgRGF0ZShkYXRhLnN0YXJ0VGltZSk7XG4gICAgaWYgKGlzTmFOKHN0YXJ0RGF0ZS5nZXRUaW1lKCkpKSB7XG4gICAgICBlcnJvcnMucHVzaCgnU3RhcnQgdGltZSBtdXN0IGJlIGEgdmFsaWQgSVNPIDg2MDEgdGltZXN0YW1wJyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFkYXRhLmVuZFRpbWUgfHwgdHlwZW9mIGRhdGEuZW5kVGltZSAhPT0gJ3N0cmluZycpIHtcbiAgICBlcnJvcnMucHVzaCgnRW5kIHRpbWUgaXMgcmVxdWlyZWQgYW5kIG11c3QgYmUgYSB2YWxpZCBJU08gODYwMSBzdHJpbmcnKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBlbmREYXRlID0gbmV3IERhdGUoZGF0YS5lbmRUaW1lKTtcbiAgICBpZiAoaXNOYU4oZW5kRGF0ZS5nZXRUaW1lKCkpKSB7XG4gICAgICBlcnJvcnMucHVzaCgnRW5kIHRpbWUgbXVzdCBiZSBhIHZhbGlkIElTTyA4NjAxIHRpbWVzdGFtcCcpO1xuICAgIH1cbiAgfVxuXG4gIGlmICghZGF0YS5kYXRlIHx8IHR5cGVvZiBkYXRhLmRhdGUgIT09ICdzdHJpbmcnKSB7XG4gICAgZXJyb3JzLnB1c2goJ0RhdGUgaXMgcmVxdWlyZWQgYW5kIG11c3QgYmUgaW4gWVlZWS1NTS1ERCBmb3JtYXQnKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBkYXRlUmVnZXggPSAvXlxcZHs0fS1cXGR7Mn0tXFxkezJ9JC87XG4gICAgaWYgKCFkYXRlUmVnZXgudGVzdChkYXRhLmRhdGUpKSB7XG4gICAgICBlcnJvcnMucHVzaCgnRGF0ZSBtdXN0IGJlIGluIFlZWVktTU0tREQgZm9ybWF0Jyk7XG4gICAgfVxuICB9XG5cbiAgLy8gVmFsaWRhdGUgdGhhdCBlbmQgdGltZSBpcyBhZnRlciBzdGFydCB0aW1lXG4gIGlmIChkYXRhLnN0YXJ0VGltZSAmJiBkYXRhLmVuZFRpbWUpIHtcbiAgICBjb25zdCBzdGFydCA9IG5ldyBEYXRlKGRhdGEuc3RhcnRUaW1lKTtcbiAgICBjb25zdCBlbmQgPSBuZXcgRGF0ZShkYXRhLmVuZFRpbWUpO1xuICAgIGlmICghaXNOYU4oc3RhcnQuZ2V0VGltZSgpKSAmJiAhaXNOYU4oZW5kLmdldFRpbWUoKSkgJiYgZW5kIDw9IHN0YXJ0KSB7XG4gICAgICBlcnJvcnMucHVzaCgnRW5kIHRpbWUgbXVzdCBiZSBhZnRlciBzdGFydCB0aW1lJyk7XG4gICAgfVxuICB9XG5cbiAgLy8gVmFsaWRhdGUgb3B0aW9uYWwgZmllbGRzXG4gIGlmIChkYXRhLmNvbW1lbnQgJiYgdHlwZW9mIGRhdGEuY29tbWVudCAhPT0gJ3N0cmluZycpIHtcbiAgICBlcnJvcnMucHVzaCgnQ29tbWVudCBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gIH1cblxuICBpZiAoZGF0YS50YWdzICYmICFBcnJheS5pc0FycmF5KGRhdGEudGFncykpIHtcbiAgICBlcnJvcnMucHVzaCgnVGFncyBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gIH0gZWxzZSBpZiAoZGF0YS50YWdzICYmICFkYXRhLnRhZ3MuZXZlcnkoKHRhZzogYW55KSA9PiB0eXBlb2YgdGFnID09PSAnc3RyaW5nJykpIHtcbiAgICBlcnJvcnMucHVzaCgnQWxsIHRhZ3MgbXVzdCBiZSBzdHJpbmdzJyk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGlzVmFsaWQ6IGVycm9ycy5sZW5ndGggPT09IDAsXG4gICAgZXJyb3JzXG4gIH07XG59O1xuXG4vLyBHRVQgL2FwaS90aW1lLXJlY29yZHMgLSBMaXN0IHVzZXIncyB0aW1lIHJlY29yZHMgd2l0aCBmaWx0ZXJpbmdcbmNvbnN0IGdldFRpbWVSZWNvcmRzID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgdXNlcklkID0gZXh0cmFjdFVzZXJJZEZyb21Ub2tlbihldmVudCk7XG4gICAgaWYgKCF1c2VySWQpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMSwgJ1VuYXV0aG9yaXplZDogVXNlciBJRCBub3QgZm91bmQnKTtcbiAgICB9XG5cbiAgICBjb25zdCBxdWVyeVBhcmFtcyA9IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycyB8fCB7fTtcbiAgICBjb25zdCB7IHN0YXJ0RGF0ZSwgZW5kRGF0ZSwgcHJvamVjdCwgbGltaXQgPSAnNTAnIH0gPSBxdWVyeVBhcmFtcztcblxuICAgIGNvbnN0IHBhcmFtczogYW55ID0ge1xuICAgICAgVGFibGVOYW1lOiBUQUJMRV9OQU1FLFxuICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ1BLID0gOnBrJyxcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgJzpwayc6IGBVU0VSIyR7dXNlcklkfWBcbiAgICAgIH0sXG4gICAgICBTY2FuSW5kZXhGb3J3YXJkOiBmYWxzZSwgLy8gU29ydCBieSBTSyBpbiBkZXNjZW5kaW5nIG9yZGVyIChuZXdlc3QgZmlyc3QpXG4gICAgICBMaW1pdDogcGFyc2VJbnQobGltaXQpXG4gICAgfTtcblxuICAgIC8vIEFkZCBkYXRlIHJhbmdlIGZpbHRlcmluZyBpZiBwcm92aWRlZFxuICAgIGlmIChzdGFydERhdGUgJiYgZW5kRGF0ZSkge1xuICAgICAgcGFyYW1zLktleUNvbmRpdGlvbkV4cHJlc3Npb24gKz0gJyBBTkQgU0sgQkVUV0VFTiA6c3RhcnRTSyBBTkQgOmVuZFNLJztcbiAgICAgIHBhcmFtcy5FeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6c3RhcnRTSyddID0gYFJFQ09SRCMke3N0YXJ0RGF0ZX1gO1xuICAgICAgcGFyYW1zLkV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzplbmRTSyddID0gYFJFQ09SRCMke2VuZERhdGV9fmA7IC8vIH4gaXMgYWZ0ZXIgbnVtYmVycy9sZXR0ZXJzIGluIEFTQ0lJXG4gICAgfSBlbHNlIGlmIChzdGFydERhdGUpIHtcbiAgICAgIHBhcmFtcy5LZXlDb25kaXRpb25FeHByZXNzaW9uICs9ICcgQU5EIFNLID49IDpzdGFydFNLJztcbiAgICAgIHBhcmFtcy5FeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6c3RhcnRTSyddID0gYFJFQ09SRCMke3N0YXJ0RGF0ZX1gO1xuICAgIH0gZWxzZSBpZiAoZW5kRGF0ZSkge1xuICAgICAgcGFyYW1zLktleUNvbmRpdGlvbkV4cHJlc3Npb24gKz0gJyBBTkQgU0sgPD0gOmVuZFNLJztcbiAgICAgIHBhcmFtcy5FeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6ZW5kU0snXSA9IGBSRUNPUkQjJHtlbmREYXRlfX5gO1xuICAgIH1cblxuICAgIC8vIEFkZCBwcm9qZWN0IGZpbHRlcmluZyBpZiBwcm92aWRlZFxuICAgIGlmIChwcm9qZWN0KSB7XG4gICAgICBwYXJhbXMuRmlsdGVyRXhwcmVzc2lvbiA9ICdwcm9qZWN0ID0gOnByb2plY3QnO1xuICAgICAgcGFyYW1zLkV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpwcm9qZWN0J10gPSBwcm9qZWN0O1xuICAgIH1cblxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUXVlcnlDb21tYW5kKHBhcmFtcyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XG5cbiAgICBjb25zdCB0aW1lUmVjb3JkcyA9IHJlc3VsdC5JdGVtcyB8fCBbXTtcblxuICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2UoMjAwLCB7XG4gICAgICB0aW1lUmVjb3JkcyxcbiAgICAgIGNvdW50OiB0aW1lUmVjb3Jkcy5sZW5ndGgsXG4gICAgICBsYXN0RXZhbHVhdGVkS2V5OiByZXN1bHQuTGFzdEV2YWx1YXRlZEtleVxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdldHRpbmcgdGltZSByZWNvcmRzOicsIGVycm9yKTtcbiAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg1MDAsICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InKTtcbiAgfVxufTtcblxuLy8gUE9TVCAvYXBpL3RpbWUtcmVjb3JkcyAtIENyZWF0ZSBuZXcgdGltZSByZWNvcmRcbmNvbnN0IGNyZWF0ZVRpbWVSZWNvcmQgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB1c2VySWQgPSBleHRyYWN0VXNlcklkRnJvbVRva2VuKGV2ZW50KTtcbiAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAxLCAnVW5hdXRob3JpemVkOiBVc2VyIElEIG5vdCBmb3VuZCcpO1xuICAgIH1cblxuICAgIGlmICghZXZlbnQuYm9keSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XG4gICAgY29uc3QgdmFsaWRhdGlvbiA9IHZhbGlkYXRlVGltZVJlY29yZChkYXRhKTtcblxuICAgIGlmICghdmFsaWRhdGlvbi5pc1ZhbGlkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsIGBWYWxpZGF0aW9uIGVycm9yczogJHt2YWxpZGF0aW9uLmVycm9ycy5qb2luKCcsICcpfWApO1xuICAgIH1cblxuICAgIGNvbnN0IHJlY29yZElkID0gdXVpZHY0KCk7XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgIGNvbnN0IGR1cmF0aW9uID0gY2FsY3VsYXRlRHVyYXRpb24oZGF0YS5zdGFydFRpbWUsIGRhdGEuZW5kVGltZSk7XG5cbiAgICBjb25zdCB0aW1lUmVjb3JkOiBUaW1lUmVjb3JkID0ge1xuICAgICAgUEs6IGBVU0VSIyR7dXNlcklkfWAsXG4gICAgICBTSzogYFJFQ09SRCMke2RhdGEuZGF0ZX0jJHtyZWNvcmRJZH1gLFxuICAgICAgR1NJMVBLOiBgUFJPSkVDVCMke2RhdGEucHJvamVjdH1gLFxuICAgICAgR1NJMVNLOiBgREFURSMke2RhdGEuZGF0ZX1gLFxuICAgICAgcmVjb3JkSWQsXG4gICAgICB1c2VySWQsXG4gICAgICBwcm9qZWN0OiBkYXRhLnByb2plY3QudHJpbSgpLFxuICAgICAgc3RhcnRUaW1lOiBkYXRhLnN0YXJ0VGltZSxcbiAgICAgIGVuZFRpbWU6IGRhdGEuZW5kVGltZSxcbiAgICAgIGRhdGU6IGRhdGEuZGF0ZSxcbiAgICAgIGR1cmF0aW9uLFxuICAgICAgY29tbWVudDogZGF0YS5jb21tZW50IHx8ICcnLFxuICAgICAgdGFnczogZGF0YS50YWdzIHx8IFtdLFxuICAgICAgY3JlYXRlZEF0OiBub3csXG4gICAgICB1cGRhdGVkQXQ6IG5vd1xuICAgIH07XG5cbiAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1dENvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiBUQUJMRV9OQU1FLFxuICAgICAgSXRlbTogdGltZVJlY29yZFxuICAgIH0pO1xuXG4gICAgYXdhaXQgZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XG5cbiAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKDIwMSwgdGltZVJlY29yZCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgY3JlYXRpbmcgdGltZSByZWNvcmQ6JywgZXJyb3IpO1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIFN5bnRheEVycm9yKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdJbnZhbGlkIEpTT04gaW4gcmVxdWVzdCBib2R5Jyk7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ludGVybmFsIHNlcnZlciBlcnJvcicpO1xuICB9XG59O1xuXG4vLyBQVVQgL2FwaS90aW1lLXJlY29yZHMve2lkfSAtIFVwZGF0ZSBleGlzdGluZyB0aW1lIHJlY29yZFxuY29uc3QgdXBkYXRlVGltZVJlY29yZCA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHVzZXJJZCA9IGV4dHJhY3RVc2VySWRGcm9tVG9rZW4oZXZlbnQpO1xuICAgIGlmICghdXNlcklkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDEsICdVbmF1dGhvcml6ZWQ6IFVzZXIgSUQgbm90IGZvdW5kJyk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVjb3JkSWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8uaWQ7XG4gICAgaWYgKCFyZWNvcmRJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnUmVjb3JkIElEIGlzIHJlcXVpcmVkJyk7XG4gICAgfVxuXG4gICAgaWYgKCFldmVudC5ib2R5KSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcbiAgICBjb25zdCB2YWxpZGF0aW9uID0gdmFsaWRhdGVUaW1lUmVjb3JkKGRhdGEpO1xuXG4gICAgaWYgKCF2YWxpZGF0aW9uLmlzVmFsaWQpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgYFZhbGlkYXRpb24gZXJyb3JzOiAke3ZhbGlkYXRpb24uZXJyb3JzLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuXG4gICAgLy8gRmlyc3QsIGdldCB0aGUgZXhpc3RpbmcgcmVjb3JkIHRvIHZlcmlmeSBvd25lcnNoaXAgYW5kIGdldCB0aGUgY3VycmVudCBTS1xuICAgIGNvbnN0IGdldENvbW1hbmQgPSBuZXcgUXVlcnlDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogVEFCTEVfTkFNRSxcbiAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdQSyA9IDpwayBBTkQgYmVnaW5zX3dpdGgoU0ssIDpza1ByZWZpeCknLFxuICAgICAgRmlsdGVyRXhwcmVzc2lvbjogJ3JlY29yZElkID0gOnJlY29yZElkJyxcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgJzpwayc6IGBVU0VSIyR7dXNlcklkfWAsXG4gICAgICAgICc6c2tQcmVmaXgnOiAnUkVDT1JEIycsXG4gICAgICAgICc6cmVjb3JkSWQnOiByZWNvcmRJZFxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgZ2V0UmVzdWx0ID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQoZ2V0Q29tbWFuZCk7XG4gICAgY29uc3QgZXhpc3RpbmdSZWNvcmQgPSBnZXRSZXN1bHQuSXRlbXM/LlswXTtcblxuICAgIGlmICghZXhpc3RpbmdSZWNvcmQpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwNCwgJ1RpbWUgcmVjb3JkIG5vdCBmb3VuZCcpO1xuICAgIH1cblxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICBjb25zdCBkdXJhdGlvbiA9IGNhbGN1bGF0ZUR1cmF0aW9uKGRhdGEuc3RhcnRUaW1lLCBkYXRhLmVuZFRpbWUpO1xuXG4gICAgLy8gSWYgdGhlIGRhdGUgY2hhbmdlZCwgd2UgbmVlZCB0byBkZWxldGUgdGhlIG9sZCByZWNvcmQgYW5kIGNyZWF0ZSBhIG5ldyBvbmVcbiAgICAvLyBiZWNhdXNlIHRoZSBTSyBpbmNsdWRlcyB0aGUgZGF0ZVxuICAgIGlmIChkYXRhLmRhdGUgIT09IGV4aXN0aW5nUmVjb3JkLmRhdGUpIHtcbiAgICAgIC8vIERlbGV0ZSBvbGQgcmVjb3JkXG4gICAgICBjb25zdCBkZWxldGVDb21tYW5kID0gbmV3IERlbGV0ZUNvbW1hbmQoe1xuICAgICAgICBUYWJsZU5hbWU6IFRBQkxFX05BTUUsXG4gICAgICAgIEtleToge1xuICAgICAgICAgIFBLOiBleGlzdGluZ1JlY29yZC5QSyxcbiAgICAgICAgICBTSzogZXhpc3RpbmdSZWNvcmQuU0tcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBhd2FpdCBkb2NDbGllbnQuc2VuZChkZWxldGVDb21tYW5kKTtcblxuICAgICAgLy8gQ3JlYXRlIG5ldyByZWNvcmQgd2l0aCB1cGRhdGVkIGRhdGVcbiAgICAgIGNvbnN0IG5ld1RpbWVSZWNvcmQ6IFRpbWVSZWNvcmQgPSB7XG4gICAgICAgIFBLOiBgVVNFUiMke3VzZXJJZH1gLFxuICAgICAgICBTSzogYFJFQ09SRCMke2RhdGEuZGF0ZX0jJHtyZWNvcmRJZH1gLFxuICAgICAgICBHU0kxUEs6IGBQUk9KRUNUIyR7ZGF0YS5wcm9qZWN0fWAsXG4gICAgICAgIEdTSTFTSzogYERBVEUjJHtkYXRhLmRhdGV9YCxcbiAgICAgICAgcmVjb3JkSWQsXG4gICAgICAgIHVzZXJJZCxcbiAgICAgICAgcHJvamVjdDogZGF0YS5wcm9qZWN0LnRyaW0oKSxcbiAgICAgICAgc3RhcnRUaW1lOiBkYXRhLnN0YXJ0VGltZSxcbiAgICAgICAgZW5kVGltZTogZGF0YS5lbmRUaW1lLFxuICAgICAgICBkYXRlOiBkYXRhLmRhdGUsXG4gICAgICAgIGR1cmF0aW9uLFxuICAgICAgICBjb21tZW50OiBkYXRhLmNvbW1lbnQgfHwgJycsXG4gICAgICAgIHRhZ3M6IGRhdGEudGFncyB8fCBbXSxcbiAgICAgICAgY3JlYXRlZEF0OiBleGlzdGluZ1JlY29yZC5jcmVhdGVkQXQsXG4gICAgICAgIHVwZGF0ZWRBdDogbm93XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBwdXRDb21tYW5kID0gbmV3IFB1dENvbW1hbmQoe1xuICAgICAgICBUYWJsZU5hbWU6IFRBQkxFX05BTUUsXG4gICAgICAgIEl0ZW06IG5ld1RpbWVSZWNvcmRcbiAgICAgIH0pO1xuXG4gICAgICBhd2FpdCBkb2NDbGllbnQuc2VuZChwdXRDb21tYW5kKTtcbiAgICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2UoMjAwLCBuZXdUaW1lUmVjb3JkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVXBkYXRlIGV4aXN0aW5nIHJlY29yZCBpbiBwbGFjZVxuICAgICAgY29uc3QgdXBkYXRlQ29tbWFuZCA9IG5ldyBVcGRhdGVDb21tYW5kKHtcbiAgICAgICAgVGFibGVOYW1lOiBUQUJMRV9OQU1FLFxuICAgICAgICBLZXk6IHtcbiAgICAgICAgICBQSzogZXhpc3RpbmdSZWNvcmQuUEssXG4gICAgICAgICAgU0s6IGV4aXN0aW5nUmVjb3JkLlNLXG4gICAgICAgIH0sXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgcHJvamVjdCA9IDpwcm9qZWN0LCBzdGFydFRpbWUgPSA6c3RhcnRUaW1lLCBlbmRUaW1lID0gOmVuZFRpbWUsIGR1cmF0aW9uID0gOmR1cmF0aW9uLCBjb21tZW50ID0gOmNvbW1lbnQsIHRhZ3MgPSA6dGFncywgdXBkYXRlZEF0ID0gOnVwZGF0ZWRBdCwgR1NJMVBLID0gOmdzaTFwaycsXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgICAnOnByb2plY3QnOiBkYXRhLnByb2plY3QudHJpbSgpLFxuICAgICAgICAgICc6c3RhcnRUaW1lJzogZGF0YS5zdGFydFRpbWUsXG4gICAgICAgICAgJzplbmRUaW1lJzogZGF0YS5lbmRUaW1lLFxuICAgICAgICAgICc6ZHVyYXRpb24nOiBkdXJhdGlvbixcbiAgICAgICAgICAnOmNvbW1lbnQnOiBkYXRhLmNvbW1lbnQgfHwgJycsXG4gICAgICAgICAgJzp0YWdzJzogZGF0YS50YWdzIHx8IFtdLFxuICAgICAgICAgICc6dXBkYXRlZEF0Jzogbm93LFxuICAgICAgICAgICc6Z3NpMXBrJzogYFBST0pFQ1QjJHtkYXRhLnByb2plY3R9YFxuICAgICAgICB9LFxuICAgICAgICBSZXR1cm5WYWx1ZXM6ICdBTExfTkVXJ1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHVwZGF0ZVJlc3VsdCA9IGF3YWl0IGRvY0NsaWVudC5zZW5kKHVwZGF0ZUNvbW1hbmQpO1xuICAgICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSgyMDAsIHVwZGF0ZVJlc3VsdC5BdHRyaWJ1dGVzKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgdXBkYXRpbmcgdGltZSByZWNvcmQ6JywgZXJyb3IpO1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIFN5bnRheEVycm9yKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdJbnZhbGlkIEpTT04gaW4gcmVxdWVzdCBib2R5Jyk7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ludGVybmFsIHNlcnZlciBlcnJvcicpO1xuICB9XG59O1xuXG4vLyBERUxFVEUgL2FwaS90aW1lLXJlY29yZHMve2lkfSAtIERlbGV0ZSB0aW1lIHJlY29yZFxuY29uc3QgZGVsZXRlVGltZVJlY29yZCA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHVzZXJJZCA9IGV4dHJhY3RVc2VySWRGcm9tVG9rZW4oZXZlbnQpO1xuICAgIGlmICghdXNlcklkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDEsICdVbmF1dGhvcml6ZWQ6IFVzZXIgSUQgbm90IGZvdW5kJyk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVjb3JkSWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8uaWQ7XG4gICAgaWYgKCFyZWNvcmRJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnUmVjb3JkIElEIGlzIHJlcXVpcmVkJyk7XG4gICAgfVxuXG4gICAgLy8gRmlyc3QsIGdldCB0aGUgZXhpc3RpbmcgcmVjb3JkIHRvIHZlcmlmeSBvd25lcnNoaXAgYW5kIGdldCB0aGUgU0tcbiAgICBjb25zdCBnZXRDb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IFRBQkxFX05BTUUsXG4gICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnUEsgPSA6cGsgQU5EIGJlZ2luc193aXRoKFNLLCA6c2tQcmVmaXgpJyxcbiAgICAgIEZpbHRlckV4cHJlc3Npb246ICdyZWNvcmRJZCA9IDpyZWNvcmRJZCcsXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICc6cGsnOiBgVVNFUiMke3VzZXJJZH1gLFxuICAgICAgICAnOnNrUHJlZml4JzogJ1JFQ09SRCMnLFxuICAgICAgICAnOnJlY29yZElkJzogcmVjb3JkSWRcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IGdldFJlc3VsdCA9IGF3YWl0IGRvY0NsaWVudC5zZW5kKGdldENvbW1hbmQpO1xuICAgIGNvbnN0IGV4aXN0aW5nUmVjb3JkID0gZ2V0UmVzdWx0Lkl0ZW1zPy5bMF07XG5cbiAgICBpZiAoIWV4aXN0aW5nUmVjb3JkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDQsICdUaW1lIHJlY29yZCBub3QgZm91bmQnKTtcbiAgICB9XG5cbiAgICAvLyBEZWxldGUgdGhlIHJlY29yZFxuICAgIGNvbnN0IGRlbGV0ZUNvbW1hbmQgPSBuZXcgRGVsZXRlQ29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IFRBQkxFX05BTUUsXG4gICAgICBLZXk6IHtcbiAgICAgICAgUEs6IGV4aXN0aW5nUmVjb3JkLlBLLFxuICAgICAgICBTSzogZXhpc3RpbmdSZWNvcmQuU0tcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGF3YWl0IGRvY0NsaWVudC5zZW5kKGRlbGV0ZUNvbW1hbmQpO1xuXG4gICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSgyMDAsIHsgbWVzc2FnZTogJ1RpbWUgcmVjb3JkIGRlbGV0ZWQgc3VjY2Vzc2Z1bGx5JywgcmVjb3JkSWQgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZGVsZXRpbmcgdGltZSByZWNvcmQ6JywgZXJyb3IpO1xuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ludGVybmFsIHNlcnZlciBlcnJvcicpO1xuICB9XG59O1xuXG4vLyBHRVQgL2FwaS9zdGF0cyAtIEdldCBhZ2dyZWdhdGVkIHN0YXRpc3RpY3NcbmNvbnN0IGdldFN0YXRpc3RpY3MgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB1c2VySWQgPSBleHRyYWN0VXNlcklkRnJvbVRva2VuKGV2ZW50KTtcbiAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAxLCAnVW5hdXRob3JpemVkOiBVc2VyIElEIG5vdCBmb3VuZCcpO1xuICAgIH1cblxuICAgIGNvbnN0IHF1ZXJ5UGFyYW1zID0gZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzIHx8IHt9O1xuICAgIGNvbnN0IHsgc3RhcnREYXRlLCBlbmREYXRlIH0gPSBxdWVyeVBhcmFtcztcblxuICAgIGNvbnN0IHBhcmFtczogYW55ID0ge1xuICAgICAgVGFibGVOYW1lOiBUQUJMRV9OQU1FLFxuICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ1BLID0gOnBrIEFORCBiZWdpbnNfd2l0aChTSywgOnNrUHJlZml4KScsXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICc6cGsnOiBgVVNFUiMke3VzZXJJZH1gLFxuICAgICAgICAnOnNrUHJlZml4JzogJ1JFQ09SRCMnXG4gICAgICB9LFxuICAgICAgUHJvamVjdGlvbkV4cHJlc3Npb246ICdwcm9qZWN0LCBkdXJhdGlvbiwgI2RhdGUsIHRhZ3MnLFxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB7XG4gICAgICAgICcjZGF0ZSc6ICdkYXRlJ1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBBZGQgZGF0ZSByYW5nZSBmaWx0ZXJpbmcgaWYgcHJvdmlkZWRcbiAgICBpZiAoc3RhcnREYXRlICYmIGVuZERhdGUpIHtcbiAgICAgIHBhcmFtcy5LZXlDb25kaXRpb25FeHByZXNzaW9uICs9ICcgQU5EIFNLIEJFVFdFRU4gOnN0YXJ0U0sgQU5EIDplbmRTSyc7XG4gICAgICBwYXJhbXMuRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnN0YXJ0U0snXSA9IGBSRUNPUkQjJHtzdGFydERhdGV9YDtcbiAgICAgIHBhcmFtcy5FeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6ZW5kU0snXSA9IGBSRUNPUkQjJHtlbmREYXRlfX5gO1xuICAgIH0gZWxzZSBpZiAoc3RhcnREYXRlKSB7XG4gICAgICBwYXJhbXMuS2V5Q29uZGl0aW9uRXhwcmVzc2lvbiArPSAnIEFORCBTSyA+PSA6c3RhcnRTSyc7XG4gICAgICBwYXJhbXMuRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnN0YXJ0U0snXSA9IGBSRUNPUkQjJHtzdGFydERhdGV9YDtcbiAgICB9IGVsc2UgaWYgKGVuZERhdGUpIHtcbiAgICAgIHBhcmFtcy5LZXlDb25kaXRpb25FeHByZXNzaW9uICs9ICcgQU5EIFNLIDw9IDplbmRTSyc7XG4gICAgICBwYXJhbXMuRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmVuZFNLJ10gPSBgUkVDT1JEIyR7ZW5kRGF0ZX1+YDtcbiAgICB9XG5cbiAgICBjb25zdCBjb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZChwYXJhbXMpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xuXG4gICAgY29uc3QgcmVjb3JkcyA9IHJlc3VsdC5JdGVtcyB8fCBbXTtcblxuICAgIC8vIENhbGN1bGF0ZSBzdGF0aXN0aWNzXG4gICAgY29uc3QgcHJvamVjdFN0YXRzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcbiAgICBjb25zdCB0YWdTdGF0cyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG4gICAgY29uc3QgZGFpbHlTdGF0cyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG4gICAgbGV0IHRvdGFsRHVyYXRpb24gPSAwO1xuXG4gICAgcmVjb3Jkcy5mb3JFYWNoKHJlY29yZCA9PiB7XG4gICAgICBjb25zdCBkdXJhdGlvbiA9IHJlY29yZC5kdXJhdGlvbiB8fCAwO1xuICAgICAgdG90YWxEdXJhdGlvbiArPSBkdXJhdGlvbjtcblxuICAgICAgLy8gUHJvamVjdCBzdGF0aXN0aWNzXG4gICAgICBpZiAocmVjb3JkLnByb2plY3QpIHtcbiAgICAgICAgcHJvamVjdFN0YXRzLnNldChyZWNvcmQucHJvamVjdCwgKHByb2plY3RTdGF0cy5nZXQocmVjb3JkLnByb2plY3QpIHx8IDApICsgZHVyYXRpb24pO1xuICAgICAgfVxuXG4gICAgICAvLyBUYWcgc3RhdGlzdGljc1xuICAgICAgaWYgKHJlY29yZC50YWdzICYmIEFycmF5LmlzQXJyYXkocmVjb3JkLnRhZ3MpKSB7XG4gICAgICAgIHJlY29yZC50YWdzLmZvckVhY2goKHRhZzogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgdGFnU3RhdHMuc2V0KHRhZywgKHRhZ1N0YXRzLmdldCh0YWcpIHx8IDApICsgZHVyYXRpb24pO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gRGFpbHkgc3RhdGlzdGljc1xuICAgICAgaWYgKHJlY29yZC5kYXRlKSB7XG4gICAgICAgIGRhaWx5U3RhdHMuc2V0KHJlY29yZC5kYXRlLCAoZGFpbHlTdGF0cy5nZXQocmVjb3JkLmRhdGUpIHx8IDApICsgZHVyYXRpb24pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQ29udmVydCBtYXBzIHRvIGFycmF5cyBhbmQgc29ydFxuICAgIGNvbnN0IHByb2plY3RUb3RhbHMgPSBBcnJheS5mcm9tKHByb2plY3RTdGF0cy5lbnRyaWVzKCkpXG4gICAgICAubWFwKChbcHJvamVjdCwgZHVyYXRpb25dKSA9PiAoeyBwcm9qZWN0LCBkdXJhdGlvbiB9KSlcbiAgICAgIC5zb3J0KChhLCBiKSA9PiBiLmR1cmF0aW9uIC0gYS5kdXJhdGlvbik7XG5cbiAgICBjb25zdCB0YWdUb3RhbHMgPSBBcnJheS5mcm9tKHRhZ1N0YXRzLmVudHJpZXMoKSlcbiAgICAgIC5tYXAoKFt0YWcsIGR1cmF0aW9uXSkgPT4gKHsgdGFnLCBkdXJhdGlvbiB9KSlcbiAgICAgIC5zb3J0KChhLCBiKSA9PiBiLmR1cmF0aW9uIC0gYS5kdXJhdGlvbik7XG5cbiAgICBjb25zdCBkYWlseVRvdGFscyA9IEFycmF5LmZyb20oZGFpbHlTdGF0cy5lbnRyaWVzKCkpXG4gICAgICAubWFwKChbZGF0ZSwgZHVyYXRpb25dKSA9PiAoeyBkYXRlLCBkdXJhdGlvbiB9KSlcbiAgICAgIC5zb3J0KChhLCBiKSA9PiBhLmRhdGUubG9jYWxlQ29tcGFyZShiLmRhdGUpKTtcblxuICAgIC8vIENhbGN1bGF0ZSBhdmVyYWdlc1xuICAgIGNvbnN0IHRvdGFsRGF5cyA9IGRhaWx5U3RhdHMuc2l6ZTtcbiAgICBjb25zdCBhdmVyYWdlRGFpbHlUaW1lID0gdG90YWxEYXlzID4gMCA/IHRvdGFsRHVyYXRpb24gLyB0b3RhbERheXMgOiAwO1xuXG4gICAgY29uc3Qgc3RhdGlzdGljcyA9IHtcbiAgICAgIHRvdGFsRHVyYXRpb24sXG4gICAgICB0b3RhbFJlY29yZHM6IHJlY29yZHMubGVuZ3RoLFxuICAgICAgdG90YWxEYXlzLFxuICAgICAgYXZlcmFnZURhaWx5VGltZTogTWF0aC5yb3VuZChhdmVyYWdlRGFpbHlUaW1lKSxcbiAgICAgIHByb2plY3RUb3RhbHMsXG4gICAgICB0YWdUb3RhbHMsXG4gICAgICBkYWlseVRvdGFsc1xuICAgIH07XG5cbiAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKDIwMCwgc3RhdGlzdGljcyk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBzdGF0aXN0aWNzOicsIGVycm9yKTtcbiAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg1MDAsICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InKTtcbiAgfVxufTtcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XG4gIGNvbnNvbGUubG9nKCdFdmVudDonLCBKU09OLnN0cmluZ2lmeShldmVudCwgbnVsbCwgMikpO1xuXG4gIC8vIEhhbmRsZSBDT1JTIHByZWZsaWdodCByZXF1ZXN0c1xuICBpZiAoZXZlbnQuaHR0cE1ldGhvZCA9PT0gJ09QVElPTlMnKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgIGhlYWRlcnM6IGNyZWF0ZUNvcnNIZWFkZXJzKCksXG4gICAgICBib2R5OiAnJ1xuICAgIH07XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHBhdGggPSBldmVudC5wYXRoO1xuICAgIGNvbnN0IG1ldGhvZCA9IGV2ZW50Lmh0dHBNZXRob2Q7XG5cbiAgICAvLyBSb3V0ZSByZXF1ZXN0cyB0byBhcHByb3ByaWF0ZSBoYW5kbGVyc1xuICAgIGlmIChwYXRoID09PSAnL2FwaS90aW1lLXJlY29yZHMnICYmIG1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICAgIHJldHVybiBhd2FpdCBnZXRUaW1lUmVjb3JkcyhldmVudCk7XG4gICAgfSBlbHNlIGlmIChwYXRoID09PSAnL2FwaS90aW1lLXJlY29yZHMnICYmIG1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgICByZXR1cm4gYXdhaXQgY3JlYXRlVGltZVJlY29yZChldmVudCk7XG4gICAgfSBlbHNlIGlmIChwYXRoLm1hdGNoKC9eXFwvYXBpXFwvdGltZS1yZWNvcmRzXFwvW14vXSskLykgJiYgbWV0aG9kID09PSAnUFVUJykge1xuICAgICAgcmV0dXJuIGF3YWl0IHVwZGF0ZVRpbWVSZWNvcmQoZXZlbnQpO1xuICAgIH0gZWxzZSBpZiAocGF0aC5tYXRjaCgvXlxcL2FwaVxcL3RpbWUtcmVjb3Jkc1xcL1teL10rJC8pICYmIG1ldGhvZCA9PT0gJ0RFTEVURScpIHtcbiAgICAgIHJldHVybiBhd2FpdCBkZWxldGVUaW1lUmVjb3JkKGV2ZW50KTtcbiAgICB9IGVsc2UgaWYgKHBhdGggPT09ICcvYXBpL3N0YXRzJyAmJiBtZXRob2QgPT09ICdHRVQnKSB7XG4gICAgICByZXR1cm4gYXdhaXQgZ2V0U3RhdGlzdGljcyhldmVudCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwNCwgJ05vdCBmb3VuZCcpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdVbmhhbmRsZWQgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ludGVybmFsIHNlcnZlciBlcnJvcicpO1xuICB9XG59OyJdfQ==