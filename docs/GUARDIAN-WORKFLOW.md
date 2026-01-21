# Amp Guardian Workflow Guide

> Practical workflows for using the Guardian system in real development.

## Quick Start

### 1. Verify Guardian is Active

```bash
# Check config
cat ccplate.config.json | jq '.guardian.enabled'

# Check hook is registered
cat .claude/settings.json | jq '.hooks'

# View recent nudges
cat memory/guardian-nudges.jsonl | tail -5
```

### 2. Start a Development Session

```bash
# Start dev server
npm run dev

# In another terminal, start Claude Code
# Guardian hooks automatically when Claude uses tools
```

---

## Workflow A: Solo Development (Most Common)

**Scenario:** You're working on a feature alone with Claude.

### The Guardian Loop

```
┌─────────────────────────────────────────────────────────┐
│  1. You give Claude a task                               │
│     "Add user search to the admin panel"                │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  2. Claude works, Guardian monitors                      │
│     - Tracks files changed                               │
│     - Watches for errors                                 │
│     - Measures time since last commit                    │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  3. Guardian Nudges (when triggered)                     │
│     💡 "8 files changed, no commit in 20min. Commit?"   │
│     💡 "New function added without tests. Write tests?" │
│     💡 "2 TypeScript errors detected. Fix?"             │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  4. You or Claude responds to nudge                      │
│     "Yes, commit with message: feat(admin): add search" │
└─────────────────────────────────────────────────────────┘
```

### Nudge Types & Responses

| Nudge | Example Response |
|-------|------------------|
| **Commit** | "Yes, commit" or "Not yet, still working" |
| **Test** | "Generate tests for the new functions" |
| **Error** | "Fix those errors" or "Ignore for now" |
| **Context** | "Handoff to a new thread" |

---

## Workflow B: Multi-Agent Parallel Work

**Scenario:** Large feature requiring changes across multiple layers.

### Step 1: Plan with Oracle

```
You: "Plan the OAuth implementation with Google and GitHub providers"

Claude: *consults Oracle for architecture review*

Oracle recommends:
- oauth-config: Environment setup, provider configs
- oauth-api: [...nextauth]/route.ts, callbacks
- oauth-ui: Login buttons, OAuth callback handling
- oauth-db: User model updates for linked accounts
```

### Step 2: Create Worktrees

```bash
# Claude runs these via the ccplate CLI
ccplate worktree create oauth-config
ccplate worktree create oauth-api
ccplate worktree create oauth-ui
ccplate worktree create oauth-db

# Each creates:
# - .worktrees/oauth-api/ (isolated copy)
# - Branch: ccplate/oauth-api
```

### Step 3: Spawn Parallel Agents

```
Claude (team-coordinator): 
"I'm spawning 4 subagents to work in parallel:
 - Agent 1: oauth-config (environment + types)
 - Agent 2: oauth-api (NextAuth route)
 - Agent 3: oauth-ui (components)
 - Agent 4: oauth-db (schema updates)
 
 Each agent is isolated to their worktree."
```

### Step 4: Guardian Monitors All

```
Guardian tracks each worktree:
- memory/workflow-state.json shows all active worktrees
- Nudges apply per-worktree (e.g., "oauth-api has 5 uncommitted files")
- Path guard ensures agents stay in their lane
```

### Step 5: Merge & Verify

```bash
# After all agents complete
ccplate worktree cleanup oauth-config --merge
ccplate worktree cleanup oauth-api --merge
ccplate worktree cleanup oauth-ui --merge
ccplate worktree cleanup oauth-db --merge

# Run full test suite
npm test

# Oracle reviews merged code
```

---

## Workflow C: RLM-lite for Large Codebases

**Scenario:** Working with a codebase too large to fit in context.

### The Problem

```
You: "How does authentication work in this codebase?"

❌ BAD: Claude reads 50 files (context explodes)
✅ GOOD: Claude uses RLM-adapter for smart retrieval
```

### The Solution

```
1. Query Understanding
   - "Need to find auth flow: login → session → protected routes"

2. Targeted Retrieval
   - Grep: "NextAuth|signIn|signOut" → 12 files
   - LSP: references to `getServerSession` → 8 locations
   - Read: Only the relevant 20-line excerpts

3. Recursive Decomposition (if needed)
   - >10 results? Split by module, spawn subagents
   - Each subagent summarizes their module
   - Aggregate into coherent answer

4. Context Ledger
   - Logs what was consulted
   - Enables "show me what you looked at"
```

