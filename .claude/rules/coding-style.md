# Coding Style

## Immutability (CRITICAL)

ALWAYS create new objects, NEVER mutate:

```typescript
// ❌ WRONG: Mutation
function updateUser(user: User, name: string) {
  user.name = name  // MUTATION!
  return user
}

// ✅ CORRECT: Immutability
function updateUser(user: User, name: string) {
  return {
    ...user,
    name
  }
}

// ❌ WRONG: Array mutation
items.push(newItem)

// ✅ CORRECT: Spread operator
const newItems = [...items, newItem]
```

## File Organization

MANY SMALL FILES > FEW LARGE FILES:
- High cohesion, low coupling
- 200-400 lines typical, 800 max
- Extract utilities from large components
- Organize by feature/domain, not by type

```
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   └── markets/
│       ├── components/
│       ├── hooks/
│       └── utils/
└── shared/
    ├── components/
    └── utils/
```

## Error Handling

ALWAYS handle errors comprehensively:

```typescript
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  console.error('Operation failed:', error)
  throw new Error('User-friendly message without internal details')
}
```

## Input Validation

ALWAYS validate user input:

```typescript
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150)
})

const validated = schema.parse(input)
```

## Naming Conventions

```typescript
// Files: kebab-case
user-profile.tsx
market-utils.ts

// Components: PascalCase
export function UserProfile() { }

// Functions/variables: camelCase
const getUserData = () => { }
const isAuthenticated = true

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3
const API_BASE_URL = '/api'

// Types/Interfaces: PascalCase
interface UserProfile { }
type MarketStatus = 'active' | 'closed'
```

## Code Quality Checklist

Before marking work complete:
- [ ] Code is readable and well-named
- [ ] Functions are small (<50 lines)
- [ ] Files are focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Proper error handling
- [ ] No console.log statements
- [ ] No hardcoded values
- [ ] No mutation (immutable patterns used)
- [ ] TypeScript strict mode compliance
- [ ] No `any` types without justification
