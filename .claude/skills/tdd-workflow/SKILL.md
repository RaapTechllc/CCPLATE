# Test-Driven Development Workflow Skill

This skill establishes comprehensive TDD practices for code development across features, bug fixes, and refactoring efforts.

## Key Framework Components

**Testing Philosophy**: Write tests before implementation, establishing a minimum 80% coverage threshold encompassing unit, integration, and end-to-end test types.

## Workflow Stages

Development follows seven sequential steps:

1. **User Journey Articulation** - Define the expected behavior from user perspective
2. **Test Case Generation** - Write tests that capture the expected behavior
3. **Initial Test Execution** - Run tests (expected to fail - "red" phase)
4. **Code Implementation** - Write minimal code to make tests pass ("green" phase)
5. **Test Validation** - Verify all tests pass
6. **Refactoring Optimization** - Improve code quality while keeping tests green
7. **Coverage Verification** - Ensure 80%+ coverage is maintained

## Test Categories

| Type | Target | Location |
|------|--------|----------|
| Unit | Individual functions, component logic | `*.test.tsx`, `*.spec.ts` alongside source |
| Integration | API endpoints, service interactions | `tests/integration/` |
| E2E | Complete user workflows | `e2e/` directory |

## Test File Organization

```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx     # Co-located unit test
├── lib/
│   ├── utils.ts
│   └── utils.spec.ts       # Co-located unit test
tests/
└── integration/
    └── api.test.ts         # Integration tests
e2e/
├── auth.spec.ts            # E2E tests with Playwright
└── checkout.spec.ts
```

## Critical Practices

### Test Behavior, Not Implementation

```typescript
// ✅ GOOD: Testing observable behavior
test('displays error message when login fails', async () => {
  render(<LoginForm />)
  await userEvent.click(screen.getByRole('button', { name: /login/i }))
  expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
})

// ❌ BAD: Testing implementation details
test('sets isLoading state to true', () => {
  const { result } = renderHook(() => useLogin())
  expect(result.current.isLoading).toBe(true) // Internal state
})
```

### Test Independence

```typescript
// ✅ GOOD: Each test is self-contained
beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
})

test('creates new user', async () => {
  const user = await createUser({ email: 'test@example.com' })
  expect(user.id).toBeDefined()
})

// ❌ BAD: Tests depend on each other
let createdUserId: string

test('creates user', async () => {
  const user = await createUser({ email: 'test@example.com' })
  createdUserId = user.id  // Shared state between tests
})

test('fetches created user', async () => {
  const user = await getUser(createdUserId)  // Depends on previous test
  expect(user).toBeDefined()
})
```

### Semantic Selectors for E2E

```typescript
// ✅ GOOD: Resilient selectors
await page.getByRole('button', { name: /submit/i }).click()
await page.getByLabel('Email').fill('test@example.com')
await page.getByTestId('market-card').first().click()

// ❌ BAD: Brittle selectors
await page.click('.btn-primary')
await page.locator('#email-input').fill('test@example.com')
await page.locator('div > div > div:nth-child(2)').click()
```

## Mocking Strategy

### External Services

```typescript
// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
    })),
  },
}))

// Mock Redis
jest.mock('@/lib/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  },
}))

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: Array(1536).fill(0) }],
      }),
    },
  })),
}))
```

## Common Pitfalls to Avoid

| Pitfall | Problem | Solution |
|---------|---------|----------|
| Brittle selectors | Tests break with UI changes | Use role/label selectors |
| Testing internal state | Couples tests to implementation | Test observable behavior |
| Test interdependencies | Flaky, order-dependent tests | Isolate each test |
| Over-mocking | Tests don't reflect reality | Mock at boundaries only |
| Ignoring edge cases | Bugs in error paths | Test error scenarios |

## Continuous Integration

### Watch Mode for Development

```bash
# Run tests in watch mode during development
npm test -- --watch

# Run specific test file
npm test -- path/to/test.ts --watch
```

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test -- --coverage --bail"
    }
  }
}
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npm test -- --coverage
    - uses: codecov/codecov-action@v3
```

## Success Criteria

| Metric | Target |
|--------|--------|
| Coverage | 80%+ |
| All tests pass | ✓ |
| Test execution time | < 30 seconds (unit) |
| No flaky tests | ✓ |

## TDD Workflow Commands

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test pattern
npm test -- --testPathPattern="auth"

# Run E2E tests
npm run test:e2e

# Run E2E in UI mode
npm run test:e2e -- --ui
```

**Remember**: Tests are documentation. Write tests that explain what the code does, not how it does it.
