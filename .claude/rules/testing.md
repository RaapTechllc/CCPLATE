# Testing Requirements

## Minimum Test Coverage: 80%

Test Types (ALL required):
1. **Unit Tests** - Individual functions, utilities, components
2. **Integration Tests** - API endpoints, database operations
3. **E2E Tests** - Critical user flows (Playwright)

## Test-Driven Development

MANDATORY workflow:
1. Write test first (RED)
2. Run test - it should FAIL
3. Write minimal implementation (GREEN)
4. Run test - it should PASS
5. Refactor (IMPROVE)
6. Verify coverage (80%+)

## Test Structure

```typescript
// Unit test pattern
describe('featureName', () => {
  beforeEach(() => {
    // Setup
  })

  it('should handle expected case', () => {
    // Arrange
    const input = { ... }

    // Act
    const result = featureFn(input)

    // Assert
    expect(result).toBe(expected)
  })

  it('should handle edge case', () => { })
  it('should throw on invalid input', () => { })
})
```

## E2E Test Requirements

```typescript
// e2e/critical-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Critical User Flow', () => {
  test('user can complete primary action', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Start' }).click()
    await expect(page.getByText('Success')).toBeVisible()
  })
})
```

## Coverage Commands

```bash
# Run tests with coverage
npm test -- --coverage

# View coverage report
open coverage/lcov-report/index.html

# Run specific test file
npm test -- path/to/test.ts

# Run E2E tests
npm run test:e2e
```

## Troubleshooting Test Failures

1. Use **tdd-guide** agent
2. Check test isolation
3. Verify mocks are correct
4. Fix implementation, not tests (unless tests are wrong)

## Agent Support

| Agent | Purpose |
|-------|---------|
| **tdd-guide** | Use PROACTIVELY for new features, enforces write-tests-first |
| **e2e-runner** | Playwright E2E testing specialist (if available) |

## CCPLATE Integration

- Test results logged via Guardian
- Failed tests can trigger validation loops
- Use `ccplate validate run` to run registered tests
