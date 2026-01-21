# Tasks

> Claude updates this file during work. Check boxes when complete.

## Current Sprint

### In Progress

- [ ] Configure API keys and test end-to-end
- [ ] Rename project directory (remove space) to fix Turbopack build

### Up Next - Guardian Implementation

#### Phase 0: Foundation (<1 hour) ✅
- [x] Expand tool logging to all tools (not just Write/Edit) (2026-01-21)
- [x] Create `memory/workflow-state.json` with initial schema (2026-01-21)
- [x] Update `path-guard.ts` to understand `.worktrees/**` (2026-01-21)
- [x] Create `ccplate.config.json` for Guardian settings (2026-01-21)

#### Phase 1: Guardian MVP (1-3 hours) ✅
- [x] Implement `guardian-tick.ts` hook (PostToolUse) (2026-01-21)
- [x] Add commit nudge logic (2026-01-21)
- [x] Add test nudge logic (2026-01-21)
- [x] Add error nudge logic (2026-01-21)
- [x] Implement cooldown mechanism (2026-01-21)
- [x] Write nudges to `memory/guardian-nudges.jsonl` (2026-01-21)
- [x] Create `memory/guardian-last.txt` for injection (2026-01-21)
- [x] Create `memory/guardian-state.json` for cooldown tracking (2026-01-21)

#### Phase 2: Worktree Isolation (1-2 days) ✅
- [x] Implement `ccplate worktree create/list/cleanup` CLI (2026-01-21)
- [x] Create `team-coordinator.md` agent (2026-01-21)
- [x] Update `path-guard.ts` for worktree enforcement (2026-01-21)
- [x] Implement merge strategy (in team-coordinator agent) (2026-01-21)

#### Phase 3: LSP v1 (1-2 days) ✅
- [x] Implement LSP sidecar server (tsserver first) (2026-01-21)
- [x] Create `ccplate lsp` CLI commands (2026-01-21)
- [x] Add LSP diagnostics to Guardian error nudges (2026-01-21)

#### Phase 4: RLM-lite (1-2 days) ✅
- [x] Create `rlm-adapter.md` agent (2026-01-21)
- [x] Implement context ledger (2026-01-21)
- [x] Add recursive subagent spawning (in rlm-adapter agent) (2026-01-21)
- [x] Integrate context pressure into Guardian nudges (2026-01-21)

#### Phase 5: UI Integration + Observability ✅
- [x] Guardian config UI page (2026-01-21)
- [x] Session timeline visualization (2026-01-21)
- [x] Agent activity dashboard (2026-01-21)
- [x] Worktree status view (2026-01-21)

### Backlog (Original)

- [ ] Add live preview to Component Builder
- [ ] Create CLI commands for builders
- [ ] Add E2E tests with Playwright

### Blocked

_None currently_

## Backlog

> Prioritized list of future work.

### Phase 1: Foundation Polish
1. Password reset flow with email
2. Email verification
3. Profile editing (avatar, name, password)
4. File management UI
5. Real dashboard stats

### Phase 2: AI Builder Core
1. AI provider abstraction layer
2. Hook Builder MVP
3. Prompt Builder MVP
4. Template system for generated code

### Phase 3: Advanced Builders
1. Agent Builder with tool definitions
2. Schema Builder with migrations
3. API Builder with validation
4. Component Builder with Tailwind

### Phase 4: Developer Experience
1. Builder UI in admin panel
2. Version control for generated code
3. Rollback capability
4. CLI commands for builders
5. Documentation generator

## Completed

> Move finished tasks here with completion date.

### Week of 2026-01-20

