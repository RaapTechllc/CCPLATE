# Project Learnings

> Claude updates this file when errors occur or patterns are discovered.
> This creates a persistent memory that improves future work.

## Error Patterns

| Date | Error | Root Cause | Prevention |
|------|-------|------------|------------|
| 2026-02-06 | `Cannot destructure 'isLoading' of 'useAuth(...)' as undefined` — SSR crash on every page | `ConvexAuthNextjsProvider` from `@convex-dev/auth@0.0.90/nextjs` passes `useAuth` to `ConvexProviderWithAuth` without rendering `AuthProvider`, so context is always undefined | Use `ConvexAuthProvider` from `@convex-dev/auth/react` instead — it renders `AuthProvider` first, then `ConvexProviderWithAuth` |
| 2026-02-06 | `"next start" does not work with "output: standalone"` — Playwright webServer fails | `next.config.ts` has `output: 'standalone'` but Playwright ran `npm start` → `next start` | Use `npm run dev:next` locally (Playwright reuses via `reuseExistingServer`), `node .next/standalone/server.js` in CI |
| 2026-02-06 | `Unable to acquire lock at .next/dev/lock` — second next dev instance blocked | Running dev server holds `.next/dev/lock`; Playwright tried starting another | `reuseExistingServer: true` prevents this when existing server returns 200. The previous 500 crash caused Playwright to try starting a new one |

## Successful Patterns

| Pattern | Context | Why It Works |
|---------|---------|--------------|
| Defensive hook access: `const x = useHook(); const val = x?.prop ?? default;` | Any Convex hook that may return undefined when backend is down | Prevents destructuring crash; already used in `user-menu.tsx`, now also in `navigation.tsx` |
| try-catch around `convexAuth.isAuthenticated()` in middleware | Server middleware runs before any page; Convex may be unreachable | Defaults to unauthenticated on failure — lets app serve pages instead of hanging |

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
