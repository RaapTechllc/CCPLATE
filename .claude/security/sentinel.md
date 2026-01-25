# Security Sentinel

> Documentation of all security controls in the CCPLATE Guardian system.
> Last updated: 2026-01-25

## Overview

The Guardian system handles external input from multiple sources:
- GitHub webhooks (issue/PR comments, events)
- CLI arguments
- Environment variables
- File system operations

All external input MUST be validated before use in shell commands, file operations, or database queries.

## Security Modules

### Input Validation Module

**Location:** `src/lib/guardian/security/input-validation.ts`

| Function | Purpose | Use Case |
|----------|---------|----------|
| `validatePositiveInteger` | Validates numeric IDs | Issue numbers, PR numbers, comment IDs |
| `validateOptionalPositiveInteger` | Same as above, allows undefined | Optional numeric fields |
| `validateSafeIdentifier` | Validates identifiers for shell safety | Worktree IDs, task IDs, job IDs |
| `validateGitRef` | Validates git references | Commit hashes, branch names |
| `validatePath` | Validates file paths | Prevents directory traversal |
| `validateEnum` | Validates against allowed values | Status values, types |
| `escapeShellArg` | Escapes shell arguments | Fallback only |

### ValidationError Class

Custom error class for validation failures:
- `message`: Error description
- `field`: Name of the failing field
- `value`: The invalid value (for logging)

## Protected Files

Files that must NEVER be modified by automated systems:

| Path | Reason |
|------|--------|
| `.env*` | Contains secrets |
| `**/credentials*` | Contains credentials |
| `**/secrets*` | Contains secrets |
| `**/*.pem` | Private keys |
| `**/*.key` | Private keys |

Protected by: `path-guard.ts` hook

## Vulnerability Fixes

### CVE-like Issues Fixed (2026-01-25)

| Severity | File | Issue | Fix |
|----------|------|-------|-----|
| CRITICAL | `job-executor.ts` | Command injection via issueNumber | Validate + spawnSync |
| HIGH | `variant-runner.ts` | Shell heredoc injection | Node.js file ops |
| HIGH | `route.ts` | Weak webhook auth in dev | Require secret always |
| HIGH | `route.ts` | Unvalidated issueNumber | validatePositiveInteger |
| MEDIUM | `merge-ledger.ts` | Unvalidated commit hashes | validateGitRef + spawnSync |
| MEDIUM | `ccplate.ts` | Unquoted EDITOR var | spawnSync with shell: false |

## Webhook Security

### GitHub Webhook Authentication

**File:** `src/app/api/webhooks/github/route.ts`

Requirements:
1. `GITHUB_WEBHOOK_SECRET` environment variable MUST be set
2. All incoming webhooks MUST have valid `x-hub-signature-256` header
3. Signature verification uses timing-safe comparison

Exception:
- Test environments can bypass with `ALLOW_UNSIGNED_WEBHOOKS=true`
- This MUST NOT be used in production

### Payload Validation

All webhook payloads are validated:
- `issueNumber`: Must be positive integer 1-2147483647
- `commentId`: Must be positive integer
- `prNumber`: Must be positive integer (when present)

## Shell Command Security

### Safe Pattern

```typescript
import { spawnSync } from 'child_process';
import { validateSafeIdentifier } from './security';

// 1. Validate input
const id = validateSafeIdentifier(userInput, 'id');

// 2. Use spawnSync with argument array
const result = spawnSync('command', ['arg1', id, 'arg2'], {
  cwd: workingDir,
  stdio: 'pipe',
  shell: false,  // IMPORTANT: Disable shell
});

// 3. Check result
if (result.status !== 0) {
  throw new Error(`Command failed: ${result.stderr}`);
}
```

### Unsafe Patterns (NEVER USE)

```typescript
// DANGEROUS: String interpolation
execSync(`command ${userInput}`);

// DANGEROUS: Template literals
execSync(`git checkout ${branch}`);

// DANGEROUS: Heredocs with user input
spawn('sh', ['-c', `cat > file << EOF\n${content}\nEOF`]);
```

## Security Testing

### Unit Tests

**Location:** `src/lib/guardian/security/__tests__/`

| File | Purpose |
|------|---------|
| `input-validation.test.ts` | Tests validation functions |
| `injection-prevention.test.ts` | Tests against injection payloads |

### Test Coverage

All validation functions are tested with:
- Valid inputs (should pass)
- Invalid inputs (should throw)
- Injection payloads (should throw)
- Edge cases (boundary values)
- Type coercion attacks

### Running Tests

```bash
npm test -- --grep "security"
npm test -- src/lib/guardian/security/__tests__/
```

## Security Event Logging

Security-relevant events are logged to:

| Log File | Content |
|----------|---------|
| `memory/guardian-errors.log` | Validation errors, auth failures |
| `memory/audit-log.jsonl` | Security-relevant audit events |
| `memory/guardian.log` | General Guardian logs |

### Log Format

```json
{
  "timestamp": "2026-01-25T12:00:00.000Z",
  "level": "warn",
  "namespace": "guardian.webhook",
  "message": "Invalid webhook payload",
  "data": {
    "event": "issue_comment",
    "error": "issueNumber must be a positive integer",
    "field": "issueNumber"
  }
}
```

## Incident Response

If a security issue is discovered:

1. **Immediate:** Stop all automated operations
2. **Assess:** Determine scope and impact
3. **Contain:** Block the attack vector
4. **Fix:** Apply security patch
5. **Review:** Check for similar issues
6. **Document:** Update this file
7. **Test:** Add regression tests
8. **Deploy:** Push fixes immediately

## Security Contacts

For security issues, create a private GitHub issue or contact the maintainers directly.

## Changelog

| Date | Change |
|------|--------|
| 2026-01-25 | Initial security module creation |
| 2026-01-25 | Fixed command injection in job-executor.ts |
| 2026-01-25 | Fixed shell heredoc in variant-runner.ts |
| 2026-01-25 | Strengthened webhook authentication |
| 2026-01-25 | Fixed merge-ledger.ts and ccplate.ts |
