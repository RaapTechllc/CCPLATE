# Project: CCPLATE

> Next.js + TypeScript web application with PostgreSQL database and Guardian control plane.

## Prerequisites

Before using CCPLATE, ensure you have the following installed:

### Required

| Dependency | Version | Installation |
|------------|---------|--------------|
| **Node.js** | 18+ (24+ recommended) | [nodejs.org](https://nodejs.org/) |
| **npm** | 9+ | Included with Node.js |
| **Git** | 2.30+ | [git-scm.com](https://git-scm.com/) |

### Optional (Recommended)

| Dependency | Purpose | Installation |
|------------|---------|--------------|
| **PostgreSQL** | Database | [postgresql.org](https://www.postgresql.org/download/) |
| **Bun** | Faster CLI runtime | `npm install -g bun` or [bun.sh](https://bun.sh/) |

### Windows PATH Configuration

**Important:** On Windows, ensure Node.js is in your system PATH. npm scripts will fail otherwise.

To verify, open a **new** Command Prompt and run:
```cmd
node --version
```

If this fails, add Node.js to your PATH:
1. Open **System Properties** > **Environment Variables**
2. Under "System variables", edit **Path**
3. Add: `C:\Program Files\nodejs`
4. Restart your terminal/IDE

Or run in PowerShell (as Administrator):
```powershell
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\nodejs", "Machine")
```

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url> my-project
cd my-project

# 2. Run setup (checks dependencies and installs packages)
node scripts/setup.js

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your values

# 4. Start development
npm run dev
```

## Bootstrap Instructions

This is a bootstrapped Claude Code project. On first run:

1. **Detect project type** - Run `/project:detect` to determine greenfield vs brownfield
2. **Analyze existing code** (if brownfield) - Document patterns before making changes
3. **Initialize structure** (if greenfield) - Ask about tech stack, then scaffold
4. **Update this file** - Replace placeholders with discovered/chosen values
5. **Create subagents** - When specialized work emerges, use meta-agent to create them

## Commands

- **Setup:** `npm run setup` (or `node scripts/setup.js`)
- **Dev:** `npm run dev`
- **Build:** `npm run build`
- **Test:** `npm test`
- **Lint:** `npm run lint`
- **Deploy:** `vercel` (or platform of choice)

### Database Commands

- **Generate client:** `npm run db:generate`
- **Run migrations:** `npm run db:migrate`
- **Push schema:** `npm run db:push`
- **Open studio:** `npm run db:studio`
- **Seed database:** `npm run db:seed`

### Guardian CLI Commands

The `ccplate` CLI provides unified access to Guardian features:

```bash
# Status & Dashboard
ccplate status                    # Unified dashboard (worktrees, jobs, HITL, validation)

# Worktree Management
ccplate worktree create <name>    # Create isolated worktree (--note "description")
ccplate worktree list             # List all worktrees
ccplate worktree open <id>        # Open worktree in editor
ccplate worktree cleanup          # Remove merged worktrees
ccplate worktree cleanup-orphans  # Bulk cleanup stale worktrees
ccplate worktree validate         # Run preflight validation
ccplate worktree fix              # Auto-fix common issues

# Schema Lock (DB migration protection)
ccplate schema lock               # Acquire schema lock
ccplate schema unlock             # Release schema lock
ccplate schema status             # Check lock status

# Knowledge Mesh (Cross-worktree intelligence)
ccplate mesh broadcast <msg>      # Broadcast to all worktrees
ccplate mesh list                 # List recent broadcasts
ccplate mesh inject <id>          # Inject knowledge into worktree

# Human-in-the-Loop
ccplate hitl list                 # List pending HITL requests
ccplate hitl approve <id>         # Approve request
ccplate hitl reject <id>          # Reject request

# Validation Loop
ccplate validate status           # Validation status
ccplate validate run              # Run Playwright tests
ccplate validate register <test>  # Register test for task
ccplate validate check            # Check registered tests
ccplate validate fixloop          # Auto-spawn fix loop on failure

# Activity Narrator
ccplate activity status           # Current activity status
ccplate activity start <desc>     # Start activity tracking
ccplate activity complete         # Mark activity complete
ccplate activity loop <n>         # Record loop iteration

# POC Harness (Variant testing)
ccplate harness --variants N --goal "desc"  # Spawn N variant worktrees
ccplate harness --parallel                  # Run variants in parallel
ccplate harness --max-concurrent 3          # Limit concurrent variants
ccplate harness status            # View run status
ccplate harness pick <variant>    # Merge selected variant
ccplate harness cleanup           # Remove non-selected worktrees

# Issue Labeling & Parallel Safety
ccplate triage <issue-number>     # Analyze issue and suggest labels
ccplate parallel-check 1 2 3      # Check if issues can run in parallel

# Structured Logging
ccplate log                       # View recent logs
ccplate log --namespace guardian.harness    # Filter by namespace
ccplate log --level error --since 60        # Errors in last hour

# Merge Conflict Resolution
ccplate resolve status            # Show conflicted files
ccplate resolve auto              # Auto-resolve simple conflicts
ccplate resolve analyze <file>    # Analyze specific conflict

# LSP Sidecar
ccplate lsp start                 # Start LSP server
ccplate lsp diagnostics <file>    # Get diagnostics for file
ccplate lsp stop                  # Stop LSP server

# Merge & Rollback
ccplate merge list                # List recent merges
ccplate merge rollback <id>       # Rollback a merge

# Audit Logging
ccplate audit list                # List audit entries
ccplate audit categories          # List audit categories

# AI Builders (CLI interface)
ccplate hook generate <desc>      # Generate hook code
ccplate component generate <desc> # Generate React component
ccplate api generate <desc>       # Generate API endpoint

# Ralph Loop (Beginner Tier)
ccplate ralph checkpoint <phase>  # Capture HITL checkpoint for phase
ccplate ralph status              # Show Ralph Loop state

# Vercel Deployment
ccplate deploy                    # Deploy to Vercel (preview)
ccplate deploy --prod             # Deploy to production
ccplate deploy status <id>        # Check deployment status
ccplate deploy list               # List recent deployments
ccplate deploy validate           # Validate Vercel credentials
```

## Tech Stack

- **Language:** TypeScript
- **Framework:** Next.js 16.1.4 (App Router)
- **React:** 19.2.3
- **Database:** PostgreSQL
- **ORM:** Prisma 7.2.0
- **Styling:** Tailwind CSS
- **Hosting:** Vercel (recommended)

## Guardian System

CCPLATE includes a comprehensive Guardian control plane for AI workflow supervision.

### Architecture Overview

The Guardian system provides:

- **Workflow Supervision** - Nudges for commits, tests, errors, context pressure
- **Worktree Isolation** - Git worktrees for parallel agent work
- **Schema Lock** - Database migration coordination
- **Knowledge Mesh** - Cross-worktree intelligence sharing
- **Human-in-the-Loop** - Approval gates for destructive operations
- **Validation Loop** - Playwright test integration with auto-fix
- **Activity Narrator** - Human-readable session logs
- **POC Harness** - Variant comparison testing

### Guardian Hooks

Located in `.claude/hooks/`:

| Hook | Event | Purpose |
|------|-------|---------|
| `guardian-tick.ts` | PostToolUse | Main supervision loop (nudges, activity, knowledge) |
| `path-guard.ts` | PreToolUse | Path protection and worktree enforcement |
| `pre-tool-use.ts` | PreToolUse | Tool validation and rate limiting |

### Guardian Modules

Located in `src/lib/guardian/`:

| Module | LOC | Purpose |
|--------|-----|---------|
| `workflow-state.ts` | Core | Workflow state management |
| `job-queue.ts` | Core | Job queue with pause/resume |
| `worktree.ts` | Core | Git worktree management |
| `schema-lock.ts` | Core | DB schema lock coordination |
| `knowledge-mesh.ts` | Core | Cross-worktree knowledge |
| `hitl.ts` | Core | Human-in-the-loop requests |
| `preflight.ts` | Core | Worktree validation |
| `notifications.ts` | Core | Slack/Discord/Email notifications |
| `prd.ts` | Phase 7 | PRD discovery interview |
| `validation-loop.ts` | Phase 7 | Playwright test integration |
| `activity.ts` | Phase 7 | Activity narrator |
| `context-ledger.ts` | RLM | Context pressure tracking |
| `merge-ledger.ts` | Merge | Merge history and rollback |
| `audit-log.ts` | Audit | Audit trail logging |
| `error-log.ts` | Error | Standardized error logging |
| `vercel-deploy.ts` | Deploy | Vercel deployment with claimable URLs |
| `logger.ts` | Parallel | Structured JSONL logging |
| `labeling.ts` | Parallel | Area-based issue labeling |
| `merge-resolver.ts` | Parallel | Auto merge conflict resolution |
| `security/` | Security | Input validation, injection prevention |

### Agents

Located in `.claude/agents/`:

#### Infrastructure Agents (CCPLATE Core)

| Agent | Purpose |
|-------|---------|
| `meta-agent.md` | Creates new specialized agents |
| `rlm-adapter.md` | Context-aware exploration with ledger |
| `team-coordinator.md` | Multi-worktree orchestration (Opus) |
| `oracle.md` | Architectural reviewer for parallel chunks (Opus) |
| `merge-resolver.md` | Auto-resolve git merge conflicts |

#### Workflow Agents (from everything-claude-code)

| Agent | Trigger | Purpose |
|-------|---------|---------|
| `code-reviewer.md` | After any code modification | Catch quality, security, performance issues before commit |
| `security-reviewer.md` | Before deploying auth/input code | Detect OWASP Top 10 vulnerabilities, secrets exposure |
| `tdd-guide.md` | When writing features/fixes | Enforce test-first methodology, 80% coverage |
| `build-error-resolver.md` | When npm build/tsc fails | Fix build errors with minimal changes |
| `refactor-cleaner.md` | During maintenance | Remove dead code, duplicates, unused deps |

### Skills

Located in `.claude/skills/`:

| Skill | Purpose | Invoke With |
|-------|---------|-------------|
| `coding-standards` | TypeScript/React best practices | `/skill coding-standards` |
| `tdd-workflow` | TDD workflow guidance | `/skill tdd-workflow` |
| `security-review` | Security checklist and patterns | `/skill security-review` |
| `backend-patterns` | API, database, caching patterns | `/skill backend-patterns` |
| `frontend-patterns` | React, state, performance patterns | `/skill frontend-patterns` |
| `continuous-learning` | Auto-extract patterns from sessions | Runs as Stop hook |
| `vercel-deploy` | Deploy to Vercel with claimable ownership | `/skill vercel-deploy` |
| `vercel-react-best-practices` | Next.js App Router, RSC, Vercel optimizations | `/skill vercel-react-best-practices` |
| `web-design-guidelines` | WCAG 2.1 AA, accessibility, responsive design | `/skill web-design-guidelines` |

### Rules

Located in `.claude/rules/` (auto-loaded):

| Rule | Enforces |
|------|----------|
| `security.md` | Mandatory security checks, secret management |
| `coding-style.md` | Immutability, file organization, error handling |
| `testing.md` | 80% coverage, TDD workflow, test structure |
| `git-workflow.md` | Commit format, PR workflow, safety rules |
| `agents.md` | Agent orchestration, parallel execution |
| `patterns.md` | API response format, common patterns |
| `performance.md` | Model selection, context management |
| `hooks.md` | Hook reference (DO NOT MODIFY Guardian hooks) |

## Code Style

- Follow existing patterns if brownfield project
- Use strict typing (TypeScript strict mode, Python type hints, etc.)
- Prefer explicit over implicit
- Max 300 lines per file
- One logical change per commit

## Naming Conventions

- **Files:** `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- **Functions:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Types/Interfaces:** `PascalCase`

## Memory Protocol

**Memory Files:**

| File | Purpose |
|------|---------|
| `memory/workflow-state.json` | Current workflow state, PRD metadata |
| `memory/guardian-state.json` | Nudge cooldowns, tick counts |
| `memory/guardian-nudges.jsonl` | Nudge history (JSONL) |
| `memory/guardian-last.txt` | Last nudge for injection |
| `memory/context-ledger.json` | Context pressure tracking |
| `memory/ACTIVITY.md` | Human-readable activity log |
| `memory/audit-log.jsonl` | Audit trail (JSONL) |
| `memory/merge-ledger.jsonl` | Merge history for rollback |
| `memory/guardian-errors.log` | Error log (JSONL) |
| `memory/prd.md` | Frozen PRD (human-readable) |
| `memory/prd.json` | Frozen PRD (machine-readable) |
| `memory/harness/` | POC harness reports |

**After completing each task:**

1. Update PLANNING.md with any architectural decisions made
2. Update TASK.md - mark completed, add new discoveries
3. Add any gotchas to the "Warnings" section below
4. If an error pattern emerges, document in `memory/learnings.md`

**Before starting new work:**

1. Check TASK.md for current priorities
2. Review recent entries in PLANNING.md for context
3. Check Warnings section for known issues

## Three-Attempt Rule

If the same error occurs 3 times:

1. **STOP** - Do not attempt a 4th time
2. **Document** - Add error pattern to Warnings section
3. **Ask** - Request user guidance before proceeding

## Git Workflow

- **NEVER** use `--no-verify` without explicit user approval
- **NEVER** force push to main/master
- Commit messages: `type(scope): description`
  - Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Create feature branches for non-trivial changes

## Quality Gates (Mandatory)

### Pre-Commit Checklist

Before marking any task complete, run:

```bash
/skill audit-compliance --pre-commit
```

Required checks:
- [ ] **Security:** No .env files in git, no API keys in source
- [ ] **Tests:** E2E suite passes (`npm test`)
- [ ] **Coverage:** 80% threshold met (`npm run test:unit:coverage`)
- [ ] **Lint:** ESLint passes (`npm run lint`)
- [ ] **Types:** TypeScript compiles (`npx tsc --noEmit`)

### PR Completeness Criteria

A PR is **NOT** complete unless:
- [ ] All E2E tests pass (no skipped critical paths)
- [ ] Unit tests pass with 80%+ coverage
- [ ] Audit compliance scan passes
- [ ] Documentation updated (CLAUDE.md, TASK.md if needed)
- [ ] Warnings section updated (if new issues found)
- [ ] Code reviewed by audit-compliance skill

### Using the Audit Compliance Skill

```bash
# Quick check before commit
/skill audit-compliance --pre-commit

# Full check before push
/skill audit-compliance --full

# Security only
/skill audit-compliance --security-only

# Auto-fix where possible
/skill audit-compliance --fix
```

**Reference:** `.claude/skills/audit-compliance/SKILL.md`

## Warnings

> Claude: Add discovered issues here as you encounter them.

- **✅ RESOLVED - Credential Exposure:** `.env.local` was verified NOT in git history, but contained real API keys locally. File properly excluded via .gitignore. User should rotate keys as precaution.
- **✅ RESOLVED - Memory State Files:** All 20+ runtime state files removed from git tracking. Added `memory/.gitkeep` to preserve directory structure.
- **Windows PATH Required:** Node.js must be in your system PATH for npm scripts to work. Run `node scripts/setup.js` to check.
- **E2E Test Timeouts:** Production server can be slow (~6s per page) causing Playwright timeouts. Consider using dev server for tests or increasing timeout values.
- **Prisma Patches Available:** Non-breaking patches available for Prisma. Safe to update when convenient.
- **GitHub Webhook Partial:** The GitHub webhook parses @guardian commands but doesn't yet enqueue jobs. Documented as backlog item.
- **Command Injection Protection:** All shell commands use `spawnSync` with argument arrays, not string interpolation. External input (webhooks, CLI args) MUST be validated using `src/lib/guardian/security/` before use. See `.claude/security/sentinel.md` for details.
- **Webhook Authentication Required:** `GITHUB_WEBHOOK_SECRET` is required in all environments. Only test environments with `ALLOW_UNSIGNED_WEBHOOKS=true` can bypass signature verification.

## Architecture

### Folder Structure

```
CCPLATE/
├── .claude/
│   ├── agents/               # Subagent definitions
│   │   ├── meta-agent.md     # Agent factory
│   │   ├── rlm-adapter.md    # Context exploration
│   │   ├── team-coordinator.md # Worktree orchestration
│   │   ├── oracle.md          # Architectural reviewer
│   │   ├── merge-resolver.md # Git conflict resolution
│   │   ├── code-reviewer.md  # Code quality review
│   │   ├── security-reviewer.md # Security analysis
│   │   ├── tdd-guide.md      # Test-driven development
│   │   ├── build-error-resolver.md # Build fixes
│   │   └── refactor-cleaner.md # Dead code removal
│   ├── skills/               # Skill definitions
│   │   ├── coding-standards/ # Code quality patterns
│   │   ├── tdd-workflow/     # TDD methodology
│   │   ├── security-review/  # Security checklist
│   │   ├── backend-patterns/ # Backend patterns
│   │   ├── frontend-patterns/ # Frontend patterns
│   │   └── continuous-learning/ # Pattern extraction
│   ├── rules/                # Auto-loaded rules
│   │   ├── security.md       # Security guidelines
│   │   ├── coding-style.md   # Style guide
│   │   ├── testing.md        # Test requirements
│   │   ├── git-workflow.md   # Git conventions
│   │   ├── agents.md         # Agent orchestration
│   │   ├── patterns.md       # Common patterns
│   │   ├── performance.md    # Performance tips
│   │   └── hooks.md          # Hooks reference
│   └── hooks/                # Claude Code hooks
│       ├── guardian-tick.ts  # PostToolUse supervision
│       ├── path-guard.ts     # PreToolUse protection
│       └── pre-tool-use.ts   # Tool validation
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Home page
│   │   ├── api/              # API routes
│   │   └── (protected)/
│   │       └── guardian/     # Guardian Web UI
│   │           ├── page.tsx          # Dashboard
│   │           ├── timeline/         # Session timeline
│   │           ├── worktrees/        # Worktree status
│   │           └── agents/           # Agent activity
│   ├── cli/
│   │   └── ccplate.ts        # Guardian CLI (22+ command families)
│   ├── components/           # React components
│   │   ├── ui/               # Reusable UI components
│   │   └── features/         # Feature-specific components
│   ├── generated/            # Auto-generated (Prisma client)
│   ├── lib/
│   │   ├── db.ts             # Prisma client singleton
│   │   ├── guardian/         # Guardian control plane (~4,700 LOC)
│   │   │   ├── workflow-state.ts
│   │   │   ├── job-queue.ts
│   │   │   ├── worktree.ts
│   │   │   ├── schema-lock.ts
│   │   │   ├── knowledge-mesh.ts
│   │   │   ├── hitl.ts
│   │   │   ├── preflight.ts
│   │   │   ├── notifications.ts
│   │   │   ├── prd.ts
│   │   │   ├── validation-loop.ts
│   │   │   ├── activity.ts
│   │   │   ├── context-ledger.ts
│   │   │   ├── merge-ledger.ts
│   │   │   ├── audit-log.ts
│   │   │   ├── error-log.ts
│   │   │   └── harness/      # POC harness (~991 LOC)
│   │   ├── agent-builder/    # AI agent builder
│   │   ├── hook-builder/     # AI hook builder
│   │   ├── prompt-builder/   # AI prompt builder
│   │   ├── schema-builder/   # AI schema builder
│   │   ├── api-builder/      # AI API builder
│   │   └── component-builder/ # AI component builder
│   ├── lsp/
│   │   └── sidecar.ts        # LSP sidecar server (~467 LOC)
│   └── types/                # TypeScript type definitions
├── memory/                   # Guardian state files
├── prisma/
│   └── schema.prisma         # Database schema
├── public/                   # Static assets
├── e2e/                      # Playwright E2E tests
└── tests/                    # Unit/integration tests
```

### Key Patterns

- App Router with server components by default
- Client components marked with "use client" when needed
- API routes in `src/app/api/` for backend logic
- Prisma for type-safe database access
- Guardian hooks for workflow supervision
- Worktree isolation for parallel agent work

### Integration Points

- PostgreSQL database via Prisma ORM
- Environment variables in `.env.local`
- Guardian state in `memory/` directory
- Claude Code hooks in `.claude/hooks/`

---

**Last Updated:** 2026-02-06
**Bootstrap Version:** 1.1 (Cherry-pick from everything-claude-code)
