# API Reference

This document describes all available API endpoints in YouTube Summarizer V2.

## Authentication

Protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens are obtained from the `/api/auth/login` or `/api/auth/register` endpoints.

---

## Health Check

### GET /api/health

Check if the application and database are running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response (503):**
```json
{
  "status": "error",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "error": "Database connection failed"
}
```

---

## Authentication

### POST /api/auth/register

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx1234567890",
    "email": "user@example.com"
  }
}
```

**Error Responses:**
- `400` - Invalid email format or password too short (min 8 characters)
- `409` - Email already registered

### POST /api/auth/login

Authenticate an existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx1234567890",
    "email": "user@example.com"
  }
}
```

**Error Responses:**
- `400` - Missing email or password
- `401` - Invalid credentials

---

## Summarization

### GET /api/summarize

Get available AI models and their status.

**Response:**
```json
{
  "models": [
    {
      "id": "glm-4.7",
      "name": "GLM-4.7",
      "description": "Z.AI's flagship model with thinking mode",
      "available": true,
      "supportsThinking": true
    },
    {
      "id": "gemini",
      "name": "Gemini",
      "description": "Google's fast and efficient model",
      "available": true,
      "supportsThinking": false
    }
  ]
}
```

### POST /api/summarize

Generate a video summary. Returns a streaming response with progress events.

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "detailLevel": 3
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| url | string | Yes | YouTube video URL |
| detailLevel | number | No | 1-5, default 3 (Balanced) |

**Response (Streaming):**

Each line is a JSON object:

```json
{"type": "progress", "stage": "fetching_transcript", "message": "Fetching transcript..."}
{"type": "progress", "stage": "analyzing_topics", "message": "Analyzing topics..."}
{"type": "progress", "stage": "generating_summary", "message": "Generating summary..."}
{"type": "progress", "stage": "building_timeline", "message": "Building timeline..."}
{"type": "complete", "status": "completed", "summary": {...}}
```

**Complete Event Summary Object:**
```json
{
  "id": "clx1234567890",
  "videoId": "dQw4w9WgXcQ",
  "title": "Video Title",
  "content": "# Summary\n\n...",
  "hasTimestamps": true,
  "topics": [
    {
      "id": "clx1234567891",
      "title": "Introduction",
      "startMs": 0,
      "endMs": 30000,
      "order": 1
    }
  ],
  "modelUsed": "glm-4.7",
  "source": "generated"
}
```

**Stages:**
1. `fetching_transcript` - Fetching video transcript from Supadata
2. `analyzing_topics` - Detecting topic boundaries
3. `generating_summary` - Generating summary with LLM
4. `building_timeline` - Extracting topics with timestamps

**Error Event:**
```json
{"type": "error", "error": "Invalid YouTube URL", "details": "..."}
```

---

## User Preferences

### GET /api/preferences

Get user's preferences. Requires authentication.

**Response:**
```json
{
  "success": true,
  "preferences": {
    "language": "en",
    "detailLevel": 3,
    "preferredModel": "glm-4.7",
    "thinkingMode": false,
    "customPrompt": null
  }
}
```

### POST /api/preferences

Update user's preferences. Requires authentication.

**Request Body (all fields optional):**
```json
{
  "language": "en",
  "detailLevel": 3,
  "preferredModel": "glm-4.7",
  "thinkingMode": true,
  "customPrompt": "Custom prompt template..."
}
```

**Response:**
```json
{
  "success": true,
  "preferences": {
    "language": "en",
    "detailLevel": 3,
    "preferredModel": "glm-4.7",
    "thinkingMode": true,
    "customPrompt": "Custom prompt template..."
  }
}
```

---

## Topic Editing

### GET /api/topics/edit?summaryId={id}

Get topics for a summary with user's custom edits applied. Requires authentication.

**Query Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| summaryId | Yes | Summary ID |

