# Audit Compliance Skill

## Purpose

Prevent regression of security vulnerabilities and test coverage gaps identified in the CCPLATE technical audit. This skill runs automated checks to ensure code quality, security, and testing standards are maintained.

## When to Use

- **Pre-commit:** Run quick checks before committing changes
- **Pre-push:** Run full validation before pushing to remote
- **PR review:** Validate PR meets quality standards
- **Audit preparation:** Ensure compliance before security audits

## Checks Performed

### Security Scan (Critical)

- [ ] **No .env files in git index** (except .env.example)
  - Scans: `git ls-files | grep '\.env'`
  - Fails if: Any .env* files found (excluding .env.example)
  
- [ ] **No real API keys in source code**
  - Scans: Source files for patterns like `sk-`, `api_key`, `token`
  - Fails if: High-entropy strings detected in non-config files
  
- [ ] **No console.log of sensitive data**
  - Scans: console.log/error/warn calls
  - Fails if: Patterns like password, token, secret, key found in log statements

- [ ] **Proper input validation on all API routes**
  - Scans: src/app/api/**/*.ts
  - Warns if: POST/PUT routes without Zod validation
  
- [ ] **Rate limiting on expensive endpoints**
  - Scans: API routes with external calls or DB writes
  - Warns if: No rateLimit middleware detected

### Test Coverage Gate (High)

- [ ] **All new features have E2E tests**
  - Scans: e2e/*.spec.ts for corresponding page tests
  - Fails if: New page in app/ without matching E2E test
  
- [ ] **Unit tests for business logic**
  - Scans: src/lib/**/*.ts for corresponding tests/
  - Warns if: Complex logic (>20 lines) without tests
  
- [ ] **80% coverage threshold met**
  - Runs: `npm run test:unit:coverage`
  - Fails if: Coverage < 80% for branches/functions/lines

### Code Quality (Medium)

- [ ] **ESLint passes with no errors**
  - Runs: `npm run lint`
  - Fails if: Any ESLint errors found
  
- [ ] **TypeScript strict mode compliance**
  - Runs: `npx tsc --noEmit`
  - Fails if: Type errors found
  
- [ ] **No TODO/FIXME in production code**
  - Scans: All source files
  - Warns if: TODO/FIXME found (excluding tests/ and e2e/)

## Usage

```bash
# Quick pre-commit check (fast)
/skill audit-compliance --pre-commit

# Full compliance check (comprehensive)
/skill audit-compliance --full

# Specific check categories
/skill audit-compliance --security-only
/skill audit-compliance --tests-only
/skill audit-compliance --quality-only

# Auto-fix where possible
/skill audit-compliance --fix
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Critical security issues found |
| 2 | Test coverage below threshold |
| 3 | Code quality issues |
| 4 | Multiple categories failed |

## Integration

### Pre-commit Hook

Add to `.claude/hooks/pre-commit.ts`:

```typescript
import { runAuditCompliance } from "../skills/audit-compliance";

export async function preCommit(context: HookContext) {
  const result = await runAuditCompliance({ mode: "pre-commit" });
  if (!result.passed) {
    throw new Error(`Audit compliance failed: ${result.summary}`);
  }
}
```

### GitHub Action

```yaml
- name: Audit Compliance
  run: npx ts-node .claude/skills/audit-compliance/index.ts --full
```

## Maintenance

Update this skill when:
- New security patterns emerge (add to scan list)
- Coverage thresholds change (update 80% target)
- New check categories needed (document here)

## References

- CCPLATE Audit Report: `REPORTS/ARCHON-COMPARISON.md`
- Security Rules: `.claude/rules/security.md`
- Testing Rules: `.claude/rules/testing.md`
