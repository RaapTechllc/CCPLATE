# React & Next.js Best Practices for Vercel

Modern patterns for building performant React applications with Next.js App Router on Vercel.

## Server Components vs Client Components

### Decision Tree

```
┌─────────────────────────────────────────┐
│  Does the component need:               │
│  - useState, useEffect, useReducer?     │
│  - Browser APIs (window, localStorage)? │
│  - Event handlers (onClick, onChange)?  │
│  - Custom hooks with state?             │
└─────────────────────────────────────────┘
           │                    │
          YES                   NO
           │                    │
           ▼                    ▼
   "use client"           Server Component
   (Client Component)     (Default - RSC)
```

### Server Components (RSC) - Default

```typescript
// ✅ Server Component - No directive needed
// src/app/products/page.tsx
import { db } from '@/lib/db'

export default async function ProductsPage() {
  // Direct database access - no API needed
  const products = await db.product.findMany()

  return (
    <ul>
      {products.map(product => (
        <li key={product.id}>{product.name}</li>
      ))}
    </ul>
  )
}
```

### Client Components - When Needed

```typescript
// ✅ Client Component - "use client" directive
'use client'

import { useState } from 'react'

export function AddToCart({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    await addToCart(productId)
    setLoading(false)
  }

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? 'Adding...' : 'Add to Cart'}
    </button>
  )
}
```

### Composition Pattern

```typescript
// ✅ Server Component with Client Island
// src/app/products/[id]/page.tsx
import { db } from '@/lib/db'
import { AddToCart } from './AddToCart'

export default async function ProductPage({
  params
}: {
  params: { id: string }
}) {
  const product = await db.product.findUnique({
    where: { id: params.id }
  })

  if (!product) return notFound()

  return (
    <div>
      <h1>{product.name}</h1>          {/* Server-rendered */}
      <p>{product.description}</p>      {/* Server-rendered */}
      <AddToCart productId={product.id} /> {/* Client island */}
    </div>
  )
}
```

## Server Actions

### Form Actions

```typescript
// ✅ Server Action in Server Component
// src/app/contact/page.tsx
import { redirect } from 'next/navigation'

async function submitForm(formData: FormData) {
  'use server'

  const email = formData.get('email') as string
  const message = formData.get('message') as string

  // Validate
  if (!email || !message) {
    throw new Error('Missing required fields')
  }

  // Direct database access
  await db.contact.create({
    data: { email, message }
  })

  redirect('/contact/success')
}

export default function ContactPage() {
  return (
    <form action={submitForm}>
      <input name="email" type="email" required />
      <textarea name="message" required />
      <button type="submit">Send</button>
    </form>
  )
}
```

### With useFormStatus

```typescript
'use client'

import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  )
}
```

### With useActionState (React 19+)

```typescript
'use client'

import { useActionState } from 'react'

interface FormState {
  message: string | null
  errors: Record<string, string[]>
}

export function ContactForm({ action }: { action: (state: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, {
    message: null,
    errors: {}
  })

  return (
    <form action={formAction}>
      {state.message && <p>{state.message}</p>}
      <input name="email" />
      {state.errors.email && <span>{state.errors.email[0]}</span>}
      <button disabled={pending}>
        {pending ? 'Sending...' : 'Send'}
      </button>
    </form>
  )
}
```

## Streaming & Suspense

### Streaming with Loading UI

```typescript
// src/app/dashboard/page.tsx
import { Suspense } from 'react'
import { DashboardSkeleton, StatsSkeleton } from './skeletons'

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Stats load first */}
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      {/* Charts stream in after */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardCharts />
      </Suspense>
    </div>
  )
}

async function DashboardStats() {
  const stats = await fetchStats() // Fast query
  return <StatsGrid stats={stats} />
}

async function DashboardCharts() {
  const chartData = await fetchChartData() // Slow query
  return <Charts data={chartData} />
}
```

### Parallel Data Fetching

```typescript
// ✅ Parallel fetching - requests start simultaneously
export default async function Page() {
  // Both requests start at the same time
  const [products, categories] = await Promise.all([
    fetchProducts(),
    fetchCategories()
  ])

  return (
    <div>
      <CategoryFilter categories={categories} />
      <ProductList products={products} />
    </div>
  )
}

// ❌ Waterfall - requests are sequential
export default async function Page() {
  const products = await fetchProducts()
  // This waits for products to finish
  const categories = await fetchCategories()

  return (/* ... */)
}
```

## Data Fetching & Caching

### Fetch Caching

```typescript
// ✅ Cached by default - deduplicated across components
async function getData() {
  const res = await fetch('https://api.example.com/data')
  return res.json()
}

// ✅ Revalidate every 60 seconds (ISR)
async function getData() {
  const res = await fetch('https://api.example.com/data', {
    next: { revalidate: 60 }
  })
  return res.json()
}

// ✅ No caching - always fresh
async function getData() {
  const res = await fetch('https://api.example.com/data', {
    cache: 'no-store'
  })
  return res.json()
}

// ✅ Tag-based revalidation
async function getData() {
  const res = await fetch('https://api.example.com/products', {
    next: { tags: ['products'] }
  })
  return res.json()
}

// Revalidate by tag in Server Action
import { revalidateTag } from 'next/cache'

async function updateProduct() {
  'use server'
  await db.product.update(/* ... */)
  revalidateTag('products')
}
```

### React Cache for Deduplication

