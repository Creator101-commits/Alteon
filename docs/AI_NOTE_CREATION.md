# AI Note Creation Feature

## Overview
Added AI-powered note generation feature to the Notes page, allowing users to create structured study notes from text input or uploaded documents (PDF, PPTX, XLSX).

## Implementation Date
December 2024

## Features

### 1. **Two Creation Modes**
Users can create notes via:
- **Create with AI**: Generate structured notes using AI
- **Manual Entry**: Traditional manual note creation

### 2. **AI Input Options**

#### Text Input Mode
- Users paste or type content (lecture notes, articles, etc.)
- AI formats it into structured study notes
- Ideal for: Converting raw text into organized notes

#### Document Upload Mode
- Accepts: PDF, PPTX, XLSX files (max 10MB)
- Uses existing document processing system
- AI extracts and structures content automatically
- Real-time processing status indicators

## User Flow

### Creating AI Notes
1. Click "New Note" button
2. Select "Create with AI" from dropdown
3. Choose input method:
   - **Text**: Paste content → Click "Generate Note"
   - **Document**: Upload file → Wait for processing → Click "Generate Note"
4. AI generates structured note with:
   - Descriptive title
   - Well-formatted content (HTML)
   - Suggested category
   - Relevant tags (3-5 keywords)
5. Note automatically saved and displayed

### Manual Note Creation
1. Click "New Note" button
2. Select "Manual Entry" from dropdown
3. Opens traditional note editor

## Technical Implementation

### Components Modified
- **File**: `src/pages/notes.tsx`
- **New Component**: `AiNoteDialog` (inline component)

### State Management
```typescript
const [showAiDialog, setShowAiDialog] = useState(false);
const [aiInputType, setAiInputType] = useState<"text" | "document">("text");
const [aiInputText, setAiInputText] = useState("");
const [uploadedDocument, setUploadedDocument] = useState<{
  jobId: string;
  fileName: string;
  status: "uploading" | "processing" | "ready" | "error";
  content?: string;
} | null>(null);
const [isGenerating, setIsGenerating] = useState(false);
```

### Key Functions

#### `handleDocumentUpload(file: File)`
- Uploads document to `/api/document-intel/sessions`
- Initiates document processing
- Triggers polling for content extraction

#### `pollDocumentContent(jobId: string)`
- Polls `/api/document-intel/sessions/:jobId/content` every 2 seconds
- Maximum 30 attempts (60 seconds timeout)
- Updates status: uploading → processing → ready/error

#### `generateAiNote()`
- Sends content to Groq API (llama-3.1-70b-versatile)
- AI prompt generates structured note format
- Parses JSON response with title, content, category, tags
- Saves note via `handleSaveNote()`

### AI Prompt Design
```
System: Create well-structured study notes with:
1. Clear, descriptive title
2. HTML-formatted content (headings, bullets, highlights)
3. Suggested category (from predefined list)
4. 3-5 relevant tags

Response Format: JSON
{
  "title": "Note title",
  "content": "HTML formatted content",
  "category": "category name",
  "tags": ["tag1", "tag2", "tag3"]
}
```

### Document Processing Integration
- Reuses existing document processing system
- Same endpoints as AI Chat and Flashcards
- Supports PDF (pdf-parse), PPTX (jszip), XLSX (xlsx)
- 30-minute content cache (documentContentStore)

## UI Components

### Dialog Layout
- **Header**: Title with sparkle icon, description
- **Input Type Selector**: Radio buttons for text/document
- **Text Area**: For manual content input (8 rows)
- **Document Upload**: 
  - Drag-drop zone with file picker
  - Processing status badges
  - Remove option
- **Action Buttons**: Cancel / Generate Note

### Visual Feedback
- Loading spinner during generation
- Processing status for documents:
  - "Uploading..."
  - "Processing document..."
  - "Ready to generate notes"
  - "Upload failed"
- Success badge when document ready
- Disabled generate button until content ready

## Error Handling

### Document Upload Errors
- Network failures during upload
- Processing timeout (60 seconds)
- Invalid file types
- Toast notifications for all errors

