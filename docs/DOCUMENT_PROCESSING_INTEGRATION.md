# Document Processing Integration Guide

## Quick Start

### 1. Enable the Service

Add to `server/index.ts`:

```typescript
import { documentProcessingService } from "./document-processing/service";

// After Express app initialization
documentProcessingService.bindUploadRoute(app);
console.log("✓ Document Intelligence service enabled at /api/document-intel/sessions");
```

### 2. Environment Variables

Add to `.env`:

```bash
# Required for AI generation
GROQ_API_KEY=gsk_your_api_key_here

# Optional configuration
EPHEMERAL_KEY_TTL_MS=180000        # 3 minutes
JOB_EXPIRATION_MS=300000           # 5 minutes
```

### 3. Test the API

```bash
# Upload a PDF
curl -X POST http://localhost:5000/api/document-intel/sessions \
  -H "x-user-id: test-user-123" \
  -F "file=@sample.pdf"

# Response:
# {
#   "jobId": "550e8400-e29b-41d4-a716-446655440000",
#   "phase": "received",
#   "createdAt": 1699999999999
# }
```

### 4. Monitor Progress (Optional WebSocket)

Add to your WebSocket server:

```typescript
import { documentProcessingService } from "./document-processing/service";

documentProcessingService.on("progress", (event) => {
  // Broadcast to user
  wsServer.sendToUser(event.userId, {
    type: "document-processing-progress",
    jobId: event.jobId,
    phase: event.phase,
    percent: event.progress,
    detail: event.detail,
  });
});
```

## Frontend Components (To Create)

### Upload Interface

```typescript
// src/pages/DocumentIntelligence.tsx
import { useState } from "react";

export default function DocumentIntelligence() {
  const [uploading, setUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/document-intel/sessions", {
      method: "POST",
      headers: {
        "x-user-id": getCurrentUserId(),
      },
      body: formData,
    });

    const data = await response.json();
    setJobId(data.jobId);
    setUploading(false);
  };

  return (
    <div>
      <h1>Document Intelligence</h1>
      <input
        type="file"
        accept=".pdf,.pptx,.xlsx"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        disabled={uploading}
      />
      {uploading && <p>Processing...</p>}
      {jobId && <p>Job ID: {jobId}</p>}
    </div>
  );
}
```

### Progress Display

```typescript
// src/components/DocumentProcessingProgress.tsx
import { useEffect, useState } from "react";

export function DocumentProcessingProgress({ jobId }: { jobId: string }) {
  const [phase, setPhase] = useState("received");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Subscribe to WebSocket progress events
    const unsubscribe = subscribeToDocumentProgress(jobId, (event) => {
      setPhase(event.phase);
      setProgress(event.percent || 0);
    });

    return unsubscribe;
  }, [jobId]);

  const phases = [
    { name: "received", label: "Received" },
    { name: "parsing", label: "Parsing" },
    { name: "ai-generation", label: "Generating Assets" },
    { name: "publishing", label: "Publishing" },
    { name: "completed", label: "Complete" },
  ];

  return (
    <div className="space-y-2">
      {phases.map((p) => (
        <div
          key={p.name}
          className={`flex items-center gap-2 ${
            phase === p.name ? "text-blue-600 font-bold" : "text-gray-400"
          }`}
        >
          {phase === p.name ? "→" : "✓"} {p.label}
        </div>
      ))}
      <div className="mt-4">
        <div className="bg-gray-200 h-2 rounded">
          <div
            className="bg-blue-600 h-2 rounded transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

## Database Migration (Optional)

If you want to persist session metadata:

```sql
-- migrations/document_sessions.sql
CREATE TABLE document_processing_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  job_id VARCHAR(36) UNIQUE NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  kind VARCHAR(10) NOT NULL CHECK (kind IN ('pdf', 'pptx', 'xlsx')),
  status VARCHAR(20) NOT NULL DEFAULT 'processing',
  phase VARCHAR(20),
  error TEXT,
  byte_size INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON document_processing_sessions(user_id);
