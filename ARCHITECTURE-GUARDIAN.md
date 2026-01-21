# CCPLATE Guardian Architecture

> **Version:** 1.0  
> **Last Updated:** 2026-01-21  
> **Status:** Planning → Implementation Ready

## Executive Summary

CCPLATE Guardian transforms Claude Code into a full **multi-agent orchestration platform** by leveraging Claude Code's existing primitives (Task, Oracle, Handoff, hooks) rather than rebuilding them. The architecture focuses on:

1. **Guardian Agent** - Workflow supervisor via hooks
2. **Orchestration Layer** - Plan decomposition → parallel agents → merge
3. **RLM-lite** - Infinite context through tool-augmented retrieval + recursive subagents
4. **LSP Integration** - Deep code intelligence via sidecar service
5. **Worktree Isolation** - Parallel work without conflicts

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER NATURAL LANGUAGE                           │
│                    "Add OAuth with Google and GitHub"                   │
└─────────────────────────────────────────────┬───────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        GUARDIAN CONTROL PLANE                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │  Workflow   │  │   Nudge      │  │  Worktree   │  │   Context    │  │
│  │   State     │  │   Engine     │  │   Manager   │  │   Ledger     │  │
│  └─────────────┘  └──────────────┘  └─────────────┘  └──────────────┘  │
└─────────────────────────────────────────────┬───────────────────────────┘
                                              │
              ┌───────────────────────────────┼───────────────────────────┐
              │                               │                           │
              ▼                               ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   ORACLE (Planning) │     │  TEAM COORDINATOR   │     │    LSP SIDECAR      │
│   • Analyzes scope  │     │  • Splits tasks     │     │  • tsserver         │
│   • Creates PRP     │     │  • Assigns agents   │     │  • gopls            │
│   • Reviews merges  │     │  • Manages worktrees│     │  • rust-analyzer    │
└──────────┬──────────┘     └──────────┬──────────┘     └──────────┬──────────┘
           │                           │                           │
           │        ┌──────────────────┴──────────────────┐        │
           │        │                                     │        │
           ▼        ▼                                     ▼        ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   WORKTREE A        │  │   WORKTREE B        │  │   WORKTREE C        │
