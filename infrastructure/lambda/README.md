# Time Tracking API Lambda Functions

This directory contains the AWS Lambda functions that implement the Time Tracking API.

## Structure

- `timeRecords/` - Lambda function handling time records CRUD operations and statistics
- `projects/` - Lambda function handling project suggestions and project data

## Build System

### Directory Structure
```
infrastructure/
├── lambda/
│   ├── timeRecords/
│   │   ├── src/           # TypeScript source files
│   │   ├── dist/          # Compiled JavaScript (excluded from git)
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── projects/
│       ├── src/           # TypeScript source files
│       ├── dist/          # Compiled JavaScript (excluded from git)
│       ├── package.json
│       └── tsconfig.json
├── dist/                  # Infrastructure compiled files (excluded from git)
├── lib/                   # Infrastructure TypeScript source
├── bin/                   # Infrastructure TypeScript source
└── package.json
```

### Build Commands

From the `infrastructure/` directory:

```bash
# Build everything (infrastructure + all lambdas)
npm run build:all

# Build only infrastructure
npm run build

# Build only lambda functions
npm run build:lambdas

# Build individual lambda functions
npm run build:lambda:timeRecords
npm run build:lambda:projects

# Clean compiled files
npm run clean:all          # Clean everything
npm run clean              # Clean infrastructure only
npm run clean:lambdas      # Clean lambda functions only

# CDK commands (automatically build before running)
npm run deploy             # Build all + deploy
npm run synth              # Build all + synthesize
npm run diff               # Build all + show diff
```

### Version Control

All compiled files are excluded from version control:
- `infrastructure/dist/` - Infrastructure compiled files
- `infrastructure/lambda/*/dist/` - Lambda compiled files
- `infrastructure/cdk.out/` - CDK output files

Only TypeScript source files and configuration are tracked in git.

## API Endpoints

### Time Records API (`timeRecords/`)

#### GET /api/time-records
Get user's time records with optional filtering.

**Query Parameters:**
- `startDate` (optional): Filter records from this date (YYYY-MM-DD)
- `endDate` (optional): Filter records to this date (YYYY-MM-DD)  
- `project` (optional): Filter records by project name
- `limit` (optional): Maximum number of records to return (default: 50)

**Response:**
```json
{
  "timeRecords": [...],
  "count": 10,
  "lastEvaluatedKey": "..."
}
```

#### POST /api/time-records
Create a new time record.

**Request Body:**
```json
{
  "project": "My Project",
  "startTime": "2024-01-06T09:00:00.000Z",
  "endTime": "2024-01-06T17:00:00.000Z", 
  "date": "2024-01-06",
  "comment": "Working on feature X",
  "tags": ["development", "frontend"]
}
```

**Response:** Created time record object

#### PUT /api/time-records/{id}
Update an existing time record.

**Request Body:** Same as POST
**Response:** Updated time record object

#### DELETE /api/time-records/{id}
Delete a time record.

**Response:**
```json
{
  "message": "Time record deleted successfully",
  "recordId": "uuid"
}
```

#### GET /api/stats
Get aggregated statistics for user's time records.

**Query Parameters:**
- `startDate` (optional): Calculate stats from this date
- `endDate` (optional): Calculate stats to this date

**Response:**
```json
{
  "totalDuration": 480,
  "totalRecords": 5,
  "totalDays": 3,
  "averageDailyTime": 160,
  "projectTotals": [
    {"project": "Project A", "duration": 300},
    {"project": "Project B", "duration": 180}
  ],
  "tagTotals": [
    {"tag": "development", "duration": 400},
    {"tag": "testing", "duration": 80}
  ],
  "dailyTotals": [
    {"date": "2024-01-06", "duration": 480}
  ]
}
```

### Projects API (`projects/`)

#### GET /api/projects
Get all user projects with statistics.

**Response:**
```json
{
  "projects": [
    {
      "projectName": "My Project",
      "totalDuration": 480,
      "totalRecords": 5,
      "lastUsed": "2024-01-06T17:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### GET /api/projects/suggestions
Get project name suggestions for autocomplete.

**Query Parameters:**
- `q` (optional): Search query to filter suggestions
- `limit` (optional): Maximum suggestions to return (default: 10)

**Response:**
```json
{
  "suggestions": ["My Project", "Another Project"],
  "count": 2
}
```

## Data Model

Time records are stored in DynamoDB with the following structure:

```typescript
interface TimeRecord {
  PK: string;           // USER#{userId}
  SK: string;           // RECORD#{date}#{recordId}
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
```

## Authentication

All endpoints expect user authentication through AWS Cognito. The user ID is extracted from the JWT token in the Authorization header or from the API Gateway request context when using a Cognito authorizer.

## Error Handling

All endpoints return standardized error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request (validation errors)
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

## CORS

All endpoints include proper CORS headers to allow cross-origin requests from the frontend application.