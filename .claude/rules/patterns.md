# Common Patterns

## API Response Format

Standardize all API responses:

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}

// Usage
return NextResponse.json({
  success: true,
  data: markets,
  meta: { total: 100, page: 1, limit: 10 }
})

// Error
return NextResponse.json({
  success: false,
  error: 'Invalid request'
}, { status: 400 })
```

## Custom Hooks Pattern

```typescript
// useDebounce - delay value updates
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

// Usage
const debouncedQuery = useDebounce(searchQuery, 500)
```

## Repository Pattern

Abstract data access for testability:

```typescript
interface Repository<T> {
  findAll(filters?: FilterOptions): Promise<T[]>
  findById(id: string): Promise<T | null>
  create(data: CreateDto<T>): Promise<T>
  update(id: string, data: UpdateDto<T>): Promise<T>
  delete(id: string): Promise<void>
}

class PrismaUserRepository implements Repository<User> {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } })
  }
  // ... other methods
}
```

## Error Handling Pattern

```typescript
class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message)
  }
}

// Usage
throw new AppError(404, 'Market not found')
throw new AppError(400, 'Invalid input')
throw new AppError(403, 'Unauthorized')
```

## Loading State Pattern

```typescript
interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

function useAsyncState<T>(fetcher: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    fetcher()
      .then(data => setState({ data, loading: false, error: null }))
      .catch(error => setState({ data: null, loading: false, error }))
  }, [])

  return state
}
```

## Parallel Execution Pattern

```typescript
// GOOD: Parallel when independent
const [users, markets, stats] = await Promise.all([
  fetchUsers(),
  fetchMarkets(),
  fetchStats()
])

// BAD: Sequential when unnecessary
const users = await fetchUsers()
const markets = await fetchMarkets()
const stats = await fetchStats()
```

## Retry Pattern

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000))
    }
  }
  throw new Error('Unreachable')
}
```

## Validation Pattern

```typescript
import { z } from 'zod'

const CreateMarketSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  endDate: z.string().datetime(),
})

export async function POST(request: Request) {
  const body = await request.json()

  const result = CreateMarketSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({
      success: false,
      error: 'Validation failed',
      details: result.error.errors
    }, { status: 400 })
  }

  // Proceed with validated data
  const validated = result.data
}
```