### AI Generation Errors
- Missing content validation
- Groq API failures
- JSON parsing errors
- Graceful fallback with error messages

## Integration Points

### Existing Systems Used
1. **Document Processing Service** (`server/document-processing/`)
   - Upload endpoint
   - Content extraction
   - Polling mechanism

2. **Groq AI API**
   - Model: llama-3.1-70b-versatile
   - Temperature: 0.7
   - Max tokens: 2000

3. **Note Management**
   - `handleSaveNote()` function
   - Category system
   - Tag management
   - Class association

## Dependencies

### New Imports
```typescript
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Sparkles, Loader2 } from "lucide-react";
```

### API Endpoints Used
- `POST /api/document-intel/sessions` - Document upload
- `GET /api/document-intel/sessions/:jobId/content` - Content retrieval
- `https://api.groq.com/openai/v1/chat/completions` - AI generation

### Environment Variables
- `VITE_GROQ_API_KEY` - Groq API authentication

## User Benefits

### Efficiency
- Convert lengthy documents into concise notes instantly
- No manual formatting or organization needed
- Batch process multiple documents

### Quality
- Consistent note structure
- Key concepts automatically highlighted
- Relevant tags generated
- Appropriate categorization

### Flexibility
- Choose between AI or manual creation
- Support for multiple file formats
- Text input for quick conversions
- Full control over final output

## Future Enhancements

### Potential Improvements
1. **Batch Processing**: Upload multiple documents at once
2. **Custom Prompts**: User-defined note formatting preferences
3. **Language Support**: Multi-language document processing
4. **Template Library**: Pre-configured note templates
5. **Citation Extraction**: Automatically extract and format references
6. **Image OCR**: Extract text from images in documents
7. **Audio Transcription**: Convert audio lectures to notes
8. **Collaborative Notes**: Share and merge AI-generated notes

### Performance Optimizations
- Parallel document processing
- Caching frequently accessed content
- Streaming AI responses for faster feedback
- Progressive loading for large documents

## Accessibility

### Keyboard Navigation
- Tab navigation through dialog
- Enter to confirm actions
- Escape to cancel

### Screen Readers
- Descriptive labels on all inputs
- Status announcements for processing
- Error message clarity

## Testing Recommendations

### Test Cases
1. **Text Input**
   - Empty input validation
   - Long text (>5000 chars)
   - Special characters in content
   - Multiple paragraphs

2. **Document Upload**
   - PDF with text
   - PPTX with slides
   - XLSX with tables
   - Mixed content documents
   - Invalid file types
   - Files >10MB
   - Network interruption during upload

3. **AI Generation**
   - Short content (<100 words)
   - Long content (>2000 words)
   - Technical jargon
   - Multiple topics
   - Non-English content

4. **Edge Cases**
   - Rapid consecutive uploads
   - Cancel during processing
   - Browser refresh during generation
   - Multiple dialogs open
   - Offline mode

## Maintenance Notes

### Configuration
- Adjust polling interval in `pollDocumentContent()` if needed
- Modify max attempts based on average processing time
- Update AI model in `generateAiNote()` for better results

### Monitoring
- Track document processing success rate
- Monitor AI generation token usage
- Log failed document types
- Measure user preference (text vs document)

### Known Limitations
- 10MB file size limit
- 60-second processing timeout
- Single document at a time
- English-optimized AI prompts
- Requires GROQ API key

## Related Documentation
- [AI Chat Document Content Fix](./AI_CHAT_DOCUMENT_CONTENT_FIX.md)
- [Document Processing Integration](./DOCUMENT_PROCESSING_INTEGRATION.md)
- [Document Processing Completion](./DOCUMENT_PROCESSING_COMPLETION.md)
- [Flashcard Migration Guide](./FLASHCARD_MIGRATION_GUIDE.md)

## Code Quality

### Best Practices Followed
- TypeScript strict typing
- Async/await for API calls
- Proper error boundaries
- Loading states for UX
- Cleanup on component unmount
- Descriptive variable names
- Modular function design

### Code Organization
- Grouped related state variables
- Functions ordered logically
- Inline component for dialog
- Clear separation of concerns
- Consistent naming conventions
