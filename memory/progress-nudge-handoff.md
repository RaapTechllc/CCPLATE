# Progress Nudge Detection - TDD Implementation Handoff

## Summary

Successfully implemented Progress Nudge Detection feature for CCPLATE Guardian system following TDD methodology.

## Test Results

**Total Tests:** 65
**Passed:** 65
**Failed:** 0

### Test Files Created

1. **`tests/guardian/prd-keywords.test.ts`** (15 tests)
   - Extracts keywords from criticalPaths
   - Extracts keywords from techStack
   - Extracts keywords from jobsToBeDone
   - Extracts keywords from successCriteria
   - Handles edge cases (null, empty, undefined)
   - Deduplicates keywords
   - Filters stop words and short words

2. **`tests/guardian/file-relevance.test.ts`** (32 tests)
   - Matches keywords in file paths
   - Whitelist patterns for test files
   - Whitelist patterns for memory files
   - Whitelist patterns for .claude files
   - Whitelist patterns for config files
   - Edge cases (empty, Windows paths, special chars)
   - Multiple keyword matching

3. **`tests/guardian/progress-nudge.test.ts`** (18 tests)
   - Returns null when disabled
   - Returns null when PRD is null
   - Returns null when all files are relevant
   - Returns nudge when files are off-track
   - Respects minFilesBeforeCheck
   - Respects whitelist patterns
   - Sensitivity configuration
   - Empty state handling
   - Message formatting

## Implementation Files

### New Files

1. **`src/lib/guardian/progress-nudge.ts`**
   - `ProgressNudgeConfig` interface
   - `WorkflowStateWithFiles` interface
   - `ProgressNudgeResult` interface
   - `getDefaultProgressConfig()` function
   - `evaluateProgressNudge()` function

### Modified Files

1. **`src/lib/guardian/prd.ts`**
   - Added `STOP_WORDS` constant
   - Added `DEFAULT_WHITELIST_PATTERNS` constant
   - Added `extractRelevantKeywords()` function
   - Added `isFileRelevant()` function

2. **`.claude/hooks/guardian-tick.ts`**
   - Added import for PRD functions
   - Added `recent_files_changed` to WorkflowState
   - Added `ProgressNudgeConfig` interface
   - Updated `resetWorkflowStateForNewSession()` to reset recent files
   - Updated `updateWorkflowStateFromTool()` to track file paths
   - Added progress nudge evaluation in `evaluateNudges()` (step 3)

3. **`ccplate.config.json`**
   - Extended progress config with:
     - `sensitivity: 0.4` (40% relevance threshold)
     - `minFilesBeforeCheck: 3`
     - `whitelist: []` (custom patterns)

4. **`package.json`**
   - Added `test:unit` script
   - Added `test:unit:watch` script
   - Added `test:unit:coverage` script

5. **`vitest.config.ts`** (new)
   - Vitest configuration for unit tests

## Configuration Options

```json
{
  "guardian": {
    "nudges": {
      "progress": {
        "enabled": true,
        "sensitivity": 0.4,
        "minFilesBeforeCheck": 3,
        "whitelist": []
      }
    }
  }
}
```

- **`enabled`**: Enable/disable progress nudge
- **`sensitivity`**: Relevance threshold (0.0-1.0). Default 0.4 means 40% of files must be relevant
- **`minFilesBeforeCheck`**: Minimum files changed before checking relevance
- **`whitelist`**: Additional patterns to always consider relevant (e.g., `["src/shared/"]`)

## Default Whitelist Patterns

The following file patterns are always considered relevant:
- Test files: `.test.ts`, `.spec.ts`, `__tests__/`, `tests/`, `e2e/`
- Memory files: `memory/`
- Claude files: `.claude/`
- Config files: `package.json`, `tsconfig.json`, `*.config.ts/js/json`, `.env*`
- Documentation: `CLAUDE.md`, `README.md`, `PLANNING.md`, `TASK.md`
- Prisma: `prisma/`

## Keyword Extraction Logic

Keywords are extracted from PRD fields:
1. criticalPaths (e.g., "OAuth login flow" -> ["oauth", "login"])
2. techStack (e.g., "Next.js" -> ["next", "nextjs"])
3. jobsToBeDone (e.g., "Search for markets" -> ["search", "markets"])
4. successCriteria (e.g., "Authentication works" -> ["authentication"])

Keywords are:
- Lowercased
- Deduplicated
- Filtered for stop words (the, and, is, etc.)
- Filtered for short words (2 chars or less)

## Nudge Message Format

When triggered, the nudge appears as:
```
🚧 Possible off-track: 20% of recent files (1 of 5) relate to PRD scope. Focus areas: OAuth login flow, Dashboard view
```

## Next Steps

1. Consider adding `@vitest/coverage-v8` for coverage reports
2. Test the hook integration in a real session
3. Consider adding stemming/lemmatization for better keyword matching
4. Consider adding file extension-based relevance (e.g., `.prisma` files always relevant if `database` in PRD)

## Commands

```bash
# Run unit tests
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run with coverage (requires @vitest/coverage-v8)
npm run test:unit:coverage
```

---

*Generated: 2026-01-25*
*TDD Workflow: RED -> GREEN -> REFACTOR completed*
