# AI Chat Document Content Integration Fix

## Overview
Fixed the issue where AI chat was only seeing the document title and not the actual extracted content when users uploaded documents.

## Problem
When users uploaded documents (PDF, PPTX, XLSX) to AI chat and asked questions about them, the AI assistant could only reference the document title and metadata, not the actual text content. The content was being extracted and formatted but not made accessible to the chat interface.

## Solution Implemented

### 1. Backend: Content Storage & Retrieval

#### Added Content Storage in `server/document-processing/service.ts`
- **Content Store**: Created `documentContentStore` Map to hold formatted document content
  ```typescript
  const documentContentStore = new Map<string, {
    content: string;
    userId: string;
    expiresAt: number;
  }>();
  ```

- **Content Formatting**: Added `formatContentForChat()` method to combine extracted text blocks into a single, well-formatted string:
  - Includes document metadata (title, author, dates)
  - Combines all text blocks with their headings
  - Adds document structure/hierarchy
  - Creates coherent narrative for AI consumption

- **Storage on Completion**: Modified `handleJob()` to store formatted content when processing completes:
  ```typescript
  const formattedContent = this.formatContentForChat(parsed);
  documentContentStore.set(job.id, {
    content: formattedContent,
    userId: job.userId,
    expiresAt: Date.now() + 30 * 60 * 1000 // 30 minutes
  });
  ```

- **Auto-Cleanup**: Set timeout to remove content after 30 minutes for memory management

#### Added GET Endpoint in `bindUploadRoute()`
- **Route**: `GET /api/document-intel/sessions/:jobId/content`
- **Authentication**: Requires `x-user-id` header
- **Authorization**: Verifies document belongs to requesting user
- **Expiry Handling**: Returns 410 if content has expired
- **Response**:
  ```json
  {
    "jobId": "string",
    "content": "string",
    "expiresAt": number
  }
  ```

### 2. Frontend: Content Fetching & Integration

#### Updated Polling in `src/pages/ai-chat.tsx`

**Modified `pollDocumentStatus()` Function**:
- Changed from simulated 5-second timeout to real API polling
- Polls `GET /api/document-intel/sessions/:jobId/content` every 2 seconds
- Stores `extractedContent` in `uploadedDocument` state when ready
- Handles 404 (still processing), 200 (ready), and error responses
- Clears interval when content is successfully retrieved

**Enhanced `handleChatMessage()` Function**:
- Checks if document has `extractedContent` available
- Adds full document content to system context:
  ```typescript
  if (uploadedDocument.extractedContent) {
    systemContext += `\n\n**DOCUMENT CONTENT:**\n${uploadedDocument.extractedContent}
    \n\n**INSTRUCTIONS:** When answering questions, reference the above document 
    content directly. Provide specific information from the document, quote 
    relevant sections when helpful, and help the user understand the content 
    thoroughly.`;
  }
  ```
- Passes enhanced context to Groq API for AI responses

## Technical Details

### Content Format
The `formatContentForChat()` method creates structured content:
```
# Document Metadata
**Title:** [Document Title]
**Author:** [Author Name]
**Created:** [Creation Date]

# Content

## [Section Heading]
[Section text content]

## [Another Section]
[More content]

# Document Structure
[Hierarchy information if available]
```

### Security & Privacy
- **User Scoping**: Content only accessible by user who uploaded it
- **Expiry**: Automatic cleanup after 30 minutes
- **Authentication**: Requires valid user ID header
- **Authorization**: Verifies document ownership before serving content

### Memory Management
- Content stored in-memory for 30 minutes
- Auto-cleanup via `setTimeout()` removes expired entries
- Explicit deletion on 410 responses
- No persistent storage of document content

## Workflow

1. **Upload**: User uploads document to `/api/document-intel/sessions`
2. **Processing**: Document parsed and content extracted
3. **Storage**: Formatted content stored in `documentContentStore` with 30-min TTL
4. **Polling**: Frontend polls `/api/document-intel/sessions/:jobId/content` every 2 seconds
5. **Retrieval**: When ready (200 OK), content fetched and stored in React state
6. **Chat Integration**: When user sends message, content included in AI system context
7. **AI Response**: Groq API receives full document content and can reference it accurately

## User Experience Improvements

### Before
- ❌ AI only knew document title
- ❌ Generic responses: "Based on the document title..."
- ❌ Could not answer specific questions about content

### After
- ✅ AI has full document text
- ✅ Specific answers: "According to section 3.2..."
- ✅ Can quote directly from document
- ✅ Understands context and nuances
- ✅ Provides accurate summaries and explanations

## Testing Checklist

- [ ] Upload PDF document
- [ ] Wait for "Document Processing Complete!" message
- [ ] Ask: "What is this document about?"
- [ ] Verify AI references actual content, not just title
- [ ] Ask: "Summarize the main points"
- [ ] Verify AI provides specific information from document
- [ ] Ask about specific sections/concepts
- [ ] Verify AI quotes relevant parts
- [ ] Test with PPTX document
- [ ] Test with XLSX document
- [ ] Verify 30-minute expiry (content becomes unavailable)
- [ ] Test concurrent uploads (multiple documents)

## File Changes

### Modified Files
1. `server/document-processing/service.ts`
   - Added `documentContentStore` Map
   - Added `formatContentForChat()` method
   - Modified `handleJob()` to store content
   - Added GET `/api/document-intel/sessions/:jobId/content` endpoint

2. `src/pages/ai-chat.tsx`
   - Updated `pollDocumentStatus()` with real API calls
   - Enhanced `handleChatMessage()` to include document content
   - Added `extractedContent` to system context

## Related Documentation
- [AI_CHAT_DOCUMENT_UPLOAD.md](./AI_CHAT_DOCUMENT_UPLOAD.md) - Original document upload implementation
- [DOCUMENT_PROCESSING_COMPLETION.md](./DOCUMENT_PROCESSING_COMPLETION.md) - Document processing system overview
- [EPHEMERAL_DOCUMENT_INTELLIGENCE.md](./EPHEMERAL_DOCUMENT_INTELLIGENCE.md) - Full system architecture

## Notes
- Educational asset generation (flashcards, assignments, notes) was removed as per user request
- System now focuses solely on chat-based document discussion
- Content is ephemeral and automatically cleaned up
- No persistent storage of uploaded documents or extracted content
