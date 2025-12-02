# API Documentation - AlteonV1

This document provides comprehensive API documentation for the AlteonV1 backend services.

## Base URL
```
Development: http://localhost:5000/api
Production: https://api.alteon.com/api
```

## Authentication

All API endpoints require authentication via Firebase JWT tokens. Include the token in the request headers:

```
Authorization: Bearer <firebase_jwt_token>
x-user-id: <user_id>
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": {...},
  "message": "Success message"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Endpoints

### Authentication

#### POST /auth/login
Authenticate user with Firebase token.

**Request:**
```json
{
  "token": "firebase_jwt_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name"
    }
  }
}
```

#### POST /auth/logout
Logout user and invalidate session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Users

#### GET /users/:userId
Get user profile information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "avatar_url",
    "preferences": {...},
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### PUT /users/:userId
Update user profile.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "avatar": "new_avatar_url"
}
```

### Notes

#### GET /users/:userId/notes
Get all notes for a user.

**Query Parameters:**
- `classId` (optional): Filter by class ID
- `category` (optional): Filter by category
- `search` (optional): Search in title and content

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "note_id",
      "title": "Note Title",
      "content": "Note content",
      "category": "Study",
      "tags": ["math", "algebra"],
      "isPinned": false,
      "color": "#3B82F6",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /users/:userId/notes
Create a new note.

**Request:**
```json
{
  "title": "Note Title",
  "content": "Note content",
  "category": "Study",
  "tags": ["math", "algebra"],
  "color": "#3B82F6",
  "isPinned": false,
  "classId": "class_id"
}
```

#### PUT /notes/:id
Update an existing note.

**Request:**
```json
{
  "title": "Updated Title",
  "content": "Updated content",
  "category": "Work"
}
```

#### DELETE /notes/:id
Delete a note.

**Response:**
```json
{
  "success": true,
  "message": "Note deleted successfully"
}
```

### Flashcards

#### GET /users/:userId/flashcards
Get all flashcards for a user.

**Query Parameters:**
- `classId` (optional): Filter by class ID
- `difficulty` (optional): Filter by difficulty level

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "flashcard_id",
      "front": "Question or front content",
      "back": "Answer or back content",
      "difficulty": "medium",
      "lastReviewed": "2024-01-01T00:00:00Z",
      "reviewCount": 5,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /users/:userId/flashcards
Create a new flashcard.

**Request:**
```json
{
  "front": "Question or front content",
  "back": "Answer or back content",
  "difficulty": "medium",
  "classId": "class_id"
}
```

#### PUT /flashcards/:id
Update flashcard statistics after review.

**Request:**
```json
{
  "correct": true,
  "difficulty": "easy"
}
```

#### DELETE /flashcards/:id
Delete a flashcard.

### Mood Entries

#### GET /users/:userId/mood-entries
Get mood entries for a user.

**Query Parameters:**
- `startDate` (optional): Start date filter (ISO string)
- `endDate` (optional): End date filter (ISO string)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "mood_id",
      "mood": 4,
      "notes": "Feeling great today!",
      "date": "2024-01-01T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /users/:userId/mood-entries
Create a new mood entry.

**Request:**
```json
{
  "mood": 4,
  "notes": "Feeling great today!"
}
```

**Note:** Mood scale is 1-5 (1 = very bad, 5 = excellent)

### Journal Entries

#### GET /users/:userId/journal-entries
Get journal entries for a user.

**Query Parameters:**
- `startDate` (optional): Start date filter (ISO string)
- `endDate` (optional): End date filter (ISO string)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "journal_id",
      "content": "Today I accomplished...",
      "date": "2024-01-01T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /users/:userId/journal-entries
Create a new journal entry.

**Request:**
```json
{
  "content": "Today I accomplished..."
}
```

#### PUT /journal-entries/:id
Update an existing journal entry.

**Request:**
```json
{
  "content": "Updated journal content"
}
```

#### DELETE /journal-entries/:id
Delete a journal entry.

### Pomodoro Sessions

#### GET /users/:userId/pomodoro-sessions
Get pomodoro sessions for a user.

**Query Parameters:**
- `startDate` (optional): Start date filter (ISO string)
- `endDate` (optional): End date filter (ISO string)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "session_id",
      "duration": 25,
      "type": "work",
      "completedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /users/:userId/pomodoro-sessions
Create a new pomodoro session.

**Request:**
```json
{
  "duration": 25,
  "type": "work"
}
```

### AI Services

#### POST /ai/chat
Send a message to the AI chat assistant.