**Response:**
```json
{
  "success": true,
  "summaryId": "clx1234567890",
  "topics": [
    {
      "id": "clx1234567891",
      "title": "Custom Title",
      "startMs": 0,
      "endMs": 30000,
      "order": 1,
      "isEdited": true
    }
  ]
}
```

### POST /api/topics/edit

Save custom topic edits. Requires authentication.

**Request Body:**
```json
{
  "summaryId": "clx1234567890",
  "topics": [
    {
      "topicId": "clx1234567891",
      "customTitle": "My Custom Title",
      "customStartMs": 0,
      "customEndMs": 35000
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Saved 1 topic edit(s)",
  "editCount": 1
}
```

---

## Prompt Templates

### GET /api/templates

Get user's prompt templates. Requires authentication.

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "id": "clx1234567890",
      "name": "Default Template",
      "content": "Summarize the following...",
      "isDefault": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### POST /api/templates

Create a new template. Requires authentication.

**Request Body:**
```json
{
  "name": "My Custom Template",
  "content": "Please summarize {{transcript}} in {{language}}..."
}
```

### PUT /api/templates

Update an existing template. Requires authentication.

**Request Body:**
```json
{
  "id": "clx1234567890",
  "name": "Updated Name",
  "content": "Updated content..."
}
```

### DELETE /api/templates?id={id}

Delete a template. Default templates cannot be deleted. Requires authentication.

---

## Usage Statistics

### GET /api/usage

Get API usage statistics. Requires authentication.

**Query Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| startDate | No | Filter start date (ISO 8601) |
| endDate | No | Filter end date (ISO 8601) |

**Response:**
```json
{
  "success": true,
  "usage": {
    "byService": [
      {
        "service": "supadata",
        "totalRequests": 10,
        "totalCredits": 10.0,
        "totalTokens": 0
      },
      {
        "service": "glm-4.7",
        "totalRequests": 8,
        "totalCredits": 0,
        "totalTokens": 15000
      }
    ],
    "daily": {
      "2024-01-15": { "requests": 5 },
      "2024-01-14": { "requests": 3 }
    },
    "weekly": {
      "2024-W03": { "requests": 8 }
    },
    "monthly": {
      "2024-01": { "requests": 10 }
    },
    "recentLogs": [
      {
        "id": "clx1234567890",
        "service": "supadata",
        "endpoint": "transcript",
        "creditsUsed": 1.0,
        "tokensUsed": 0,
        "timestamp": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

## API Keys Management

### GET /api/settings/api-keys

Get configured API keys (masked). Requires authentication.

**Response:**
```json
{
  "success": true,
  "apiKeys": {
    "supadata": { "configured": true, "maskedKey": "..............abcd" },
    "zai": { "configured": true, "maskedKey": "..............efgh" },
    "gemini": { "configured": false },
    "groq": { "configured": false },
    "openai": { "configured": false }
  }
}
```

### DELETE /api/settings/api-keys?service={service}

Remove an API key. Requires authentication.

**Query Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| service | Yes | Service name (supadata, zai, gemini, groq, openai) |

---

## Setup Endpoints

### POST /api/setup/test-key

Test if an API key is valid.

**Request Body:**
```json
{
  "service": "supadata",
  "apiKey": "your-api-key"
}
```

**Response:**
```json
{
  "success": true,
  "message": "API key is valid"
}
```

### POST /api/setup/save-key

Save an API key (encrypted).

**Request Body:**
```json
{
  "service": "supadata",
  "apiKey": "your-api-key"
}
```

---

## History

### GET /api/history

Get summary history.

**Response:**
```json
{
  "success": true,
  "summaries": [
    {
      "id": "clx1234567890",
      "videoId": "dQw4w9WgXcQ",
      "title": "Video Title",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### GET /api/history/{id}

Get a specific summary by ID.

### DELETE /api/history/{id}

Delete a summary.

---

## Error Responses

All endpoints may return these error codes:

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Permission denied |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error |

Error response format:
```json
{
  "error": "Error message here",
  "details": "Additional details (optional)"
}
```