```typescript
import { cache } from 'react'

// Deduplicated across component tree during a request
export const getUser = cache(async (id: string) => {
  const user = await db.user.findUnique({ where: { id } })
  return user
})

// Multiple components can call this - only one DB query executes
async function UserProfile({ userId }: { userId: string }) {
  const user = await getUser(userId)
  return <Profile user={user} />
}

async function UserAvatar({ userId }: { userId: string }) {
  const user = await getUser(userId) // Reuses cached result
  return <Avatar src={user.avatar} />
}
```

## Next.js Optimizations

### Image Optimization

```typescript
import Image from 'next/image'

// ✅ Optimized image with blur placeholder
export function ProductImage({ src, alt }: { src: string, alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={600}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQ..."
      sizes="(max-width: 768px) 100vw, 50vw"
      priority={false} // true for LCP images
    />
  )
}

// ✅ Fill container with aspect ratio
export function HeroImage({ src, alt }: { src: string, alt: string }) {
  return (
    <div className="relative aspect-video">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        priority // Above the fold
      />
    </div>
  )
}
```

### Font Optimization

```typescript
// src/app/layout.tsx
import { Inter, Roboto_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

### Script Optimization

```typescript
import Script from 'next/script'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      {/* Load after page is interactive */}
      <Script
        src="https://example.com/analytics.js"
        strategy="afterInteractive"
      />

      {/* Load during browser idle time */}
      <Script
        src="https://example.com/widget.js"
        strategy="lazyOnload"
      />

      {/* Inline script with onLoad */}
      <Script
        id="analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer = window.dataLayer || [];`
        }}
      />
    </>
  )
}
```

## Vercel-Specific Features

### Edge Functions

```typescript
// src/app/api/geo/route.ts
import { NextRequest } from 'next/server'

export const runtime = 'edge' // Run on Edge Network

export async function GET(request: NextRequest) {
  const country = request.geo?.country || 'Unknown'
  const city = request.geo?.city || 'Unknown'

  return Response.json({
    country,
    city,
    region: request.geo?.region
  })
}
```

### ISR (Incremental Static Regeneration)

```typescript
// src/app/products/[id]/page.tsx

// Generate static pages for top products
export async function generateStaticParams() {
  const products = await db.product.findMany({
    where: { featured: true },
    take: 100
  })

  return products.map(p => ({ id: p.id }))
}

// Revalidate every hour
export const revalidate = 3600

export default async function ProductPage({
  params
}: {
  params: { id: string }
}) {
  const product = await db.product.findUnique({
    where: { id: params.id }
  })

  if (!product) return notFound()

  return <ProductDetails product={product} />
}
```

### On-Demand Revalidation

```typescript
// src/app/api/revalidate/route.ts
import { NextRequest } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 })
  }

  const path = searchParams.get('path')
  const tag = searchParams.get('tag')

  if (path) {
    revalidatePath(path)
  }

  if (tag) {
    revalidateTag(tag)
  }

  return Response.json({ revalidated: true })
}
```

### Middleware for A/B Testing

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Check for existing bucket
  let bucket = request.cookies.get('ab-bucket')?.value

  if (!bucket) {
    // Assign random bucket
    bucket = Math.random() < 0.5 ? 'control' : 'variant'
    response.cookies.set('ab-bucket', bucket, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })
  }

  // Rewrite to variant page
  if (bucket === 'variant' && request.nextUrl.pathname === '/') {
    return NextResponse.rewrite(new URL('/variant-home', request.url))
  }

  return response
}

export const config = {
  matcher: '/'
}
```

## Performance Patterns

### Prefetching

```typescript
import Link from 'next/link'

// ✅ Prefetch enabled by default for Link
<Link href="/products">Products</Link>

// ❌ Disable prefetch for low-priority links
<Link href="/terms" prefetch={false}>Terms</Link>
```

### Dynamic Imports

```typescript
import dynamic from 'next/dynamic'

// ✅ Load heavy component only when needed
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false // Client-only component
})

// ✅ Named export
const Modal = dynamic(() =>
  import('@/components/modals').then(mod => mod.ConfirmModal)
)
```

### Route Segment Config

```typescript
// src/app/dashboard/layout.tsx

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Or prefer static
export const dynamic = 'force-static'

// Revalidation
export const revalidate = 60 // seconds

// Runtime
export const runtime = 'nodejs' // or 'edge'
```

## Error Handling

### Error Boundaries

```typescript
// src/app/dashboard/error.tsx
'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="error-container">
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

### Not Found

```typescript
// src/app/products/[id]/page.tsx
import { notFound } from 'next/navigation'

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({
    where: { id: params.id }
  })

  if (!product) {
    notFound() // Renders not-found.tsx
  }

  return <ProductDetails product={product} />
}
```

```typescript
// src/app/products/not-found.tsx
export default function ProductNotFound() {
  return (
    <div>
      <h2>Product Not Found</h2>
      <p>Could not find the requested product.</p>
    </div>
  )
}
```

## Key Principles

1. **Server-First**: Default to Server Components, add "use client" only when needed
2. **Stream Heavy Content**: Use Suspense boundaries for slow data
3. **Parallel Fetching**: Use Promise.all for independent data needs
4. **Cache Wisely**: Leverage fetch caching and React cache
5. **Optimize Assets**: Use next/image and next/font
6. **Edge When Possible**: Move latency-sensitive code to Edge Functions
7. **Revalidate Smartly**: Use on-demand revalidation for dynamic content

**Remember**: Next.js App Router is server-first by design. Embrace Server Components and Server Actions for the best performance.
