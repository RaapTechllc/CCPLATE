# CCPLATE Backend Codemap

> Generated: 2026-01-25T00:00:00Z
> Freshness: CURRENT

## API Routes (src/app/api/)

### Auth Domain
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/auth/[...nextauth]` | GET,POST | NextAuth.js handler |
| `/api/auth/register` | POST | User registration |

### Users Domain
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/users` | GET | List users |
| `/api/users/me` | GET,PATCH | Current user profile |
| `/api/users/[id]` | GET,PATCH,DELETE | User CRUD |

### Admin Domain
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/admin/users` | GET | List users (admin) |
| `/api/admin/users/[id]` | GET,PATCH,DELETE | User management |
| `/api/admin/stats` | GET | Dashboard statistics |
| `/api/admin/settings` | GET | System settings |
| `/api/admin/settings/[key]` | GET,PUT | Setting CRUD |

### Builder APIs
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/agents` | GET,POST | Agent CRUD |
| `/api/agents/[id]` | GET,PATCH,DELETE | Agent management |
| `/api/agents/[id]/run` | POST | Execute agent |
| `/api/api-builder/generate` | POST | Generate API code |
| `/api/api-builder/apply` | POST | Apply generated API |
| `/api/api-builder/models` | GET | List Prisma models |
| `/api/component-builder/generate` | POST | Generate component |
| `/api/component-builder/apply` | POST | Apply component |
| `/api/schema-builder/generate` | POST | Generate schema |
| `/api/schema-builder/preview` | POST | Preview schema changes |
| `/api/schema-builder/apply` | POST | Apply schema |
| `/api/prompts` | GET,POST | Prompt CRUD |
| `/api/prompts/[id]` | GET,PATCH,DELETE | Prompt management |
| `/api/prompts/[id]/test` | POST | Test prompt |

### File Uploads
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/uploads` | GET,POST | File upload/list |
| `/api/uploads/[id]` | GET,DELETE | File management |

### Webhooks
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/webhooks/github` | POST | GitHub webhook handler |

## Guardian System (src/lib/guardian/)

### Core Modules (~4,700 LOC)
| Module | LOC | Exports |
|--------|-----|---------|
| `index.ts` | - | Re-exports all modules |
| `job-queue.ts` | ~200 | `getAllJobs`, `getJob`, `createJob` |
| `job-executor.ts` | ~150 | `processQueue`, `executeJob` |
| `hitl.ts` | ~180 | `getPendingHITLRequests`, `resolveHITLRequest` |
| `knowledge-mesh.ts` | ~200 | `broadcast`, `getKnowledge`, `formatKnowledgeForPrompt` |
| `preflight.ts` | ~250 | `runPreflightChecks`, `autoFixWorktree` |
| `schema-lock.ts` | ~150 | `acquireSchemaLock`, `releaseSchemaLock` |
| `prd.ts` | ~300 | `runInteractiveInterview`, `savePRD`, `loadPRD` |
| `playwright-validation.ts` | ~350 | `runPlaywrightTests`, `registerTaskTests` |
| `activity-narrator.ts` | ~200 | `narrateTaskStart`, `narrateTaskComplete` |
| `merge-ledger.ts` | ~180 | `recordMerge`, `rollbackMerge` |
| `audit-log.ts` | ~150 | `getAuditEntries`, `formatAuditEntries` |
| `labeling.ts` | ~200 | `analyzeIssue`, `checkParallelSafety` |
| `logger.ts` | ~150 | `parseLogEntries`, `formatLogEntries` |
| `merge-resolver.ts` | ~250 | `getConflictedFiles`, `resolveConflicts` |
| `stack-profiles.ts` | ~200 | `getProfiles`, `activateProfile` |
| `handoff.ts` | ~150 | `createHandoff`, `loadHandoff` |
| `notifications.ts` | ~180 | Slack/Discord/Email notifications |
| `path-guard.ts` | ~100 | Path protection utilities |
| `worktree-resolver.ts` | ~200 | Git worktree management |
| `snapshots.ts` | ~150 | State snapshots |
| `error-log.ts` | ~100 | Standardized error logging |
| `context-watchdog.ts` | NEW | Context pressure monitoring |

### Security Module (src/lib/guardian/security/)
| Module | Purpose |
|--------|---------|
| `input-validation.ts` | Input sanitization, injection prevention |
| `index.ts` | Re-exports validation functions |

### Harness Module (src/lib/guardian/harness/)
| Module | LOC | Purpose |
|--------|-----|---------|
| `index.ts` | ~300 | `startHarnessRun`, `pickVariant`, `cleanupHarness` |
| `harness-state.ts` | ~200 | State management |
| `harness-runner.ts` | ~250 | Variant execution |
| `variant-runner.ts` | ~150 | Individual variant runner |
| `report.ts` | ~100 | Report generation |

## AI Providers (src/lib/ai/)

```
src/lib/ai/
├── index.ts           # Main exports
├── config.ts          # AI configuration
├── errors.ts          # Error types
├── retry.ts           # Retry logic
├── providers/
│   ├── index.ts       # Provider factory
│   ├── types.ts       # Provider interfaces
│   ├── anthropic.ts   # Claude integration
│   └── openai.ts      # OpenAI integration
├── parsing/
│   ├── index.ts       # Parsing utilities
│   ├── json.ts        # JSON extraction
│   └── zod.ts         # Zod schema parsing
└── prompts/
    └── template.ts    # Prompt templating
```

## Builder Systems (src/lib/*-builder/)

| Builder | Files | Purpose |
|---------|-------|---------|
| `agent-builder/` | 6 files | AI agent creation & runtime |
| `api-builder/` | 5 files | API endpoint generation |
| `component-builder/` | 6 files | React component generation |
| `hook-builder/` | 5 files | React hook generation |
| `prompt-builder/` | 3 files | Prompt management |
| `schema-builder/` | 5 files | Prisma schema generation |

## CLI (src/cli/ccplate.ts)

22+ command families:
- `status` - Unified dashboard
- `worktree` - Git worktree management
- `schema` - Schema lock management
- `mesh` - Knowledge mesh
- `hitl` - Human-in-the-loop
- `validate` - Playwright validation
- `activity` - Activity narrator
- `harness` - POC variant testing
- `triage` - Issue labeling
- `parallel-check` - Parallel safety
- `log` - Structured logging
- `resolve` - Merge conflict resolution
- `lsp` - LSP sidecar
- `merge` - Merge history/rollback
- `audit` - Audit logging
- `hook` - Hook generation
- `component` - Component generation
- `api` - API generation
- `profile` - Stack profiles
- `handoff` - Session handoff

## LSP Sidecar (src/lsp/sidecar.ts)

~467 LOC providing:
- Language Server Protocol client
- TypeScript diagnostics
- Code navigation support
