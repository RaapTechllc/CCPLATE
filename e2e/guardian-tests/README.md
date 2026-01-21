# Guardian Test Suite

Real-world integration tests for the Amp Guardian system.

## Test Structure

```
e2e/guardian-tests/
├── README.md                    # This file
├── test-scenarios.md            # Manual test scenarios
├── scripts/
│   ├── simulate-session.ts      # Simulates tool activity
│   ├── verify-nudges.ts         # Validates nudge generation
│   ├── test-worktrees.ts        # Worktree CLI tests
│   └── test-lsp.ts              # LSP integration tests
└── fixtures/
    ├── workflow-state.json      # Sample workflow state
    └── sample-tool-output.json  # Mock tool outputs
```

## Running Tests

```bash
# Run all Guardian tests
npm run test:guardian

# Individual test scripts
bun run e2e/guardian-tests/scripts/simulate-session.ts
bun run e2e/guardian-tests/scripts/verify-nudges.ts
bun run e2e/guardian-tests/scripts/test-worktrees.ts
```

## Quick Validation

```bash
# 1. Reset state
rm -f memory/guardian-*.json memory/guardian-*.jsonl memory/guardian-last.txt

# 2. Simulate file changes (triggers commit nudge)
bun run e2e/guardian-tests/scripts/simulate-session.ts commit-nudge

# 3. Verify nudge was generated
cat memory/guardian-last.txt
```
