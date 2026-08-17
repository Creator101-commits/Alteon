# Project Context

- Owner: Creator101-commits
- Default branch: main
- GitHub: https://github.com/Creator101-commits/alteon

---

# Alteon

Alteon is a React and TypeScript student productivity workspace for notes, assignments, scheduling, study tools, and AI-assisted workflows. It uses Vite for the frontend, Vercel serverless routes for the backend, and Supabase, Firebase, Groq, and Google APIs for data and integrations.

## Build commands

```bash
npm install                 # Install dependencies
npm run check               # TypeScript validation
npm test                    # Run the no-cost test suite
npm run build               # Create the production Vite build
npm run lint                # Run ESLint
npm run format              # Format source files with Prettier
npm audit --omit=dev        # Audit production dependencies
```

## Platform support

- Node.js 18+ with npm 8+; production deployment targets Vercel.
- The browser app is served by Vite. API routes under `api/` use the Vercel serverless runtime and require the configured environment variables.

## Key conventions

- Keep frontend code in `src/`, Vercel API routes in `api/`, shared Drizzle schema in `shared/schema.ts`, and generated build output in `dist/`. Do not edit `dist/` by hand.
- Use npm and keep `package-lock.json` synchronized with `package.json`; do not introduce another package manager.
- Keep `.env` local and ignored. Only variables prefixed with `VITE_` are safe for browser exposure; server-only credentials such as `DATABASE_URL`, `GROQ_API_KEY`, and Google client secrets must not use the `VITE_` prefix.
- Treat the Supabase database as shared state. Review schema and RLS changes before applying them; `drizzle.config.ts` intentionally excludes the legacy `user_preferences` table.
- Run `npm run check`, `npm test`, and `npm run build` before completing code changes. Do not claim lint is clean unless `npm run lint` exits successfully.

---

## Additional instructions for AI coding agents

Everything above this line is project-specific and should be filled in per repo.
Everything below is the stable rule set — keep as-is unless you have a specific
reason to change it for this project.

### Hard rules — do not violate these

- **Don't install new dependencies without asking first**, and don't introduce
  a different package manager than the one already in use in this repo.
- **Don't fabricate data** for benchmarks, logs, or anything used for real
  measurement, grading, or competition tracking.
- **Do not run `npm run db:push --force` or apply destructive database changes without explicit approval.**

### Workflow expectations

- Ask before any irreversible action (deleting files, dropping tables, force
  push, rewriting shared history).
- Keep commits atomic and scoped to one logical change. Use conventional
  commits (`feat:`, `fix:`, `chore:`).
- Explain *why* in commit messages and PR descriptions for non-trivial changes.
- Don't merge PRs with failing CI — flag it instead.
- Ask rather than guess when a task is ambiguous or underspecified.

## Rules

- Never force push to main
- Always write tests before marking a task done
- Use conventional commits (`feat:`, `fix:`, `chore:`)
- Never commit secrets, API keys, or `.env` files — verify `.gitignore` covers them
- Don't merge PRs with failing CI; flag it instead
- Ask before any irreversible action (deleting files, dropping tables, etc.)
- Don't install new dependencies without asking first
- Don't rewrite git history on shared branches without explicit confirmation
- Ask rather than guess when a task is ambiguous or underspecified
- Explain *why* in commit messages and PR descriptions for non-trivial changes
- Don't mark tasks done if tests were skipped, mocked, or not actually run
- No emojis in commit messages, code, or comments
- Write comments in simple language explaining *why* — keep them brief and only when necessary
- No emojis in READMEs, commit messages, or other non-code content
- Provide clear, concise descriptions in commit messages and PR descriptions
- Keep README in sync with code changes; verify consistency before every push, follow template structure exactly
- Check the project for existing templates and follow them exactly
- Always write fast, clean, and efficient code — optimize for performance and reliability. No performance regressions, technical debt, or slop. Code must be well-tested and production-ready before merging.