### Check Context Pressure

```bash
# View current context state
cat memory/context-ledger.json | jq '.consultations | length'

# Guardian nudges when context_pressure > 0.8
# Response: "Handoff to fresh thread" or "Continue, I'll manage"
```

---

## Workflow D: LSP-Powered Code Intelligence

**Scenario:** Deep code understanding beyond text search.

### Available Commands

```bash
# Find where a function is defined
ccplate lsp definition src/lib/auth.ts:15:10

# Find all usages of a function
ccplate lsp references signIn

# Get all errors/warnings
ccplate lsp diagnostics

# List symbols in a directory
ccplate lsp symbols src/lib/
```

### Guardian + LSP Integration

```
Guardian automatically:
1. Runs diagnostics after code changes
2. Includes errors in nudges
3. Tracks lsp_diagnostics_count in workflow state

Nudge: "💡 3 TypeScript errors after your changes:
 - src/lib/auth.ts:23 - Type 'string' not assignable to 'User'
 - src/components/login.tsx:45 - Property 'email' missing
 Fix before continuing?"
```

---

## Configuration

### Tune Nudge Thresholds

Edit `ccplate.config.json`:

```json
{
  "guardian": {
    "nudges": {
      "commit": {
        "filesThreshold": 10,    // More tolerance for large changes
        "minutesThreshold": 30   // Longer before nagging
      }
    },
    "cooldown": {
      "minutes": 15,             // Less frequent nudges
      "toolUses": 10
    }
  }
}
```

### Disable Specific Nudges

```json
{
  "guardian": {
    "nudges": {
      "test": { "enabled": false },     // Disable test nudges
      "progress": { "enabled": false }  // Disable off-topic warnings
    }
  }
}
```

### Enable LSP

```json
{
  "lsp": {
    "enabled": true,
    "languages": ["typescript", "javascript"]
  }
}
```

---

## Monitoring & Debugging

### View Workflow State

```bash
cat memory/workflow-state.json | jq '.'
```

Output:
```json
{
  "session_id": "2026-01-21-abc123",
  "files_changed": 7,
  "last_commit_time": "2026-01-21T14:30:00Z",
  "last_test_time": "2026-01-21T14:15:00Z",
  "active_worktrees": [],
  "lsp_diagnostics_count": 0
}
```

### View Nudge History

```bash
cat memory/guardian-nudges.jsonl | tail -10 | jq '.'
```

### View Context Consultations

```bash
cat memory/context-ledger.json | jq '.consultations[-3:]'
```

### Check Guardian State (Cooldowns)

```bash
cat memory/guardian-state.json | jq '.'
```

---

## UI Dashboard

Access the Guardian UI at: **http://localhost:3000/guardian**

### Pages

| Page | URL | Purpose |
|------|-----|---------|
| Config | `/guardian` | Toggle nudges, adjust thresholds |
| Timeline | `/guardian/timeline` | Session history, nudge events |
| Agents | `/guardian/agents` | Active subagents, their status |
| Worktrees | `/guardian/worktrees` | Create, view, cleanup worktrees |

---

## Troubleshooting

### Nudges Not Appearing

1. Check `ccplate.config.json` → `guardian.enabled: true`
2. Check `.claude/settings.json` → hooks registered
3. Check `memory/guardian-state.json` → cooldown not active
4. Check `memory/guardian-nudges.jsonl` → nudges being logged

### Path Guard Blocking Writes

```bash
# Check blocked commands
cat memory/blocked-commands.jsonl | tail -5

# Verify worktree assignment
echo $CCPLATE_WORKTREE
```

### LSP Not Working

```bash
# Start LSP manually
ccplate lsp start

# Check if tsserver is running
ps aux | grep tsserver
```

---

## Best Practices

1. **Trust the Nudges** - They're there to help, not annoy
2. **Commit Often** - Small commits = easy rollback
3. **Test as You Go** - Guardian will remind you anyway
4. **Use Worktrees for Big Changes** - Isolation prevents conflicts
5. **Check the Dashboard** - Visual feedback beats log files
6. **Adjust Thresholds** - Every project is different

---

**Last Updated:** 2026-01-21
