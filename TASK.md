# Tasks

> Claude updates this file during work. Check boxes when complete.

## Current Sprint

### 🚀 Priority 1: Phase 6.2 - Advanced Guardian Features ✅

#### Schema Lock System ✅
- [x] Implement schema-lock.ts with acquire/release (2026-01-22)
- [x] Update path-guard to check schema lock (2026-01-22)
- [x] Add CLI: ccplate schema lock/unlock/status (2026-01-22)

#### Knowledge Mesh (Cross-Worktree Intelligence) ✅
- [x] Implement knowledge-mesh.ts with broadcast/inject (2026-01-22)
- [x] Update guardian-tick to inject knowledge (2026-01-22)
- [x] Add CLI: ccplate mesh broadcast/list/inject (2026-01-22)

#### Human-in-the-Loop (HITL) System ✅
- [x] Implement hitl.ts with request/resolve (2026-01-22)
- [x] Add detection for destructive operations (2026-01-22)
- [x] Add CLI: ccplate hitl list/approve/reject (2026-01-22)
- [x] Placeholder for Slack/Discord webhooks (notifications.ts) (2026-01-22)

#### Worktree Preflight ✅
- [x] Implement preflight.ts validation (2026-01-22)
- [x] Add auto-fix for common issues (2026-01-22)
- [x] Add CLI: ccplate worktree validate/fix (2026-01-22)

### 🚨 Priority 2: Security Fixes ✅

- [ ] **Add rate limiting to AI endpoints** [Medium Risk] (Deferred - needs Redis/in-memory store design)
  - [ ] `src/app/api/api-builder/generate/route.ts`
  - [ ] `src/app/api/agents/[id]/run/route.ts`
  - [ ] `src/app/api/component-builder/generate/route.ts`
  - [ ] `src/app/api/schema-builder/generate/route.ts`
  - [ ] `src/app/api/prompts/[id]/test/route.ts`