**Request:**
```json
{
  "message": "Hello, can you help me study for my math test?",
  "context": "math_study"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "I'd be happy to help you study for your math test! What specific topics are you working on?",
    "conversationId": "conv_id",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

#### POST /ai/summarize
Summarize text content.

**Request:**
```json
{
  "content": "Long text content to summarize...",
  "type": "text",
  "maxLength": 200
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": "Summarized content...",
    "originalLength": 1500,
    "summaryLength": 180,
    "type": "text"
  }
}
```

#### POST /ai/summarize/youtube
Summarize YouTube video transcript.

**Request:**
```json
{
  "url": "https://youtube.com/watch?v=video_id",
  "maxLength": 300
}
```

#### GET /users/:userId/ai-summaries
Get AI summary history for a user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "summary_id",
      "title": "Summary Title",
      "summary": "Summary content...",
      "originalContent": "Original content...",
      "summaryType": "youtube",
      "fileType": "video",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /users/:userId/ai-summaries
Save AI summary to user's history.

**Request:**
```json
{
  "title": "Summary Title",
  "summary": "Summary content...",
  "originalContent": "Original content...",
  "summaryType": "text",
  "fileType": "document"
}
```

### Bell Schedule

#### GET /users/:userId/bell-schedule
Get bell schedule for a user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "schedule_id",
      "periodName": "Math Class",
      "startTime": "09:00",
      "endTime": "10:00"
    }
  ]
}
```

#### POST /users/:userId/bell-schedule
Add a new period to bell schedule.

**Request:**
```json
{
  "periodName": "Math Class",
  "startTime": "09:00",
  "endTime": "10:00"
}
```

#### PUT /bell-schedule/:id
Update a bell schedule period.

#### DELETE /bell-schedule/:id
Delete a bell schedule period.

### Classes

#### GET /users/:userId/classes
Get all classes for a user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "class_id",
      "name": "Mathematics 101",
      "section": "A",
      "color": "#3B82F6",
      "description": "Advanced mathematics course",
      "teacherName": "Dr. Smith",
      "teacherEmail": "smith@university.edu",
      "googleClassroomId": "gc_id",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /users/:userId/classes
Create a new class.

**Request:**
```json
{
  "name": "Mathematics 101",
  "section": "A",
  "color": "#3B82F6",
  "description": "Advanced mathematics course",
  "teacherName": "Dr. Smith",
  "teacherEmail": "smith@university.edu"
}
```

### Assignments

#### GET /users/:userId/assignments
Get assignments for a user.

**Query Parameters:**
- `classId` (optional): Filter by class ID
- `status` (optional): Filter by status (pending, completed, overdue)
- `dueDate` (optional): Filter by due date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "assignment_id",
      "title": "Math Homework",
      "description": "Complete exercises 1-10",
      "dueDate": "2024-01-15T23:59:59Z",
      "priority": "high",
      "status": "pending",
      "classId": "class_id",
      "googleClassroomId": "gc_assignment_id",
      "isCustom": false,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /users/:userId/assignments
Create a new assignment.

**Request:**
```json
{
  "title": "Math Homework",
  "description": "Complete exercises 1-10",
  "dueDate": "2024-01-15T23:59:59Z",
  "priority": "high",
  "classId": "class_id"
}
```

#### PUT /assignments/:id
Update an assignment.

#### DELETE /assignments/:id
Delete an assignment.

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication token required |
| `INVALID_TOKEN` | Invalid or expired token |
| `USER_NOT_FOUND` | User does not exist |
| `VALIDATION_ERROR` | Request validation failed |
| `DATABASE_ERROR` | Database operation failed |
| `AI_SERVICE_ERROR` | AI service unavailable |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

## Rate Limits

- **General API**: 1000 requests per hour per user
- **AI Services**: 100 requests per hour per user
- **File Upload**: 50MB per request

## WebSocket Events

### Connection
Connect to WebSocket at `ws://localhost:5000/ws`

### Events

#### `message`
Real-time chat messages
```json
{
  "type": "message",
  "data": {
    "id": "message_id",
    "content": "Message content",
    "userId": "user_id",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

#### `notification`
System notifications
```json
{
  "type": "notification",
  "data": {
    "title": "New Assignment",
    "message": "Math homework due tomorrow",
    "type": "assignment_due"
  }
}
```

## SDKs and Libraries

### JavaScript/TypeScript
```bash
npm install @alteon/api-client
```

```typescript
import { AlteonClient } from '@alteon/api-client';

const client = new AlteonClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.alteon.com'
});

const notes = await client.notes.getAll();
```

### Python
```bash
pip install alteon-api
```

```python
from alteon import AlteonClient

client = AlteonClient(api_key='your_api_key')
notes = client.notes.get_all()
```

## Changelog

### v1.0.0 (2024-01-01)
- Initial API release
- Core productivity features
- AI integration
- Oracle Cloud Database support

---

For more information, visit our [GitHub repository](https://github.com/Creator101-commits/AlteonV1) or contact support at support@alteon.com.
