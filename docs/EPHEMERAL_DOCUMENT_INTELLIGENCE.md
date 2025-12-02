# Alteon V1 Ephemeral Document Intelligence System

## Overview

This document captures the architecture, security posture, and integration strategy for Alteon V1's ephemeral document intelligence pipeline. The goal is to transform uploaded academic documents (PDF, PPTX, XLSX) into high-value study assets without ever persisting the source files. All processing completes in memory, outputs are routed into existing Alteon learning tools, and privacy guarantees exceed FERPA/GDPR requirements.

---

## Guiding Principles

- **Ephemeral by default** – Uploaded files are streamed directly into sandboxed workers, processed in memory, and wiped within minutes. No disk writes, caches, or recoverable replicas are permitted.
- **Privacy-first cryptography** – Every job receives a self-expiring symmetric key used to encrypt transient buffers. Keys are destroyed as soon as the job exits the `COMPLETED` or `FAILED` terminal state.
- **Separation of concerns** – Parsing, AI enrichment, and orchestration run in dedicated microservices communicating via an in-memory message bus. Each service operates inside a restricted sandbox with zero knowledge about other flows.
- **Cost containment** – Parsing is 100% free. Only downstream educational AI calls (Groq llama-3.1-8b-instant or llama-3.1-70b-versatile) consume paid tokens, and they are invoked only when the student opts in.
- **Real-time UX** – Students monitor job progress through server-pushed WebSocket events. Frontend progress UIs show validation, extraction, enrichment, and publication phases with ETAs.

---

## High-Level Architecture

```
┌──────────────┐      ┌────────────────────┐      ┌──────────────────────┐
│ Upload API   │────▶│ Ephemeral Orchestrator │──▶│ Document Workers      │
│ (Express)    │      │  (queue + state)   │      │  (PDF/PPTX/XLSX)      │
└──────────────┘      └────────┬───────────┘      └───────┬──────────────┘
                                │                           │
                                │                           │
                                ▼                           ▼
                          ┌────────────┐             ┌────────────────┐
                          │ AI Service │◀────────────│ Free Parsers   │
                          │ (Groq)     │             │ (PDF.js, etc.) │
                          └────┬───────┘             └────────┬───────┘
                               │                              │
                               ▼                              ▼
                      ┌──────────────────┐          ┌────────────────────┐
                      │ Publication Bus  │────────▶│ Alteon Learning Tools │
                      └──────────────────┘          └────────────────────┘
```

### Components

- **Upload API** – Receives `multipart/form-data`, validates size constraints, allocates a job, and streams file buffers directly into the orchestrator.
- **Ephemeral Orchestrator** – Manages job lifecycle, issues per-job encryption keys, publishes progress events, and coordinates worker execution. Uses an in-memory queue with fan-out channels per document type.
- **Document Workers** – Specialized sandboxed workers:
  - `pdf-worker` uses `pdfjs-dist` + `pdf2json` to extract text, images, structure, math.
  - `pptx-worker` uses `jszip` + XML DOM parsing for slides, notes, multimedia.
  - `xlsx-worker` uses `SheetJS` to read worksheets, formulas, charts, statistics.
- **AI Service Layer** – Calls Alteon’s Groq integration only when a student requests AI enhancements. Generates notes, flashcards, study guides, and chat embeddings.
- **Publication Bus** – Persists generated educational assets to Alteon (notes, flashcards, assignments, analytics summaries) and broadcasts UI-ready payloads via WebSocket.

---

## Security & Privacy

