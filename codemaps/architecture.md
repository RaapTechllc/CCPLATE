# CCPLATE Architecture Codemap

> Generated: 2026-01-25T00:00:00Z
> Freshness: CURRENT

## Overview

CCPLATE is a Next.js 16 web application with a Guardian control plane for AI workflow supervision.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CCPLATE                                   │
├─────────────────────────────────────────────────────────────────┤
│  .claude/                    │  src/                            │
│  ├── agents/ (9 agents)      │  ├── app/         (Next.js App)  │
│  ├── hooks/ (4 hooks)        │  ├── cli/         (Guardian CLI) │
│  ├── rules/ (8 rules)        │  ├── components/  (React UI)     │
│  └── skills/                 │  ├── lib/         (Core Logic)   │
│                              │  ├── lsp/         (LSP Sidecar)  │
│  memory/                     │  └── types/       (TypeScript)   │
│  └── *.json/*.jsonl          │                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Layer Architecture

### Layer 1: Presentation (src/app/, src/components/)
- Next.js 16 App Router with React 19
- Server Components by default
- Route groups: `(auth)`, `(protected)`, `(app)`, `admin`

### Layer 2: API (src/app/api/)
- RESTful endpoints with Next.js Route Handlers
- 27 API routes across 8 domains

### Layer 3: Services (src/lib/)
- AI providers (Anthropic, OpenAI)
- Builder systems (agent, api, component, hook, prompt, schema)
- Guardian control plane

### Layer 4: Data (prisma/, src/generated/)
- PostgreSQL via Prisma ORM
- 9 models with soft delete support

### Layer 5: Infrastructure (.claude/, src/cli/)
- Guardian hooks for workflow supervision
- CLI for worktree/job/validation management

## Module Dependencies

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   src/app/   │────▶│  src/lib/    │────▶│   prisma/    │
│  (routes)    │     │  (services)  │     │   (data)     │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│ components/  │     │  .claude/    │
│   (UI)       │     │  (agents)    │
└──────────────┘     └──────────────┘
```

## Key Entry Points

| Entry Point | Purpose |
|-------------|---------|
| `src/app/layout.tsx` | Root layout with providers |
| `src/app/page.tsx` | Home page |
| `src/cli/ccplate.ts` | Guardian CLI (22+ commands) |
| `.claude/hooks/guardian-tick.ts` | PostToolUse supervision |
| `.claude/hooks/path-guard.ts` | PreToolUse protection |

## Configuration Files

| File | Purpose |
|------|---------|
| `ccplate.config.json` | Guardian configuration |
| `prisma/schema.prisma` | Database schema |
| `.claude/settings.json` | Claude Code settings |
| `next.config.ts` | Next.js configuration |
| `tsconfig.json` | TypeScript configuration |

## Memory/State Files

| Path | Format | Purpose |
|------|--------|---------|
| `memory/workflow-state.json` | JSON | Current workflow state |
| `memory/guardian-state.json` | JSON | Nudge cooldowns |
| `memory/guardian-nudges.jsonl` | JSONL | Nudge history |
| `memory/audit-log.jsonl` | JSONL | Audit trail |
| `memory/merge-ledger.jsonl` | JSONL | Merge history |
| `memory/context-ledger.json` | JSON | Context pressure |

## Tech Stack Summary

- **Runtime:** Node.js 18+ (Bun for CLI)
- **Framework:** Next.js 16.1.4
- **React:** 19.2.3
- **Database:** PostgreSQL
- **ORM:** Prisma 7.2.0
- **Styling:** Tailwind CSS
- **Auth:** NextAuth.js
- **AI:** Anthropic Claude, OpenAI