CREATE INDEX idx_sessions_job_id ON document_processing_sessions(job_id);
CREATE INDEX idx_sessions_created_at ON document_processing_sessions(created_at);
```

Then update `server/storage.ts` to use real database persistence:

```typescript
import { db } from "./database";

export async function createDocumentSession(data: {
  userId: string;
  jobId: string;
  fileName: string;
  kind: "pdf" | "pptx" | "xlsx";
}) {
  const session = {
    id: randomUUID(),
    user_id: data.userId,
    job_id: data.jobId,
    file_name: data.fileName,
    kind: data.kind,
    status: "processing",
    created_at: new Date(),
  };

  await db.insert(documentProcessingSessions).values(session);
  return session;
}
```

## Testing

### Manual Testing

1. **PDF Upload**:
   ```bash
   curl -X POST http://localhost:5000/api/document-intel/sessions \
     -H "x-user-id: test-user" \
     -F "file=@test.pdf"
   ```

2. **PPTX Upload**:
   ```bash
   curl -X POST http://localhost:5000/api/document-intel/sessions \
     -H "x-user-id: test-user" \
     -F "file=@presentation.pptx"
   ```

3. **XLSX Upload**:
   ```bash
   curl -X POST http://localhost:5000/api/document-intel/sessions \
     -H "x-user-id: test-user" \
     -F "file=@data.xlsx"
   ```

### Expected Output

Check server logs for:
```
✓ Document received: test.pdf (245 KB)
→ Parsing PDF...
→ Extracted 12 text blocks, 3 images, 2 tables
→ Generating educational assets via Groq AI...
→ Generated: 8 notes, 15 flashcards, 1 study guide, 2 assignments
→ Publishing to database...
✓ Document processing complete (jobId: xxx)
```

### Error Scenarios

1. **File too large**: Returns 400 with "File size exceeds limit"
2. **Invalid file type**: Returns 400 with "Unsupported document type"
3. **Missing user ID**: Returns 401 with "Authentication required"
4. **AI API failure**: Falls back to deterministic content generation

## Monitoring

### Add Metrics

```typescript
// Track processing times
documentProcessingService.on("progress", (event) => {
  if (event.phase === "completed") {
    const duration = Date.now() - event.createdAt;
    console.log(`Document processed in ${duration}ms`);
    // Send to monitoring service
  }
});
```

### Memory Monitoring

```typescript
setInterval(() => {
  const usage = process.memoryUsage();
  console.log({
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
  });
}, 60000); // Every minute
```

## Production Checklist

- [ ] Set `GROQ_API_KEY` in production environment
- [ ] Configure proper user authentication (replace `x-user-id` header)
- [ ] Set up WebSocket server for progress notifications
- [ ] Create database migration for sessions table
- [ ] Add monitoring and alerting
- [ ] Test with large files (PDF 25 pages, PPTX 75 slides, XLSX 50k cells)
- [ ] Configure reverse proxy (nginx) for file upload size limits
- [ ] Set up CORS for frontend domain
- [ ] Add rate limiting per user
- [ ] Configure S3 or cloud storage for document backups (optional)

## Troubleshooting

### "Module not found" errors
```bash
npm install
```

### "GROQ_API_KEY not set"
Add to `.env`:
```bash
GROQ_API_KEY=gsk_your_key_here
```

### "x-user-id header missing"
Ensure frontend sends header:
```typescript
headers: {
  "x-user-id": getCurrentUserId(),
}
```

### Memory leaks
Check ephemeral store is purging:
```typescript
// Should see in logs every 5 minutes:
// "Purged X expired jobs"
```

## Support

- Architecture: `docs/EPHEMERAL_DOCUMENT_INTELLIGENCE.md`
- Implementation: `docs/DOCUMENT_PROCESSING_COMPLETION.md`
- API Reference: `server/document-processing/service.ts`
