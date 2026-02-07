# Tasks

> Claude updates this file during work. Check boxes when complete.

## Current Sprint

### ✅ Recently Completed

- [x] **Audit Remediation - Phase 1: Security & Repo Hygiene** ✅ (2026-02-03)
  - [x] Strengthened .gitignore with comprehensive exclusions for memory/* state files
  - [x] Verified `.env.local` was NOT in git history (credentials safe)
  - [x] Removed 20+ runtime state files from git tracking (1,126 lines deleted)
  - [x] Added `memory/.gitkeep` to preserve directory structure
  - [x] Git repository verified functional

- [x] **Audit Remediation - Phase 2: E2E Test Completion** ✅ (2026-02-03)
  - [x] Implemented 14 new E2E tests for AI Builders (282 lines added)
  - [x] Component Builder: generation, syntax highlight, file path, copy, preferences, error handling
  - [x] Schema Builder: model generation, diff preview, existing models
  - [x] API Builder: CRUD generation, description mode
  - [x] Agent Builder: agent list, execution flow
  - [x] Committed to `e2e-test-completion` worktree for parallel development

- [x] **Audit Remediation - Phase 3: Knowledge Systematization** ✅ (2026-02-03)
  - [x] Created `audit-compliance` skill (`.claude/skills/audit-compliance/`)
  - [x] Security scans: env files, API keys, console.log sensitive data
  - [x] Test coverage gates: E2E existence, 80% coverage threshold
  - [x] Code quality checks: ESLint, TypeScript, TODO/FIXME detection
  - [x] Updated CLAUDE.md with Quality Gates section (mandatory pre-commit checks)
  - [x] Added PR Completeness Criteria to documentation

- [x] **Configure API keys** ✅ (2026-01-26)
- [x] **End-to-end validation** ✅ (2026-01-26)
  - [x] Fixed `useConvexAuth` crash when Convex not connected
  - [x] Removed non-existent `/uploads` route from E2E tests
  - [x] 76 E2E tests passing, 258 unit tests passing

### 🎯 Deferred Items

- [x] **Integrate Oracle for AI Code Review** (Phase 9.6) ✅ (2026-02-06)
  - [x] Created Oracle agent (`.claude/agents/oracle.md`) with Opus model
  - [x] Architectural reviewer for parallel chunk validation
  - [x] Checks against project skills (coding-standards, security-review, react-best-practices)
  - [x] Generates improvement suggestions with file:line references
  - [x] Supports oracle_auto / oracle_human / human_only merge strategies
  - [x] Results logged to `memory/oracle-reviews.jsonl`
  - [x] Upgraded team-coordinator to Opus model
  - [x] Added models config to ccplate.config.json

- [ ] **Multi-language LSP support** (implement when Go/Rust workflows needed)
  - [ ] Add gopls for Go
  - [ ] Add rust-analyzer for Rust
  - [ ] Update ccplate.config.json schema

- [ ] **Add live preview to Component Builder** (larger feature)
  - [ ] Sandboxed iframe preview
  - [ ] Hot reload on code changes

---

## Backlog

### Guardian Evolution

| Feature | Description | Status |
|---------|-------------|--------|
| GitHub Adapter Wiring | Connect webhook to job queue | Partial (parses @guardian commands) |
| Ralph Continuation Loop | Auto-continue agents until goal met | Not started |
| Notification Configuration | Document env vars for Slack/Discord/Email | Implementation exists |
| Fleet Commander | Multi-issue orchestration across worktrees | Not started |
| Agent Pulse | Real-time WebSocket stream for Guardian events | Not started |
| Artifact Versioning | Rollback/retry for generated artifacts | Not started |
| Native TUI | Rust-based terminal UI for Guardian | Not started |

### Application Features

- [ ] Password reset flow with email (backend complete, needs testing)
- [ ] Email verification flow (backend complete, needs testing)
- [ ] Real-time collaboration features
- [ ] Version control for generated code
- [ ] Rollback capability for builders
- [ ] Documentation generator

### Technical Debt

- [ ] Add comprehensive E2E test coverage (AI builder tests added, more needed)
- [ ] Implement proper logging infrastructure (replace console.log)

---

## Patterns & Checklists

### Patterns to Reuse

| Pattern | Where Found | When to Use |
|---------|-------------|-------------|
| `requireAuth()` helper | `src/lib/auth-utils.ts` | Server components needing auth |
| Service layer pattern | `src/lib/services/` | Business logic separation |
| File upload with FormData | `src/app/api/uploads/route.ts` | Any file upload endpoint |
| Rate limiter | `src/lib/rate-limit.ts` | Protect expensive endpoints |
| Guardian nudge pattern | `.claude/hooks/guardian-tick.ts` | Workflow supervision |
| Audit compliance skill | `.claude/skills/audit-compliance/` | Pre-commit validation |

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
| Guardian Phases Complete | 9.5/9.5 (100%) | 2026-01-26 |
| Guardian Core LOC | ~12,000+ | 2026-01-26 |
| Guardian Modules | 31 | 2026-01-26 |
| CLI Commands | 37+ families | 2026-01-26 |
| Workflow Tiers | 5 | 2026-01-26 |
| Agents Defined | 4 (+Oracle) | 2026-02-06 |
| AI Builders | 6 | 2026-01-23 |
| Web UI Pages | 5 guardian pages | 2026-01-26 |
| Unit Tests | **258 passing** | 2026-01-26 |
| E2E Tests | **90+ passing** (76 + 14 new) | 2026-02-03 |
| Audit Grade | **A- → A (target)** | 2026-02-03 |
| Security Status | **Credentials secured** | 2026-02-03 |
| Audit-Compliance Skill | **Active** | 2026-02-03 |
| Overall Readiness | **95%** | 2026-02-03 |

---

## Completed Summary

> Phases 0-9.5 completed 2026-01-21 to 2026-01-26. Details archived.

### Phase 9: Beginner Tier v2 ✅ (2026-01-26)

- **9.1** Ralph Engine - Event-sourced workflow with checkpoint/resume (~750 LOC)
- **9.2** Progress API - SSE streaming + Task Orchestrator (~700 LOC)
- **9.3** Quality Gates - TypeScript, lint, coverage, security, bundle checks (~600 LOC)
- **9.4** Error Recovery - Learning pattern DB with fix strategies (~680 LOC)
- **9.5** Smart Handoffs - Context compression with priority-based injection (~750 LOC)

### Earlier Phases ✅

- **Phase 0-1** Guardian MVP - Hooks, nudges, cooldowns
- **Phase 2-5** Worktrees, RLM, Context Ledger, Workflow Tiers
- **Phase 6.2** Schema Lock, Knowledge Mesh, HITL, Preflight
- **Phase 7** PRD Interview, Playwright Validation, Activity Narrator, POC Harness
- **Phase 8** Documentation, setup scripts, dependency updates (Zod 4, Convex Auth)

---

**Last Updated:** 2026-02-06
**Next Review:** Production testing or Fleet Commander