- [x] Project bootstrap initialized (2026-01-20)
- [x] Tech stack decided: Next.js 14 + TypeScript + PostgreSQL + Prisma (2026-01-20)
- [x] Documentation files configured (2026-01-20)
- [x] Initialize Next.js project with TypeScript and Tailwind CSS (2026-01-20)
- [x] Set up Prisma with PostgreSQL connection (2026-01-20)
- [x] Create initial database schema (User, Account, Session, File, SystemSetting) (2026-01-20)
- [x] Set up authentication with NextAuth.js (2026-01-20)
  - [x] Credentials provider (email/password)
  - [x] Google OAuth (optional, env-based)
  - [x] GitHub OAuth (optional, env-based)
  - [x] JWT session strategy
- [x] Build auth UI pages (2026-01-20)
  - [x] Login page with OAuth + credentials
  - [x] Registration page
  - [x] Forgot password page (UI only)
- [x] Create protected routes with middleware (2026-01-20)
- [x] Build user dashboard (placeholder stats) (2026-01-20)
- [x] Build admin dashboard with real stats (2026-01-20)
- [x] Admin user management (list, view, edit users) (2026-01-20)
- [x] Admin settings page (2026-01-20)
- [x] File upload API (single & multiple) (2026-01-20)
- [x] File storage service (local storage) (2026-01-20)
- [x] UI component library (Button, Card, Input, Spinner, etc.) (2026-01-20)
- [x] Rate limiting utility (2026-01-20)
- [x] Toast notifications (2026-01-20)

### Week of 2026-01-21

#### Foundation Polish ✅
- [x] Password reset flow with email (2026-01-21)
  - [x] Prisma token models (PasswordResetToken, EmailVerificationToken)
  - [x] Email infrastructure with Resend
  - [x] Token generation/validation utilities
  - [x] Reset password page and forms
  - [x] Server actions for forgot/reset password
- [x] Email verification flow (2026-01-21)
  - [x] Verification email template
  - [x] Verify email page
  - [x] Server actions for verification
- [x] Profile editing (2026-01-21)
  - [x] Name change form
  - [x] Password change form
  - [x] Avatar upload form
  - [x] Email verification banner
- [x] File management UI (2026-01-21)
  - [x] Files listing page at /files
  - [x] Files table component
  - [x] File upload section
  - [x] Soft delete functionality
- [x] Real dashboard stats (2026-01-21)
  - [x] getDashboardStats() function
  - [x] Dashboard updated with real data

#### AI Infrastructure ✅
- [x] AI provider abstraction layer (2026-01-21)
  - [x] Config with Zod validation
  - [x] Provider interface types
  - [x] OpenAI provider implementation
  - [x] Anthropic provider implementation
- [x] Error handling and retries (2026-01-21)
  - [x] AIError class
  - [x] Exponential backoff with jitter
- [x] Prompt templates (2026-01-21)
  - [x] Template rendering with variables
  - [x] Message building utilities
- [x] JSON parsing utilities (2026-01-21)
  - [x] JSON extraction from text
  - [x] Zod schema validation

#### Hook Builder ✅
- [x] Hook specification schema (2026-01-21)
- [x] AI prompt templates (2026-01-21)
- [x] Code templates (query, mutation, infiniteQuery, form) (2026-01-21)
- [x] Template renderer (2026-01-21)
- [x] Hook Builder UI at /hook-builder (2026-01-21)
- [x] Wired to AI infrastructure (2026-01-21)

#### Prompt Builder ✅
- [x] Prompt schema with versioning (2026-01-21)
- [x] JSON file storage with CRUD (2026-01-21)
- [x] Prompt tester with metrics (2026-01-21)
- [x] API routes (2026-01-21)
- [x] UI at /prompt-builder (2026-01-21)
- [x] Variable editor (2026-01-21)
- [x] Version history with restore (2026-01-21)

#### Agent Builder ✅
- [x] Agent schema with tools (2026-01-21)
- [x] Agent runtime with tool calling loop (2026-01-21)
- [x] Built-in tools (web_search, read_file, http_request) (2026-01-21)
- [x] JSON file storage (2026-01-21)
- [x] API routes including /run (2026-01-21)
- [x] UI at /agent-builder (2026-01-21)
- [x] Tool selector and custom tool editor (2026-01-21)
- [x] Test chat interface (2026-01-21)

