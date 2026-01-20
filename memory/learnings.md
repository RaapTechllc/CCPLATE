# Project Learnings

> Claude updates this file when errors occur or patterns are discovered.
> This creates a persistent memory that improves future work.

## Error Patterns

| Date | Error | Root Cause | Prevention |
|------|-------|------------|------------|
| [date] | [what happened] | [why] | [how to avoid] |

## Successful Patterns

| Pattern | Context | Why It Works |
|---------|---------|--------------|
| [pattern] | [when to use] | [explanation] |

## Hook Improvements

> Track changes to damage control hooks here.

| Date | Hook | Change | Reason |
|------|------|--------|--------|
| [date] | [hook name] | [what changed] | [why] |

## Blocked Commands Log

> Automatically populated by pre-tool-use.ts hook.
> Review periodically to identify patterns.

See: `memory/blocked-commands.jsonl`

## File Modification Log

> Automatically populated by path-guard.ts hook.
> Review to understand what's being changed.

See: `memory/file-modifications.jsonl`

## Performance Notes

> Observations about what speeds up or slows down work.

- [Add observations here]

## Agent Effectiveness

> Track how well subagents perform.

| Agent | Task Type | Success Rate | Notes |
|-------|-----------|--------------|-------|
| [agent] | [task] | [%] | [observations] |

## Context Management

> Notes on managing Claude Code context effectively.

- [Add observations about context usage]

## External Resources

> Useful links discovered during work.

| Resource | Purpose | Link |
|----------|---------|------|
| [name] | [what it helps with] | [url] |

---

## How to Use This File

### When to Update

- **Error occurs:** Add to Error Patterns immediately
- **Pattern works well:** Add to Successful Patterns
- **Hook changed:** Log in Hook Improvements
- **Agent performs:** Update Agent Effectiveness weekly

### Review Cadence

- **Daily:** Scan Error Patterns for recent issues
- **Weekly:** Review Agent Effectiveness, prune old entries
- **Monthly:** Archive old patterns, update CLAUDE.md with persistent learnings

### Archiving

When this file exceeds 500 lines:
1. Create `memory/learnings-archive-[date].md`
2. Move entries older than 30 days to archive
3. Keep recent + important entries in main file

---

**Last Updated:** 2026-01-20
**Entry Count:** 0