│   Branch: oauth-ui  │  │   Branch: oauth-api │  │   Branch: oauth-db  │
│   Agent: Implementer│  │   Agent: Implementer│  │   Agent: Tester     │
│   Files: /ui/**     │  │   Files: /api/**    │  │   Files: /tests/**  │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
           │                           │                           │
           └───────────────────────────┴───────────────────────────┘
                                       │
                                       ▼
                        ┌─────────────────────────────┐
                        │      MERGE & VERIFY         │
                        │  • Run tests                │
                        │  • Oracle review            │
                        │  • Create PR                │
                        └─────────────────────────────┘
```

---

## Core Components

### 1. Guardian Control Plane

The Guardian is the **supervisor layer** that monitors and guides the development workflow.

#### Workflow State (`memory/workflow-state.json`)

```json
{
  "session_id": "2026-01-21-abc123",
  "current_prp_step": 3,
  "total_prp_steps": 7,
  "files_changed": 12,
  "last_commit_time": "2026-01-21T14:30:00Z",
  "last_test_time": "2026-01-21T14:15:00Z",
  "context_pressure": 0.45,
  "active_worktrees": [
    { "id": "oauth-ui", "branch": "ccplate/oauth-ui", "agent": "implementer" },
    { "id": "oauth-api", "branch": "ccplate/oauth-api", "agent": "implementer" }
  ],
  "pending_nudges": [],
  "errors_detected": [],
  "lsp_diagnostics_count": 2
}
```

#### Nudge Engine

Triggers (evaluated on every tool use):

| Nudge Type | Condition | Message |
|------------|-----------|---------|
| Commit | `files_changed > 5 AND minutes_since_commit > 15` | "💡 12 files changed, no commit in 20min. Checkpoint?" |
| Test | `new_code_touched AND !test_run_recent` | "💡 New functions added without tests. Generate tests?" |
| Progress | `off_topic_detected` | "💡 Step 3/7 in plan. This seems unrelated - pivot or continue?" |
| Context | `context_pressure > 0.8` | "💡 Context 80% full. Consider handoff or RLM mode?" |
| Error | `lsp_diagnostics_count > 0` | "💡 2 TypeScript errors in auth.ts. Fix before continuing?" |

**Cooldown Rules:**
- Max 1 nudge per tool cycle
- Don't repeat same nudge type within 5 tool uses or 10 minutes
- User can mute via `ccplate guardian mute [nudge-type]`

---

### 2. Agent Mesh (Claude Code Native)

Leverages Claude Code's **Task tool** for spawning isolated subagents.

#### Agent Roster

| Agent | Role | Model | Tools |
|-------|------|-------|-------|
| `oracle` | Deep planning & review | opus | Read, Grep, Glob, finder |
| `planner` | PRP generation | sonnet | Read, Grep, Glob |
| `implementer` | Code writing | sonnet | Read, Write, Edit, Bash, LSP |
| `tester` | Test generation & running | sonnet | Read, Write, Bash |
| `reviewer` | Code review | opus | Read, Grep, LSP, get_diagnostics |
| `documenter` | Documentation | sonnet | Read, Write |
| `team-coordinator` | Orchestration | sonnet | Read, Bash (worktree cmds) |
| `rlm-adapter` | Infinite context retrieval | sonnet | Read, Grep, Glob, LSP |

#### team-coordinator Process

```markdown
1. Receive task from user/Oracle
2. Analyze scope → identify parallelizable chunks
3. For each chunk:
   - Create worktree: `ccplate worktree create <task-id>`
   - Spawn subagent via Task tool with worktree context
4. Monitor progress (via workflow-state.json)
5. When all complete:
   - Run cross-worktree tests
   - Invoke Oracle for review
   - Merge branches (or create PRs)
   - Cleanup worktrees
```

---

### 3. Worktree Manager

Git worktrees provide **isolated sandboxes** for parallel agent work.

#### CLI Commands

```bash
# Create isolated worktree for a task
ccplate worktree create oauth-api
# → git worktree add .worktrees/oauth-api -b ccplate/oauth-api

# List active worktrees
ccplate worktree list
# → oauth-api  .worktrees/oauth-api  ccplate/oauth-api  (implementer)
# → oauth-ui   .worktrees/oauth-ui   ccplate/oauth-ui   (implementer)

# Cleanup after merge
ccplate worktree cleanup oauth-api
# → git worktree remove .worktrees/oauth-api
# → git branch -d ccplate/oauth-api
```

#### Path Guard Integration

Update `.claude/hooks/path-guard.ts` to enforce worktree isolation:

```typescript
// If agent is assigned to worktree "oauth-api", only allow writes to:
// - .worktrees/oauth-api/**
// - memory/** (shared state)

function validateWorktreeAccess(path: string, assignedWorktree: string): boolean {
  const allowedPaths = [
    `.worktrees/${assignedWorktree}/`,
    'memory/',
    '.claude/agents/' // Allow creating new agents
  ];
  return allowedPaths.some(allowed => path.startsWith(allowed));
}
```

---

### 4. RLM-lite (Infinite Context Without MIT Stack)

**Core Insight:** You don't need to implement MIT's RLM internals. The practical value comes from **tool-augmented retrieval + recursive decomposition**.

#### The Rule

> **Never dump the repo into context. Always retrieve on demand.**

#### rlm-adapter Agent Process

```markdown
## RLM-Adapter Agent

### Role
Navigate large codebases by retrieving relevant context on demand,
not by loading everything into the prompt.

### Process

1. **Understand the Query**
   - What does the user/agent need to know?
   - What type of information? (definition, usage, pattern, all of X)

2. **Gather Candidates**
   - Use Grep for text patterns
   - Use LSP for symbols, references, definitions
   - Use Glob for file structure

3. **Recursive Decomposition**
   For large result sets (>10 files):
   - Group by directory/module
   - Spawn subagent per group with focused question
   - Aggregate findings with citations

4. **Return Excerpts, Not Files**
   - Max 50 lines per excerpt
   - Always cite file:line
   - Summarize, don't dump

5. **Update Context Ledger**
   Log what was consulted for transparency
```

#### Context Ledger (`memory/context-ledger.json`)

```json
{
  "session_id": "2026-01-21-abc123",
  "consultations": [
    {
      "timestamp": "2026-01-21T14:30:00Z",
      "query": "How does authentication work?",
      "sources_checked": [
        { "type": "grep", "pattern": "NextAuth", "files_matched": 5 },
        { "type": "lsp", "action": "references", "symbol": "signIn", "count": 12 },
        { "type": "read", "file": "src/lib/auth.ts", "lines": "1-50" }
      ],
      "key_findings": [
        "NextAuth configured in src/lib/auth.ts",
        "Credentials + OAuth providers supported",
        "JWT strategy with Prisma adapter"
      ]
    }
  ]
}
```

---

### 5. LSP Sidecar Service

A persistent process that provides **code intelligence** to agents.

#### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   LSP SIDECAR (Node/Bun)                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  tsserver   │  │   gopls     │  │rust-analyzer│     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                          │                              │
│                    JSON-RPC / HTTP                      │
└─────────────────────────────┬───────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                 ccplate lsp CLI                         │
│  $ ccplate lsp definition src/lib/auth.ts:15:10        │
│  $ ccplate lsp references signIn                        │
│  $ ccplate lsp diagnostics                              │
│  $ ccplate lsp symbols src/components/                  │
└─────────────────────────────────────────────────────────┘
```

#### CLI Interface

```bash
# Get definition location
ccplate lsp definition src/lib/auth.ts:15:10
# → src/lib/auth.ts:5:1 - export function signIn(...)

# Find all references to a symbol
ccplate lsp references signIn --limit 20
# → src/app/api/auth/[...nextauth]/route.ts:12
# → src/components/features/auth/login-form.tsx:45
# → ...

# Get diagnostics (errors/warnings)
ccplate lsp diagnostics
# → ERROR src/lib/auth.ts:23 - Type 'string' is not assignable to 'User'
# → WARN  src/components/ui/button.tsx:5 - 'variant' is defined but never used

# Get symbols in a directory
ccplate lsp symbols src/lib/
# → function signIn (src/lib/auth.ts:5)
# → function signOut (src/lib/auth.ts:25)
# → class PrismaAdapter (src/lib/db.ts:10)
```

#### Integration Points

| Component | Uses LSP For |
|-----------|--------------|
| Guardian | Error nudges (diagnostics) |
| rlm-adapter | Finding relevant code (definitions, references) |
| reviewer | Deeper code analysis |
| implementer | Understanding existing patterns |

---

## Implementation Phases

### Phase 0: Foundation (S: <1 hour)

**Goal:** Prepare the infrastructure for Guardian.

- [ ] Expand tool logging to include all tools (not just Write/Edit)
- [ ] Create `memory/workflow-state.json` with initial schema
- [ ] Update `path-guard.ts` to understand `.worktrees/**`
- [ ] Create `ccplate.config.json` for Guardian settings

```json
// ccplate.config.json
{
  "guardian": {
    "enabled": true,
    "nudges": {
      "commit": { "filesThreshold": 5, "minutesThreshold": 15 },
      "test": { "enabled": true },
      "progress": { "enabled": true },
      "context": { "threshold": 0.8 },
      "error": { "enabled": true }
    },
    "cooldown": { "minutes": 10, "toolUses": 5 }
  },
  "worktrees": {
    "baseDir": ".worktrees",
    "branchPrefix": "ccplate/"
  },
  "lsp": {
    "enabled": false,
    "languages": ["typescript"]
  }
}
```

---

### Phase 1: Guardian MVP (M: 1-3 hours)

**Goal:** Working workflow supervisor with basic nudges.

- [ ] Implement `guardian-tick.ts` hook (PostToolUse)
- [ ] Add commit nudge logic
- [ ] Add test nudge logic  
- [ ] Add error nudge logic (basic - check for "error" in tool output)
- [ ] Implement cooldown mechanism
- [ ] Write nudges to `memory/guardian-nudges.jsonl`
- [ ] Create `memory/guardian-last.txt` for injection

```typescript
// .claude/hooks/guardian-tick.ts (skeleton)
interface WorkflowState {
  files_changed: number;
  last_commit_time: string;
  last_test_time: string;
  // ...
}

async function evaluateNudges(state: WorkflowState): Promise<string | null> {
  // Check commit nudge
  if (state.files_changed > 5 && minutesSince(state.last_commit_time) > 15) {
    return `💡 ${state.files_changed} files changed, no commit in ${minutesSince(state.last_commit_time)}min. Checkpoint?`;
  }
  // ... other nudges
  return null;
}
```

---

### Phase 2: Worktree Isolation + Team Coordinator (L: 1-2 days)

**Goal:** Parallel agent work in isolated branches.

- [ ] Implement `ccplate worktree create/list/cleanup` CLI
- [ ] Create `team-coordinator.md` agent
- [ ] Update `path-guard.ts` for worktree enforcement
- [ ] Add worktree tracking to workflow-state
- [ ] Implement merge strategy (PR-based or direct merge)

---

### Phase 3: LSP v1 (L: 1-2 days)

**Goal:** Code intelligence for TypeScript.

- [ ] Implement LSP sidecar server (tsserver first)
- [ ] Create `ccplate lsp` CLI commands
- [ ] Add LSP diagnostics to Guardian error nudges
- [ ] Update rlm-adapter to use LSP for symbol lookup

---

### Phase 4: RLM-lite Recursion + Ledger (L: 1-2 days)

**Goal:** Infinite context through smart retrieval.

- [ ] Create `rlm-adapter.md` agent
- [ ] Implement context ledger
- [ ] Add recursive subagent spawning for large queries
- [ ] Integrate with Handoff for context pressure relief

---

### Phase 5: UI Integration + Observability (L-XL)

**Goal:** Visual control and monitoring.

- [ ] Builder UI for Guardian config
- [ ] Session timeline visualization
- [ ] Agent activity dashboard
- [ ] Worktree status view

---

## Competitive Positioning

| Feature | Amp | Cursor | CCPLATE Guardian |
|---------|-----|--------|------------------|
| Multi-agent orchestration | ✅ | ❌ | ✅ |
| Workflow supervision (Guardian) | ❌ | ❌ | ✅ Unique |
| Infinite context (RLM-lite) | ❌ (400k limit) | ❌ | ✅ Unique |
| LSP integration | Partial | ✅ | ✅ |
| Worktree isolation | ❌ | ❌ | ✅ Unique |
| Open source | ❌ | ❌ | ✅ |
| Self-improvement loop | ❌ | ❌ | ✅ (learnings.md) |

---

## Key Differentiators

### 1. Guardian Agent (Workflow Supervision)
No other AI coding tool actively supervises your workflow. CCPLATE Guardian catches forgotten commits, missing tests, and context overflow before they become problems.

### 2. RLM-lite (Practical Infinite Context)
Instead of theoretical "infinite context" that requires custom training, we implement the practical pattern: tool-augmented retrieval + recursive decomposition. Works today with Claude Code's existing tools.

### 3. Worktree-Based Parallelism
True isolation for parallel agent work. No file conflicts. Clean merges. Enterprise-ready.

### 4. LSP-Powered Intelligence
Deep code understanding through Language Service Protocol. Not just text search - actual semantic analysis.

### 5. Open & Extensible
Full visibility into how the system works. Add your own agents, nudges, and integrations.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Hook limitations (no prompt-level event) | Use PostToolUse ticks; add `/guardian` command fallback |
| Nudge spam | Strict cooldown + one-nudge-per-cycle + user mute |
| Worktree merge conflicts | Start single-worktree, add parallelism carefully |
| LSP output bloat | Cap output size, return locations + excerpts only |
| Security | Extend PreToolUse damage control to new `ccplate` commands |

---

## Next Steps

1. **Immediate:** Implement Phase 0 (Foundation) - ~1 hour
2. **This Week:** Complete Phase 1 (Guardian MVP) - 1-3 hours
3. **Next Week:** Phase 2 (Worktrees) - 1-2 days
4. **Following:** Phase 3-5 based on feedback

---

## Appendix: Claude Code Capabilities Leveraged

| Claude Code Feature | How Guardian Uses It |
|--------------------|---------------------|
| **Task tool** | Spawns isolated subagents for parallel work |
| **Oracle** | Deep planning and review |
| **Handoff** | Context preservation across sessions |
| **Hooks (PreToolUse)** | Damage control, path protection |
| **Hooks (PostToolUse)** | Guardian tick, tool logging |
| **finder** | Semantic code search |
| **get_diagnostics** | Error detection (complements LSP) |
| **AGENTS.md** | Agent definitions loaded automatically |
| **Memory files** | Persistent state across sessions |

---

**Document Status:** Ready for implementation  
**Author:** CCPLATE Team  
**Review:** Oracle-assisted architecture planning
