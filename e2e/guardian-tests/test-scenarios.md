# Guardian Test Scenarios

Manual and automated test scenarios for validating Guardian behavior.

---

## Scenario 1: Commit Nudge

**Trigger:** 5+ files changed, 15+ minutes since last commit

### Setup
```bash
# Reset state
echo '{"files_changed": 0, "last_commit_time": null}' > memory/workflow-state.json
rm -f memory/guardian-last.txt
```

### Test Steps
1. Have Claude create 6+ files without committing
2. Wait 15+ minutes (or modify workflow-state.json manually)
3. Have Claude run any tool

### Expected Result
```
💡 6 files changed, no commit in 18min. Consider committing to checkpoint your progress.
```

### Verify
```bash
cat memory/guardian-last.txt
# Should contain commit nudge

cat memory/guardian-nudges.jsonl | tail -1 | jq '.type'
# Should output: "commit"
```

---

## Scenario 2: Test Nudge

**Trigger:** New function/component added without corresponding test

### Setup
```bash
# Reset state
echo '{"files_changed": 0, "untested_additions": []}' > memory/workflow-state.json
```

### Test Steps
1. Have Claude create a new file: `src/lib/utils/new-helper.ts`
2. The file contains exported functions
3. Have Claude run another tool

### Expected Result
```
💡 New code added (src/lib/utils/new-helper.ts) without tests. Consider adding tests.
```

### Verify
```bash
cat memory/guardian-nudges.jsonl | grep "test" | tail -1
```

---

## Scenario 3: Error Nudge

**Trigger:** TypeScript/lint errors detected in output

### Setup
```bash
# Ensure error detection is enabled
cat ccplate.config.json | jq '.guardian.nudges.error'
```

### Test Steps
1. Have Claude write code with a type error
2. Run `npm run build` or the hook detects error in output

### Expected Result
```
💡 Build/lint errors detected: "Type 'string' not assignable to 'number'". Fix before continuing?
```

---

## Scenario 4: Cooldown Enforcement

**Trigger:** Same nudge type fired twice within cooldown period

### Setup
```bash
# Trigger a commit nudge
bun run e2e/guardian-tests/scripts/simulate-session.ts commit-nudge
```

### Test Steps
1. First nudge fires (commit)
2. Immediately simulate another tool use
3. Same conditions still apply

### Expected Result
- Second nudge should NOT fire (cooldown active)

### Verify
```bash
cat memory/guardian-state.json | jq '.lastNudge'
# Should show recent timestamp

cat memory/guardian-nudges.jsonl | wc -l
# Should only have 1 entry for this type within cooldown window
```

---

## Scenario 5: Worktree Isolation

**Trigger:** Agent assigned to worktree attempts to write outside it

### Setup
```bash
# Create a worktree
bun run src/cli/ccplate.ts worktree create test-feature

# Set worktree assignment
export CCPLATE_WORKTREE=test-feature
```

### Test Steps
1. Attempt to write to `src/app/page.tsx` (outside worktree)
2. Path guard should block

### Expected Result
```
{
  "decision": "block",
  "reason": "Agent assigned to worktree 'test-feature' cannot write outside .worktrees/test-feature/"
}
```

### Cleanup
```bash
bun run src/cli/ccplate.ts worktree cleanup test-feature
unset CCPLATE_WORKTREE
```

---

## Scenario 6: Context Pressure Nudge

**Trigger:** Context ledger shows high consultation count

### Setup
```bash
# Simulate high context usage
cat > memory/context-ledger.json << 'EOF'
{
  "session_id": "test-session",
  "consultations": [
    {"timestamp": "2026-01-21T10:00:00Z", "query": "q1", "excerpts": 5},
    {"timestamp": "2026-01-21T10:01:00Z", "query": "q2", "excerpts": 10},
    {"timestamp": "2026-01-21T10:02:00Z", "query": "q3", "excerpts": 15},
    {"timestamp": "2026-01-21T10:03:00Z", "query": "q4", "excerpts": 20},
    {"timestamp": "2026-01-21T10:04:00Z", "query": "q5", "excerpts": 25}
  ]
}
EOF
```

### Test Steps
1. Have Claude run a tool that reads more files
2. Context pressure exceeds 0.8 threshold

### Expected Result
```
💡 Context pressure high (85%). Consider handing off to a fresh thread or using RLM-adapter for retrieval.
```

---

## Scenario 7: LSP Diagnostics Integration

**Trigger:** LSP reports TypeScript errors

### Setup
```bash
# Enable LSP
# Edit ccplate.config.json: "lsp": { "enabled": true }
```

### Test Steps
1. Create file with type error:
```typescript
// src/test-error.ts
const x: number = "string"; // Type error
```
2. Run `ccplate lsp diagnostics`

### Expected Result
```bash
ccplate lsp diagnostics
# ERROR src/test-error.ts:1 - Type 'string' is not assignable to type 'number'
```

Guardian picks this up:
```
💡 1 TypeScript error detected. Fix: src/test-error.ts:1 - Type mismatch.
```

### Cleanup
```bash
rm src/test-error.ts
```

---

## Scenario 8: Multi-Worktree Parallel Work

**Trigger:** Team coordinator spawns multiple agents

### Setup
```bash
# Create multiple worktrees
bun run src/cli/ccplate.ts worktree create feature-api
bun run src/cli/ccplate.ts worktree create feature-ui
```

### Test Steps
1. Verify worktrees listed:
```bash
bun run src/cli/ccplate.ts worktree list
```

2. Check workflow state:
```bash
cat memory/workflow-state.json | jq '.active_worktrees'
```

3. Simulate work in each (set CCPLATE_WORKTREE env per agent)

### Expected Result
- Each worktree tracked independently
- Path guard enforces isolation
- Guardian can nudge per-worktree

### Cleanup
```bash
bun run src/cli/ccplate.ts worktree cleanup feature-api
bun run src/cli/ccplate.ts worktree cleanup feature-ui
```

---

## Scenario 9: End-to-End Feature Implementation

**The Ultimate Test:** Complete a real feature using Guardian workflows.

### Task: Add a "Favorites" feature to the dashboard

### Steps

1. **Plan with Oracle**
   ```
   "Plan adding a favorites feature where users can star items"
   ```

2. **Guardian monitors planning** (no nudges expected yet)

3. **Implement schema changes**
   - Add Favorite model to Prisma
   - Run migration
   - Guardian: No commit nudge (under threshold)

4. **Implement API routes**
   - POST /api/favorites
   - DELETE /api/favorites/[id]
   - GET /api/favorites
   - Guardian: Might nudge for tests

5. **Implement UI components**
   - FavoriteButton component
   - FavoritesList component
   - Guardian: Commit nudge likely (5+ files)

6. **Respond to nudges**
   - Commit checkpoint
   - Add tests
   - Fix any errors

7. **Complete and verify**
   - All tests pass
   - No lint errors
   - Guardian satisfied

### Success Criteria
- [ ] Feature works end-to-end
- [ ] At least 1 commit nudge received and acted on
- [ ] At least 1 test nudge received and acted on
- [ ] No worktree conflicts (if parallel agents used)
- [ ] Timeline shows complete session history

---

## Automated Test Script

Run all scenarios:

```bash
npm run test:guardian:all
```

This executes:
1. Reset all memory state
2. Run each scenario script
3. Verify expected outcomes
4. Generate test report

---

**Last Updated:** 2026-01-21
