# Security Guidelines

## Mandatory Security Checks

Before ANY commit:
- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized HTML)
- [ ] CSRF protection enabled
- [ ] Authentication/authorization verified
- [ ] Rate limiting on all endpoints
- [ ] Error messages don't leak sensitive data

## Secret Management

```typescript
// NEVER: Hardcoded secrets
const apiKey = "sk-proj-xxxxx"

// ALWAYS: Environment variables
const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  throw new Error('OPENAI_API_KEY not configured')
}
```

## Environment Variable Verification

```typescript
// Verify all required secrets at startup
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'OPENAI_API_KEY',
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}
```

## Input Validation

```typescript
import { z } from 'zod'

const UserInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  content: z.string().max(5000),
})

// Validate before processing
const validated = UserInputSchema.parse(userInput)
```

## Security Response Protocol

If security issue found:
1. **STOP** immediately
2. Use **security-reviewer** agent
3. Fix CRITICAL issues before continuing
4. Rotate any exposed secrets
5. Review entire codebase for similar issues
6. Document in Guardian audit log

## CCPLATE Integration

- Security reviews logged to `memory/security-reviews.jsonl`
- Critical findings trigger HITL approval gates
- Path guard prevents writes to sensitive files
- Guardian hooks monitor for security patterns
