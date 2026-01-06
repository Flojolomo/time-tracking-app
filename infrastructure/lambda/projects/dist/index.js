"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
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
// GET /api/projects/suggestions - Get project suggestions
const getProjectSuggestions = async (event) => {
    try {
        const userId = extractUserIdFromToken(event);
        if (!userId) {
            return createErrorResponse(401, 'Unauthorized: User ID not found');
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
        const command = new lib_dynamodb_1.QueryCommand(params);
        const result = await docClient.send(command);
        // Extract unique projects and filter by query
        const projectsMap = new Map();
        (result.Items || []).forEach(item => {
            if (item.project && (!query || item.project.toLowerCase().includes(query.toLowerCase()))) {
                if (!projectsMap.has(item.project) || item.updatedAt > projectsMap.get(item.project).lastUsed) {
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
        });
    }
    catch (error) {
        console.error('Error getting project suggestions:', error);
        return createErrorResponse(500, 'Internal server error');
    }
};
// GET /api/projects - Get all user projects
const getProjects = async (event) => {
    try {
        const userId = extractUserIdFromToken(event);
        if (!userId) {
            return createErrorResponse(401, 'Unauthorized: User ID not found');
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
        const command = new lib_dynamodb_1.QueryCommand(params);
        const result = await docClient.send(command);
        // Aggregate project statistics
        const projectsMap = new Map();
        (result.Items || []).forEach(item => {
            if (item.project) {
                const existing = projectsMap.get(item.project);
                if (existing) {
                    existing.totalDuration += item.duration || 0;
                    existing.totalRecords += 1;
                    if (item.updatedAt > existing.lastUsed) {
                        existing.lastUsed = item.updatedAt;
                    }
                }
                else {
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
        });
    }
    catch (error) {
        console.error('Error getting projects:', error);
        return createErrorResponse(500, 'Internal server error');
    }
};
// Main handler function
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
        if (path === '/api/projects/suggestions' && method === 'GET') {
            return await getProjectSuggestions(event);
        }
        else if (path === '/api/projects' && method === 'GET') {
            return await getProjects(event);
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
//# sourceMappingURL=index.js.map