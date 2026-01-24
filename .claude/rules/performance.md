# Performance Optimization

## Model Selection Strategy

### Haiku 4.5
90% of Sonnet capability, 3x cost savings:
- Lightweight agents with frequent invocation
- Pair programming and code generation
- Worker agents in multi-agent systems

### Sonnet 4.5
Best coding model:
- Main development work
- Orchestrating multi-agent workflows
- Complex coding tasks

### Opus 4.5
Deepest reasoning:
- Complex architectural decisions
- Maximum reasoning requirements
- Research and analysis tasks

## Context Window Management

Avoid last 20% of context window for:
- Large-scale refactoring
- Feature implementation spanning multiple files
- Debugging complex interactions

Lower context sensitivity tasks:
- Single-file edits
- Independent utility creation
- Documentation updates
- Simple bug fixes

## React Performance

### Memoization

```typescript
// useMemo for expensive computations
const sortedItems = useMemo(() => {
  return items.sort((a, b) => b.value - a.value)
}, [items])

// useCallback for stable function references
const handleClick = useCallback((id: string) => {
  setSelected(id)
}, [])

// React.memo for pure components
const ItemCard = React.memo<Props>(({ item }) => {
  return <div>{item.name}</div>
})
```

### Code Splitting

```typescript
import { lazy, Suspense } from 'react'

const HeavyComponent = lazy(() => import('./HeavyComponent'))

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  )
}
```

## Database Performance

### Query Optimization

```typescript
// GOOD: Select only needed columns
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true },
  take: 10
})

// BAD: Select everything
const users = await prisma.user.findMany()
```

### N+1 Prevention

```typescript
// BAD: N+1 queries
for (const user of users) {
  const posts = await prisma.post.findMany({
    where: { userId: user.id }
  })
}

// GOOD: Include relations
const users = await prisma.user.findMany({
  include: { posts: true }
})
```

## Caching Strategy

```typescript
// Cache expensive operations
const CACHE_TTL = 300 // 5 minutes

async function getCachedData(key: string) {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)

  const data = await fetchExpensiveData()
  await redis.setex(key, CACHE_TTL, JSON.stringify(data))
  return data
}
```

## Build Troubleshooting

If build fails:
1. Use **build-error-resolver** agent
2. Analyze error messages
3. Fix incrementally
4. Verify after each fix

```bash
# Clear cache and rebuild
rm -rf .next node_modules/.cache
npm run build

# Check TypeScript errors
npx tsc --noEmit
```

## Bundle Analysis

```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer

# Check for large dependencies
npx source-map-explorer .next/static/chunks/*.js
```
