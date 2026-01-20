---
description: Activate Phase 2 infrastructure with damage control hooks. Requires Bun.
---

# Phase 2 Setup

This command activates damage control hooks and the learning system.

## Prerequisites Check

```bash
# Check if Bun is installed
bun --version
```

**If Bun is not installed:**
1. Mac/Linux: `curl -fsSL https://bun.sh/install | bash`
2. Windows: `powershell -c "irm bun.sh/install.ps1 | iex"`
3. Restart terminal after installation

## Step 1: Create Memory Directory

```bash
mkdir -p memory
```

## Step 2: Backup Phase 1 Settings

```bash
cp .claude/settings.json .claude/settings.phase1.backup.json
```

## Step 3: Copy Phase 2 Files

The following files need to be in place:

1. `.claude/hooks/pre-tool-use.ts` - Bash command protection
2. `.claude/hooks/path-guard.ts` - File write protection
3. `.claude/settings.json` - Updated with hook configuration
4. `.claude/agents/meta-agent.md` - Self-generating subagents
5. `memory/learnings.md` - Persistent learning log

## Step 4: Test Hooks

Run a safe test to verify hooks are working:

```bash
# This should succeed
bun run .claude/hooks/pre-tool-use.ts <<< '{"tool_name": "Bash", "tool_input": {"command": "echo test"}, "session_id": "test", "cwd": "."}'

# This should be blocked (exit code 2)
bun run .claude/hooks/pre-tool-use.ts <<< '{"tool_name": "Bash", "tool_input": {"command": "rm -rf /"}, "session_id": "test", "cwd": "."}'
```

**Expected output for blocked command:**
```json
{"decision":"block","reason":"BLOCKED: Recursive delete at filesystem root"}
```

## Step 5: Initialize Learning System

Create the learnings file:

```bash
cat > memory/learnings.md << 'EOF'
# Project Learnings

> Claude updates this file when errors occur or patterns are discovered.

## Error Patterns

| Date | Error | Root Cause | Prevention |
|------|-------|------------|------------|
| [date] | [what happened] | [why] | [how to avoid] |

## Successful Patterns

| Pattern | Context | Why It Works |
|---------|---------|--------------|
| [pattern] | [when to use] | [explanation] |

## Hook Improvements

| Date | Hook | Change | Reason |
|------|------|--------|--------|
| [date] | [hook name] | [what changed] | [why] |

## Performance Notes

- [Add observations about what speeds up or slows down work]

---

**Last Updated:** [Claude updates automatically]
EOF
```

## Step 6: Commit Phase 2

```bash
git add .claude/hooks/ .claude/settings.json .claude/agents/ memory/
git commit -m "chore: activate Phase 2 damage control hooks"
```

## Step 7: Verify Setup

Report the following:

1. ✅ Bun is installed and working
2. ✅ Hooks directory exists with both .ts files
3. ✅ settings.json has PreToolUse hooks configured
4. ✅ memory/ directory exists with learnings.md
5. ✅ Test hook execution succeeded

## What's Now Active

- **Bash protection** - Dangerous commands blocked before execution
- **Path protection** - Sensitive files cannot be modified
- **Logging** - All Write/Edit operations logged
- **Learning** - Errors and patterns captured in memory/learnings.md
- **Self-generating agents** - Use meta-agent to create new subagents

## Adding Custom Patterns

To block additional dangerous commands, edit `.claude/hooks/pre-tool-use.ts`:

```typescript
const DANGEROUS_PATTERNS = [
  // Add your patterns here
  { pattern: /your-regex/, reason: "Why it's dangerous" },
];
```

To protect additional files, edit `.claude/hooks/path-guard.ts`:

```typescript
const NEVER_WRITE: string[] = [
  // Add your protected files
  "your-sensitive-file.json",
];
```

## Troubleshooting

**Hooks not running:**
1. Check Bun is in PATH: `which bun`
2. Verify settings.json has hooks section
3. Restart Claude Code session

**Hook permission errors:**
```bash
chmod +x .claude/hooks/*.ts
```

**Hook timeout:**
Increase timeout in settings.json:
```json
"timeout": 10
```