- [x] **Fix path-guard regex bypass** [Medium Risk] (2026-01-22)
  - [x] Anchor regex patterns with `^...$` in `matchesPattern()`
  - [x] Add tests for edge cases (`*.key` shouldn't match `not-a-key`)

- [x] **Review agent tool handlers for injection** [Medium Risk] (2026-01-22)
  - [x] Audit `src/lib/agent-builder/tools/*.ts`
  - [x] Input validation via Zod schemas already in place
  - [x] http-request.ts: SSRF protection (blocks localhost, internal IPs)
  - [x] read-file.ts: Path traversal protection (blocks .., system paths, sensitive files)
  - [x] web-search.ts: Query length limits (1-500 chars)

### 📦 Priority 3: Dependency Updates

- [ ] **Patch Prisma** (safe, no breaking changes)
  ```bash
  npm update prisma @prisma/client @prisma/adapter-pg
  ```

- [ ] **Evaluate Zod 4 migration** (breaking changes)
  - [ ] Read migration guide: https://zod.dev/v4
  - [ ] Create branch for testing
  - [ ] Update schemas if compatible

- [ ] **Evaluate NextAuth v5 (Auth.js)** (optional, major)
  - [ ] Research App Router improvements
  - [ ] Assess migration effort
  - [ ] Decision: migrate or defer

### 🔧 Priority 4: Guardian Enhancements

- [ ] **Wire progress nudge detection**
  - [ ] Implement "off-topic" detection in guardian-tick.ts
  - [ ] Compare current file changes to PRP steps
  - [ ] UI toggle already exists

- [ ] **Add file upload magic byte validation**
  - [ ] Install `file-type` package
  - [ ] Verify actual content matches declared MIME type
  - [ ] Block mismatches

- [ ] **Add audit logging for admin settings**
  - [ ] Log who changed what in admin settings
  - [ ] Store in `memory/audit-log.jsonl` or database

- [ ] **Improve Guardian hook error handling**
  - [ ] Log malformed input instead of silent exit
  - [ ] Write to `memory/guardian-errors.log`

### 🧪 Priority 5: Testing & Validation

- [ ] **Run Guardian test suite**
  ```bash
  npm run test:guardian:simulate full-session
  npm run test:guardian
  npm run test:guardian:worktrees
  ```

- [ ] **Add E2E tests with Playwright**
  - [ ] Auth flow tests
  - [ ] Builder flow tests
  - [ ] Guardian UI tests

- [ ] **Configure API keys and test end-to-end**
  - [ ] Set up OpenAI/Anthropic keys
  - [ ] Test all builder generation endpoints
  - [ ] Verify Guardian nudges in real session

### 🧭 Priority 7: Validation & Discovery Harness ✅

#### Phase 7.1: Oracle Discovery Interview ✅
- [x] Implement `src/lib/guardian/prd.ts` with interview logic (2026-01-22)
- [x] Add `ccplate init` CLI command (2026-01-22)
- [x] Generate frozen PRD to `memory/prd.md` + `memory/prd.json` (2026-01-22)
- [x] Update `workflow-state.json` with PRD metadata (2026-01-22)

#### Phase 7.2: Playwright Validation Loop ✅
- [x] Integrate Playwright status into `workflow-state.json` completion logic (2026-01-22)
- [x] Agent cannot mark task DONE until corresponding Playwright test passes (2026-01-22)
- [x] Auto-spawn "Fix Loop" on test failure with screenshot context (2026-01-22)
- [x] CLI: `ccplate validate status/run/register/check/fixloop` (2026-01-22)

#### Phase 7.3: Activity Narrator ✅
- [x] Implement Activity Narrator Hook in guardian-tick (2026-01-22)
- [x] Append human-readable lines to `memory/ACTIVITY.md` (2026-01-22)
- [x] Format: "Loop N: <action>; X/Y tasks remain" (2026-01-22)
- [x] CLI: `ccplate activity status/start/complete/clear/loop` (2026-01-22)

#### Phase 7.4: POC Harness ✅
- [x] Implement `ccplate harness --variants N --goal "description"` (2026-01-22)
- [x] Create `src/lib/guardian/harness/harness-runner.ts` (2026-01-22)
- [x] Create `src/lib/guardian/harness/variant-runner.ts` (2026-01-22)
- [x] Create `src/lib/guardian/harness/harness-state.ts` (2026-01-22)
- [x] Create `src/lib/guardian/harness/report.ts` (2026-01-22)
- [x] Spawn parallel worktrees for each variant (2026-01-22)
- [x] Generate comparison report in `memory/harness/report.md` (2026-01-22)
- [x] `ccplate harness pick <variant>` to merge selected variant (2026-01-22)
- [x] `ccplate harness cleanup` to remove non-selected worktrees (2026-01-22)
- [x] `ccplate harness status` to view run status (2026-01-22)
- [x] Support `--names` for explicit variant naming (2026-01-22)
- [x] Support `--no-prd` and `--dry-run` flags (2026-01-22)

### 🎨 Priority 6: Polish & Documentation

- [ ] **Multi-language LSP support** (Deferred - implement when Go/Rust workflows needed)
  - [ ] Add gopls for Go
  - [ ] Add rust-analyzer for Rust
  - [ ] Update ccplate.config.json schema

- [ ] **Add live preview to Component Builder** (Deferred - larger feature, not polish)
  - [ ] Sandboxed iframe preview
  - [ ] Hot reload on code changes

- [x] **Create CLI commands for builders** (2026-01-22)
  - [x] `ccplate hook generate <description>`
  - [x] `ccplate component generate <description>`
  - [x] `ccplate api generate <description>`

- [x] **Remove console.log in production** (2026-01-22)
  - [x] `src/lib/auth.ts:114` - Guarded to dev-only

---

## Completed ✅

### Guardian Implementation (2026-01-21)

#### Phase 0: Foundation ✅
- [x] Expand tool logging to all tools (2026-01-21)
- [x] Create `memory/workflow-state.json` with initial schema (2026-01-21)
- [x] Update `path-guard.ts` to understand `.worktrees/**` (2026-01-21)
- [x] Create `ccplate.config.json` for Guardian settings (2026-01-21)

#### Phase 1: Guardian MVP ✅
- [x] Implement `guardian-tick.ts` hook (PostToolUse) (2026-01-21)
- [x] Add commit nudge logic (2026-01-21)
- [x] Add test nudge logic (2026-01-21)
- [x] Add error nudge logic (2026-01-21)
- [x] Implement cooldown mechanism (2026-01-21)
- [x] Write nudges to `memory/guardian-nudges.jsonl` (2026-01-21)
- [x] Create `memory/guardian-last.txt` for injection (2026-01-21)
- [x] Create `memory/guardian-state.json` for cooldown tracking (2026-01-21)

#### Phase 2: Worktree Isolation ✅
- [x] Implement `ccplate worktree create/list/cleanup` CLI (2026-01-21)
- [x] Create `team-coordinator.md` agent (2026-01-21)
- [x] Update `path-guard.ts` for worktree enforcement (2026-01-21)
- [x] Implement merge strategy (in team-coordinator agent) (2026-01-21)

#### Phase 3: LSP v1 ✅
- [x] Implement LSP sidecar server (tsserver first) (2026-01-21)
- [x] Create `ccplate lsp` CLI commands (2026-01-21)
- [x] Add LSP diagnostics to Guardian error nudges (2026-01-21)

#### Phase 4: RLM-lite ✅
- [x] Create `rlm-adapter.md` agent (2026-01-21)
- [x] Implement context ledger (2026-01-21)
- [x] Add recursive subagent spawning (in rlm-adapter agent) (2026-01-21)
- [x] Integrate context pressure into Guardian nudges (2026-01-21)

#### Phase 5: UI Integration ✅
- [x] Guardian config UI page (2026-01-21)
- [x] Session timeline visualization (2026-01-21)
- [x] Agent activity dashboard (2026-01-21)
- [x] Worktree status view (2026-01-21)

#### Documentation & Testing ✅
- [x] Create Guardian workflow guide (2026-01-21)
- [x] Create Guardian test suite (2026-01-21)
- [x] Full project review with agent swarm (2026-01-21)

### Foundation (2026-01-20)
- [x] Project bootstrap initialized
- [x] Tech stack: Next.js 14 + TypeScript + PostgreSQL + Prisma
- [x] Authentication with NextAuth.js (credentials + OAuth)
- [x] User/Admin dashboards
- [x] File upload system
- [x] All 6 AI Builders (Hook, Prompt, Agent, Schema, API, Component)

---

## Backlog

### Phase 6.3+ - Future Guardian Evolution
- [ ] **Fleet Commander** - Multi-issue orchestration across worktrees
- [ ] **Agent Pulse** - Real-time WebSocket stream for Guardian events
- [ ] **Artifact Versioning** - Rollback/retry for generated artifacts
- [ ] **Native TUI** - Rust-based terminal UI for Guardian

### Future Enhancements
- [ ] Password reset flow with email (backend complete, needs testing)
- [ ] Email verification flow (backend complete, needs testing)
- [ ] Real-time collaboration features
- [ ] Version control for generated code
- [ ] Rollback capability for builders
- [ ] Documentation generator

### Technical Debt
- [ ] Migrate from NextAuth v4 to Auth.js v5
- [ ] Add comprehensive E2E test coverage
- [ ] Implement proper logging infrastructure (replace console.log)

---

## Discovered During Work

### Patterns to Reuse

| Pattern | Where Found | When to Use |
|---------|-------------|-------------|
| `requireAuth()` helper | `src/lib/auth-utils.ts` | Server components needing auth |
| Service layer pattern | `src/lib/services/` | Business logic separation |
| File upload with FormData | `src/app/api/uploads/route.ts` | Any file upload endpoint |
| Rate limiter | `src/lib/rate-limit.ts` | Protect expensive endpoints |
| Guardian nudge pattern | `.claude/hooks/guardian-tick.ts` | Workflow supervision |

### Security Checklist (Apply to New Code)

- [ ] Rate limit expensive endpoints
- [ ] Validate all user input with Zod
- [ ] Use parameterized queries (Prisma handles this)
- [ ] Never log sensitive data (emails, tokens, passwords)
- [ ] Verify file types by content, not just MIME header
- [ ] Anchor regex patterns to prevent bypass

---

## Metrics

| Metric | Value | Date |
|--------|-------|------|
| Guardian Phases Complete | 7/7 (100%) | 2026-01-22 |
| Phase 7 Features | PRD, Playwright Validation, Activity Narrator, POC Harness | 2026-01-22 |
| Security Issues Fixed | path-guard regex, agent tool audit, API auth | 2026-01-22 |
| Dependencies Updated | @types/react, hono (patch) | 2026-01-22 |
| Tasks Completed | 65+ | 2026-01-22 |
| Lint Warnings | 0 | 2026-01-22 |

---

**Last Updated:** 2026-01-22
**Next Review:** After Priority 1 & 2 complete
