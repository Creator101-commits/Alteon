## AlteonV1 Copilot Instructions

Concise, project-specific guidance for AI coding agents. Focus on existing patterns only.

### Core Architecture
- Monorepo-style single app: React (Vite) frontend deployed on Vercel with Supabase PostgreSQL backend.
- Storage abstraction: use `storage` from `src/lib/supabase-storage.ts` (SupabaseStorage class). All database operations go through this layer.
- Data schemas defined centrally in `shared/schema.ts` using Drizzle + Zod. All inbound API payloads validated with the corresponding `insert*Schema`.
- User identity comes from Firebase Auth. User ID (Firebase UID) is used as primary key in Supabase.
- API routes live in `/api/` directory as Vercel serverless functions. Frontend calls these via relative URLs.

### Backend Patterns (Vercel Serverless)
- API routes in `/api/` directory follow Vercel file-based routing.
- Route handlers export default function with `(req: VercelRequest, res: VercelResponse)` signature.
- User auth via `x-user-id` header or Firebase token validation.
- Keep serverless functions lightweight; heavy processing should be async or use edge functions.

### Storage Layer (Supabase)
- Use `storage` from `src/lib/supabase-storage.ts` for all database operations.
- Methods follow pattern: `getXByUserId()`, `createX()`, `updateX()`, `deleteX()`.
- Supabase client configured in `src/lib/supabase.ts`.
- Schema changes: modify `shared/schema.ts`, create migration in `supabase/migrations/`.

### Frontend Conventions
- Routing via Wouter (`src/pages/**`). Pages import contexts from `src/contexts/` (e.g. Calendar, Auth, AppState).
- Rich text notes use Tiptap; follow existing sanitization utilities in `lib`.
- State persistence patterns: Habits & personal todos use browser `localStorage` keyed by `user.uid`; critical academic data (assignments, notes, classes) fetched from Supabase.
- Date/time inputs: Use `DateTimePicker` component (`src/components/ui/date-time-picker.tsx`).

### Development & Scripts
```bash
npm run dev          # Vite dev server (PORT=5173)
npm run build        # Vite production build (dist/)
npm run check        # Type check
vercel dev           # Local Vercel dev with API routes
```
Database migrations: modify `shared/schema.ts`, add SQL to `supabase/migrations/`.

### Integration Patterns
- External sync: Google Classroom sync uses storage methods directly.
- AI features: Use Groq via existing hooks; ensure prompts include contextual metadata.
- Document processing: API route at `/api/document-intel/sessions`.

### Security & Validation
- Always require user ID for user-owned resources.
- Sanitize HTML inputs using existing utilities.
- Keep response payloads minimal.

### When Adding New Features
1. Define schema in `shared/schema.ts` (+ Zod insert schema).
2. Add methods to `SupabaseStorage` in `src/lib/supabase-storage.ts`.
3. Add Vercel API route in `/api/` if server-side logic needed.
4. Frontend: create hook in `src/hooks` → integrate into page/component.

### Anti-Patterns to Avoid
- Direct Supabase queries outside storage class.
- Bypassing Zod validation.
- Storing core data exclusively in browser localStorage.
- Large console dumps inside hot paths.

### Quick Reference
- Primary storage: `storage` from `src/lib/supabase-storage.ts`.
- Auth: Firebase Auth, user ID as Supabase primary key.
- Validation: `insert*Schema.parse()`.
- API routes: `/api/` directory (Vercel serverless).

Provide feedback if any domain (AI assistant, flashcards, scheduling) needs deeper coverage.
