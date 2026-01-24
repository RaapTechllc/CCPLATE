> **CCPLATE Note:** This project uses sophisticated Guardian hooks (~52KB, ~4,700 LOC).
> This document is for reference only. Do NOT modify existing hooks in `.claude/hooks/`.
> The Guardian hooks (`guardian-tick.ts`, `path-guard.ts`, `pre-tool-use.ts`) are critical infrastructure.

# Hooks System

## Hook Types

| Type | When | Purpose |
|------|------|---------|
| **PreToolUse** | Before tool execution | Validation, parameter modification, blocking |
| **PostToolUse** | After tool execution | Auto-format, checks, logging |
| **Stop** | When session ends | Final verification, cleanup |
| **SubagentStop** | When subagent ends | Subagent-specific cleanup |
| **SessionStart** | Session begins | Initialization |
| **Notification** | Async notifications | External integrations |

## CCPLATE Guardian Hooks

### guardian-tick.ts (PostToolUse)
Main supervision loop providing:
- Workflow nudges (commit, test, error recovery)
- Activity tracking and narration
- Knowledge mesh integration
- Context pressure monitoring

### path-guard.ts (PreToolUse)
Path protection for Write/Edit tools:
- Blocks writes to sensitive files (.env, secrets)
- Enforces worktree isolation
- Allows writes to memory/, .claude/agents/, .claude/skills/, .claude/rules/

### pre-tool-use.ts (PreToolUse)
Tool validation and rate limiting:
- Validates tool parameters
- Rate limits expensive operations
- Logs tool usage for audit

## Hook Response Format

```typescript
// Allow operation
{ decision: "approve" }

// Block operation
{ decision: "block", reason: "Explanation" }

// Modify parameters
{
  decision: "approve",
  tool_input: { /* modified parameters */ }
}
```

## Writing Custom Hooks

If you need a new hook, create it in a separate file:

```typescript
// .claude/hooks/my-custom-hook.ts
import * as fs from "fs"

interface HookInput {
  tool_name: string
  tool_input: Record<string, unknown>
  session_id: string
}

async function main() {
  const input: HookInput = JSON.parse(await Bun.stdin.text())

  // Your logic here

  console.log(JSON.stringify({ decision: "approve" }))
  process.exit(0)
}

main()
```

Register in `.claude/settings.local.json` (not the main settings):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [{
          "type": "command",
          "command": "bun run .claude/hooks/my-custom-hook.ts"
        }]
      }
    ]
  }
}
```

## Best Practices

1. **Don't modify Guardian hooks** - They're critical infrastructure
2. **Create new hooks in separate files** - Easier to maintain
3. **Use .local.json for custom hooks** - Keeps main settings clean
4. **Log hook activity** - Helps with debugging
5. **Handle errors gracefully** - Don't block on hook failures
6. **Keep hooks fast** - They run on every tool use

## Debugging Hooks

```bash
# Check hook errors
cat memory/guardian-errors.log | jq

# Test hook manually
echo '{"tool_name":"Write","tool_input":{"file_path":"test.txt"}}' | bun run .claude/hooks/path-guard.ts
```