- **In-memory storage** – Temporary buffers live inside a locked `BufferArena` abstraction backed by Node `SharedArrayBuffer`. Data is AES-256-GCM encrypted at rest in memory pools.
- **Ephemeral keys** – `crypto.randomBytes(32)` per job. Keys stored in process-local secure map, automatically purged with `setTimeout` (default 3 minutes) and on job termination.
- **Sandboxed workers** – `worker_threads` spun up with `resourceLimits` and `MAX_OLD_SPACE_SIZE` caps. Filesystem access is disabled by running in `vm` contexts.
- **Immutable audit trail** – `document_processing_sessions` table records job metadata (user, type, durations, status) without storing content. Audit rows are append-only to support compliance.
- **Zero-trust boundaries** – Operators and support staff cannot decrypt buffers or inspect document contents. Only AI outputs survive and they are owned by students.

---

## Data Model Extensions

1. **document_processing_sessions**
   - Tracks user, document type, status timestamps, anonymized metadata, and output pointers.
   - Enforces TTL cleanup via cron that removes rows after 14 days while keeping aggregate analytics.
2. **document_processing_jobs**
   - Stores high-resolution job telemetry (phase durations, failure codes) for operational analytics.
3. **document_generated_assets**
   - Maps each AI-generated artifact (note, flashcard, guide, assignment suggestion, chat reference) to its processing session.

> None of the tables store raw file contents, page images, or reconstructions.

---

## API Surface

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/document-intel/sessions` | `POST` | Initiate upload, returns job ID and WebSocket channel token. |
| `/api/document-intel/sessions/:id/status` | `GET` | Poll fallback for current status (mirrors WebSocket). |
| `/api/document-intel/sessions/:id/assets` | `GET` | Retrieve normalized AI outputs ready for integration. |
| `/api/document-intel/limits` | `GET` | Exposes current per-type size caps for UI validation. |

Uploads use `multipart/form-data` with memory storage. Validation rejects oversize documents and returns actionable hints.

---

## Frontend Experience

- **Document Intelligence Workspace** (`/documents`) combines upload, live progress, and generated asset previews.
- **Progress timeline** – Steps show `Validating → Extracting → Structuring → AI Enhancing → Publishing` with real-time ticks.
- **Output carousels** – Students can inspect notes, flashcards, study guides, assignments, and launch document-aware chats immediately.
- **Diff integration** – Notes can be inserted into the existing AI diff workflow to maintain consistent approval mechanics.
- **Calendar & assignment hooks** – Suggested study schedules sync to Alteon calendar and assignment tracker through existing APIs.

---

## Performance Targets

- Parsing completion ≤ 30s for typical academic documents (≤25 pages PDF, ≤75 slides PPTX, ≤50k cells XLSX).
- AI enrichment ≤ 90s when llama-3.1-70b-versatile is selected; ≤45s for llama-3.1-8b-instant.
- Total time to published assets ≤ 120s.

Workers process documents in parallel (text, images, tables concurrently). Queue back-pressure prevents overload, and horizontal scaling spins up additional worker pools per document type.

---

## Quality Controls

- Automated regression suite uses canonical sample documents per subject to assert extraction fidelity and AI output accuracy.
- Semantic validators ensure flashcards cover all primary headings, notes retain logical hierarchy, and study guides reference prerequisite knowledge.
- Student feedback loop allows rating generated assets; ratings feed adaptive prompts for improved future outputs.

---

## Deployment & Operations

- Microservices run as separate Node processes behind a shared NATS-like in-memory bus (implemented with clustered `ws` + `redis` pub/sub in production, in-memory for dev).
- Observability via structured logs, OpenTelemetry traces, and Prometheus metrics. Alerts fire on failure rate >1% or latency breaches.
- Security reviews test for residual data leaks, key lifetime enforcement, and sandbox escape attempts.

---

## Next Steps

1. Finalize IaC scripts for provisioning dedicated worker pools and WebSocket gateways.
2. Conduct privacy impact assessment to document compliance posture.
3. Expand analytics dashboards to surface document intelligence adoption metrics.
4. Run pilot with selected student cohort, gather qualitative feedback, and iterate on AI prompt tuning.

This architecture positions Alteon V1 as a privacy-leading educational intelligence platform, delivering immediate value without compromising document confidentiality.