### Pi agent notes

If this session is running under a different agent (OpenCode, Codex, etc.),
skip this section entirely — every tool and slash command below is Pi-specific
and won't exist in your environment.

This repo is worked on with the Pi coding agent.

Full installed extension set and what each one is for. This is the complete
toolbox available in this repo — use the right tool for the job rather than
falling back to raw bash/grep commands when a more precise extension covers it.

**Core**
- **`pi-web-access`** — web search/fetch. Use for anything requiring current
  info, docs lookups, or external verification instead of relying on
  training-data knowledge of libraries/APIs.

**Search & navigation**
- **`@ff-labs/pi-fff`** — fuzzy file and content search. Prefer this over
  `find`/`ls` guessing when locating a file by partial name or recent usage.
- **`pi-lsp`** — real LSP-backed navigation (go-to-def, references,
  diagnostics). Prefer this over grep-based exploration whenever precision
  matters — it gives exact answers instead of scanning files.
- **`pi-repos`** — remote GitHub repo tools; use when a task involves reading
  or referencing a repo other than this one without cloning it manually.
- **`repo-baby`** — codebase orientation via the `scope` CLI + skill
  (Tree-sitter symbol extraction, ranked read order and import in-degree). Use
  at the start of a session in unfamiliar parts of this codebase, or if this
  repo is inherited/large — not needed for areas you already know well.

**Editing**
- **`pi-hashline-edit-pro`** — the file-editing tool. Use this as the default
  edit path rather than raw find/replace shell commands.

**Context management**
- **`pi-blackhole`** — unified compaction + observational memory. Replaces
  Pi's default LLM-based compaction with deterministic, zero-cost algorithmic
  summarization, plus a memory layer (observations + reflections) that
  survives compaction. Configured for the high-context preset. If a session
  has gone through compaction, use the `recall` tool to retrieve exact detail
  — file paths, error messages, prior decisions — rather than assuming it's
  gone or re-deriving it from scratch. `/blackhole-memory status` shows
  pipeline state; `/blackhole-recall <query>` searches full session history
  including compacted material.
- **`pi-skill-optimizer`** — passively trims the skill catalog and tool
  arrays on every request. Automatic, no action needed.

**Workflow, planning, sessions**
- **`@juicesharp/rpiv-ask-user-question`** — use this to ask a structured
  clarifying question instead of guessing on genuinely ambiguous asks.
- **`@juicesharp/rpiv-todo`** — track multi-step work as todos so state
  isn't lost across a long session; use for any task with 3+ discrete steps.
- **`@narumitw/pi-plan-mode`** — use plan mode for anything non-trivial
  before writing code; don't skip straight to implementation on ambiguous
  or architecturally significant asks.
- **`@vanillagreen/pi-session-manager`** — session state persists across
  restarts; don't assume a fresh session has no prior context — check for a
  resumable session before starting from scratch.

**Code quality**
- **`pi-simplify`** — run `/simplify` on changed lines before considering a
  non-trivial change done.
- **`@dietrichgebert/ponytail`** — YAGNI-first: don't build it if you can
  avoid it, reuse existing code, fix root causes at the shared function
  rather than patching call sites. Deliberate shortcuts get a ponytail
  comment with a named ceiling and upgrade path, not silent debt.
  {{If this repo has scientific/research code where "minimum code" is the
  wrong default (e.g. a research contribution that needs to be implemented
  in full), note that exclusion here explicitly.}}

**Design (frontend/UI work only)**
- **`pi-frontend-create`** — activates automatically when building web, app, desktop app UI
  components, pages, or landing pages (or invoke directly with
  `/skill:frontend-create`). Enforces a banned-pattern list against generic
  AI-design tells (centered heroes, teal/cyan accents, fade-up scroll
  reveals, overused typefaces) and a 13-point anti-pattern checklist before
  delivery. Run `/simplify` afterward on any generated code, same as other
  frontend work.