#### Schema Builder ✅
- [x] Model specification schema (2026-01-21)
- [x] Prisma model generator (2026-01-21)
- [x] AI-powered model generation (2026-01-21)
- [x] Schema manager with backup (2026-01-21)
- [x] API routes with preview/apply (2026-01-21)
- [x] UI at /schema-builder (2026-01-21)
- [x] Diff view (2026-01-21)

#### API Builder ✅
- [x] API specification schema (2026-01-21)
- [x] Route generator with templates (2026-01-21)
- [x] AI-powered API generation (2026-01-21)
- [x] File writer (2026-01-21)
- [x] API routes (2026-01-21)
- [x] UI at /api-builder (2026-01-21)
- [x] Prisma model parser (2026-01-21)

#### Component Builder ✅
- [x] Component specification schema (2026-01-21)
- [x] Component generator with templates (2026-01-21)
- [x] AI-powered component generation (2026-01-21)
- [x] Templates (base, data-table, form, card, list) (2026-01-21)
- [x] API routes (2026-01-21)
- [x] UI at /component-builder (2026-01-21)
- [x] Options panel with feature toggles (2026-01-21)

#### Validation & Fixes ✅
- [x] Created Switch UI component (2026-01-21)
- [x] Fixed hook template naming (2026-01-21)
- [x] Added navigation links for all builders (2026-01-21)
- [x] TypeScript passes with no errors (2026-01-21)

#### Polish & Documentation ✅
- [x] Installed dependencies: @tanstack/react-query, react-hook-form, @hookform/resolvers, prism-react-renderer (2026-01-21)
- [x] Added syntax highlighting to all builder code previews (2026-01-21)
- [x] Created CodeBlock UI component (2026-01-21)
- [x] Added Builders dropdown to navigation (2026-01-21)
- [x] Updated Dashboard quick actions with real links (2026-01-21)
- [x] Added Getting Started section for new users (2026-01-21)
- [x] Added layout.tsx with metadata to all builder pages (2026-01-21)
- [x] Updated README.md with full documentation (2026-01-21)
- [x] Updated .env.example with all variables (2026-01-21)
- [x] Created CONTRIBUTING.md (2026-01-21)
- [x] Created agents.json storage file (2026-01-21)
- [x] Final validation: 0 TS errors, 0 lint errors (2026-01-21)

---

## Discovered During Work

> Claude: Add findings here that affect future tasks. This is the learning system.

### Patterns to Reuse

| Pattern | Where Found | When to Use |
|---------|-------------|-------------|
| `requireAuth()` helper | `src/lib/auth-utils.ts` | Server components needing auth |
| Service layer pattern | `src/lib/services/` | Business logic separation |
| File upload with FormData | `src/app/api/uploads/route.ts` | Any file upload endpoint |

### Gotchas Encountered

| Issue | Root Cause | Solution |
|-------|------------|----------|
| [None documented yet] | | |

### Questions for Later

- [ ] Should builders run in-browser or server-side?
- [ ] How to handle generated code conflicts with existing code?
- [ ] Version control strategy for AI-generated files
- [ ] Should builders have a UI or be CLI-only?
- [ ] Which AI provider(s) to support? OpenAI, Anthropic, local models?
- [ ] How to handle secrets/API keys for AI in development vs production?

### Technical Debt

| Debt | Impact | Priority |
|------|--------|----------|
| Dashboard stats are hardcoded | Users see fake data | High |
| Profile page needs implementation | Users can't update their info | Medium |
| Forgot password has no backend | Users can't reset passwords | Medium |

---

## Metrics

| Metric | This Week | Last Week | Trend |
|--------|-----------|-----------|-------|
| Tasks Completed | 18 | 0 | ⬆️ |
| Bugs Found | 0 | - | - |
| Discoveries Logged | 3 | 0 | ⬆️ |

---

**Last Updated:** 2026-01-21
