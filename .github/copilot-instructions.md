## AlteonV1 Copilot Instructions

Concise, project-specific guidance for AI coding agents. Focus on existing patterns only.

### Core Architecture
- Monorepo-style single app: React (Vite) frontend + Express/TypeScript backend in `server/` served from same process (`server/index.ts`).
- Storage abstraction: prefer `optimizedStorage` (adds query caching, batching, connection pooling) and falls back to `storage` (`OracleStorage` or `LocalStorageFallback`). Do NOT bypass these layers; never query Oracle directly in new code.
- Data schemas defined centrally in `shared/schema.ts` using Drizzle + Zod. All inbound API payloads validated with the corresponding `insert*Schema` in `server/routes.ts`.
- User identity is passed via request header `x-user-id` (or `user-id`). Backend trusts frontend Firebase auth; missing header = 401 style error. Always propagate this header in new fetch calls.
- Document intelligence pipeline lives under `server/document-processing/` (queue, ephemeral store, parsers). Generated assets persisted via `saveGeneratedAssets()` using normal storage methods.

### Backend Patterns
- Route registration in `server/routes.ts`; prefer adding endpoints there using existing Zod parse → storage call → JSON response pattern. Keep responses small (< ~80 chars logged) or they will be truncated in request logging middleware.
- Logging: Only API routes get condensed logs via wrapper in `server/index.ts`. Avoid console spam inside hot paths; use single summarizing line.
- Error handling: Throw or return standardized `{ message }`. Validation errors return `400` with `errors` array (see existing user & assignment handlers).
- Sync flows: Google Classroom sync (`/api/sync/google-classroom`) demonstrates idempotent upsert using external IDs (googleClassroomId). Mirror this pattern for new external integrations.
- Time handling: Dates saved as JS Date objects; Oracle serialization handled in storage layer (notes tags become JSON strings). Do not manually stringify arrays before calling storage.

### Storage Layer
- Use `optimizedStorage` first for reads/writes (it wraps Oracle or fallback). If adding new entity: extend `shared/schema.ts`, add methods to `OracleStorage`, `optimized-storage.ts` (include cache keys), and update `IStorage` in `server/storage.ts`.
- Query Cache: TTL default 5 min. Invalidate explicitly after mutating operations (see update/create patterns in optimized storage). Do not add long-lived cache entries for highly user-specific or rapidly changing data.
- Batch Manager: Used for bundling similar async operations; reuse `batch()` with a stable batchKey for high-frequency identical queries instead of building new concurrency logic.

### Frontend Conventions
- Routing via Wouter (`src/pages/**`). Pages import contexts from `src/contexts/` (e.g. Calendar, Auth, AppState). Extend features via hooks in `src/hooks` before adding global context.
- Rich text notes use Slate or (recent refactors) Tiptap; follow existing sanitization utilities in `lib`. When inserting AI content ensure markdown artifacts removed (already implemented in note editor).
- State persistence patterns: Habits & personal todos use browser `localStorage` keyed by `user.uid`; critical academic data (assignments, notes, classes) fetched through API each visit (recent auto-sync interval logic in hooks). Follow this split: transient personal tooling can stay client-only, core academic artifacts must go server.
- Date/time inputs: Use new `DateTimePicker` component (`src/components/ui/date-time-picker.tsx`) rather than raw `datetime-local` for consistency.

### Development & Scripts
```bash
npm run dev          # Concurrent backend (PORT=5000) + frontend (PORT=5173)
npm run dev:server   # Server only (Express + Vite middleware in dev)
npm run dev:client   # Frontend only
npm run build        # Vite build + bundles server with esbuild (dist/)
npm run start        # Production start (expects env + dist build)
npm run db:push      # Push Drizzle schema changes (Oracle/Postgres)
npm run check        # Type check
```
Database migrations: modify `shared/schema.ts`, run `npm run db:push`. For Oracle schema bootstrap use setup scripts (see `docs/SETUP.md`).

### Integration Patterns
- External sync endpoints: accept full payload arrays and upsert by provider ID; log mismatches clearly (see assignment/class sync warnings).
- AI features: Use Groq via existing hooks; ensure prompts include contextual metadata (title, category) following current assistant patterns—do not leak private user content unnecessarily.
- Document processing: Use `documentProcessingService.bindUploadRoute(app)`; new parsing logic lives under `document-processing/parsers`; store ephemeral in `ephemeral-store.ts`, commit assets with `saveGeneratedAssets()`.

### Security & Validation
- Always require `x-user-id` for any user-owned resource; reject silently missing IDs rather than defaulting.
- Sanitize HTML inputs using existing utilities (DO NOT introduce new sanitizer libs).
- Keep response payloads minimal; large arrays should paginate or be filtered client-side via contexts.

### When Adding New Features
1. Define schema in `shared/schema.ts` (+ Zod insert schema).
2. Extend `IStorage` + implement in `OracleStorage` & `optimized-storage.ts` (cache invalidation).
3. Add routes in `server/routes.ts` using Zod parse pattern.
4. Frontend: create hook in `src/hooks` → integrate into page/component.
5. Provide auto-sync only if data benefits from freshness; otherwise manual fetch.

### Anti-Patterns to Avoid
- Direct Oracle queries outside storage classes.
- Bypassing Zod validation in routes.
- Storing core data exclusively in browser localStorage.
- Large console dumps inside tight loops or per-request logging middleware.
- Adding new global contexts for single-page concerns.

### Quick Reference
- Primary storage: `optimizedStorage` (cached). Fallback: `storage`.
- Auth header: `x-user-id`.
- Validation: `insert*Schema.parse()`.
- Cache invalidation: after every create/update/delete.
- Ephemeral docs: `document-processing/` (30 min lifetime).

Provide feedback if any domain (AI assistant, flashcards, scheduling) needs deeper coverage.
