# CCPLATE CLI Reference

The `ccplate` CLI provides Guardian system commands for workflow supervision, worktree isolation, and validation.

## Usage

```bash
ccplate <command> [subcommand] [options]
```

## Commands

### Project Initialization

```bash
ccplate init [--force]     # Run discovery interview and create PRD
ccplate init status        # Show current PRD status
```

**Examples:**
```bash
ccplate init               # Start interactive PRD interview
ccplate init --force       # Overwrite existing PRD
ccplate init status        # Check if PRD exists and show summary
```

### Worktree Management

Create isolated git worktrees for parallel development.

```bash
ccplate worktree create <task-id>   # Create isolated worktree
ccplate worktree list               # List active worktrees
ccplate worktree validate <task-id> # Run preflight checks
ccplate worktree fix <task-id>      # Auto-fix common issues
ccplate worktree cleanup <task-id>  # Remove worktree after merge
```

**Examples:**
```bash
ccplate worktree create oauth-api
ccplate worktree list
ccplate worktree validate oauth-api
ccplate worktree fix oauth-api
ccplate worktree cleanup oauth-api
```

### Schema Lock

Coordinate Prisma schema changes across worktrees.

```bash
ccplate schema lock        # Acquire schema lock for current worktree
ccplate schema unlock      # Release schema lock
ccplate schema status      # Show current lock status
```

### LSP Commands

TypeScript language server integration for code intelligence.

```bash
ccplate lsp definition <file>:<line>:<column>   # Get definition location
ccplate lsp references <symbol> [--limit N]     # Find all references
ccplate lsp diagnostics [file]                  # Get errors/warnings
ccplate lsp symbols <path>                      # Get symbols in file/directory
```

**Examples:**
```bash
ccplate lsp definition src/lib/auth.ts:15:10
ccplate lsp references signIn --limit 20
ccplate lsp diagnostics
ccplate lsp diagnostics src/lib/auth.ts
ccplate lsp symbols src/lib/
```

### Builder Commands

Generate code using AI.

```bash
ccplate hook generate <description>       # Generate a React hook
ccplate component generate <description>  # Generate a React component
ccplate api generate <description>        # Generate an API route
```

**Examples:**
```bash
ccplate hook generate "fetch user data with pagination"
ccplate component generate "modal dialog with close button"
ccplate api generate "create user endpoint with validation"
```

### Job Queue

Manage Guardian background jobs.

```bash
ccplate jobs list          # List all Guardian jobs
ccplate jobs get <job-id>  # Get details of a specific job
ccplate jobs process       # Process pending jobs
```

### Knowledge Mesh

Share knowledge across worktrees.

```bash
ccplate mesh broadcast <type> <title> <content>   # Broadcast knowledge
ccplate mesh list [--since <minutes>]             # List recent entries
ccplate mesh inject                               # Output formatted knowledge
```

**Types:** `discovery`, `decision`, `warning`, `pattern`

### Human-in-the-Loop (HITL)

Handle requests requiring human approval.

```bash
ccplate hitl list                                    # List pending requests
ccplate hitl show <id>                               # Show request details
ccplate hitl approve <id> [--by <name>] [--notes <text>]  # Approve
ccplate hitl reject <id> [--by <name>] [--notes <text>]   # Reject
```

### POC Harness

Run parallel implementation experiments.

```bash
ccplate harness --variants <N> --goal "<desc>"  # Start harness run
ccplate harness --names a,b,c --goal "<desc>"   # Named variants
ccplate harness status [run-id]                 # Show run status
ccplate harness pick <variant-id>               # Select variant to merge
ccplate harness cleanup [run-id]                # Remove non-selected
ccplate harness report [run-id]                 # Regenerate report
```

**Options:**
- `--variants <N>` - Number of variants to create
- `--names <a,b,c>` - Explicit variant names
- `--goal "<description>"` - Goal for each variant
- `--max-minutes <N>` - Timeout per variant (default: 30)
- `--no-prd` - Skip PRD requirement check
- `--dry-run` - Preview without creating worktrees

**Examples:**
```bash
ccplate harness --variants 3 --goal "Auth implementation"
ccplate harness --names clerk,nextauth,custom --goal "Auth strategy"
ccplate harness status
ccplate harness pick variant-1
ccplate harness cleanup
```

### Validation

Playwright-based task completion verification.

```bash
ccplate validate status                          # Show validation status
ccplate validate run [test-pattern]              # Run Playwright tests
ccplate validate register <task-id> <patterns>   # Register required tests
ccplate validate check <task-id>                 # Check if task can complete
ccplate validate fixloop status                  # Show fix loop status
ccplate validate fixloop end                     # End active fix loop
```

**Examples:**
```bash
ccplate validate status
ccplate validate run auth
ccplate validate register oauth-task "auth/*.spec.ts"
ccplate validate check oauth-task
```

### Activity Narrator

Track and log development activity.

```bash
ccplate activity status                # Show current loop number
ccplate activity start <task>          # Log task start
ccplate activity complete <task>       # Log task completion
ccplate activity clear                 # Clear activity log
ccplate activity loop                  # Increment loop counter
```

**Examples:**
```bash
ccplate activity start "Implementing OAuth flow"
ccplate activity complete "OAuth flow" --remaining 3 --total 5
ccplate activity loop
```

## Configuration

CLI behavior is configured via `ccplate.config.json`:

```json
{
  "guardian": {
    "enabled": true,
    "nudges": {
      "commit": { "filesThreshold": 5, "minutesThreshold": 15 },
      "test": { "enabled": true }
    }
  },
  "worktrees": {
    "baseDir": ".worktrees",
    "branchPrefix": "ccplate/"
  },
  "lsp": {
    "enabled": true,
    "languages": ["typescript", "javascript"]
  }
}
```

## State Files

All Guardian state is stored in `memory/`:

| File | Purpose |
|------|---------|
| `workflow-state.json` | Session state, active worktrees |
| `guardian-nudges.jsonl` | Nudge history |
| `guardian-state.json` | Cooldown tracking |
| `context-ledger.json` | RLM-lite consultations |
| `prd.md` / `prd.json` | Project Requirements Document |
| `ACTIVITY.md` | Human-readable activity log |
| `harness/` | POC harness run data |
| `validation-state.json` | Playwright validation state |
