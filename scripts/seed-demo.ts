#!/usr/bin/env tsx
/**
 * Seed Demo Data for CCPLATE
 * Creates realistic demo environment showcasing AI builders
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function seedDemoData() {
  console.log('🌱 Seeding CCPLATE demo data...')

  try {
    // 1. Create Demo Users
    const adminPassword = await bcrypt.hash('Demo123!@#', 10)
    const userPassword = await bcrypt.hash('Demo123!@#', 10)

    const admin = await prisma.user.upsert({
      where: { email: 'admin@ccplate.dev' },
      update: {},
      create: {
        email: 'admin@ccplate.dev',
        name: 'Admin User',
        password: adminPassword,
        role: 'ADMIN',
        emailVerified: new Date(),
      },
    })
    console.log('✅ Created admin user')

    const user = await prisma.user.upsert({
      where: { email: 'user@ccplate.dev' },
      update: {},
      create: {
        email: 'user@ccplate.dev',
        name: 'Demo User',
        password: userPassword,
        role: 'USER',
        emailVerified: new Date(),
      },
    })
    console.log('✅ Created demo user')

    // 2. Create Sample Hooks (Hook Builder examples)
    const hooks = [
      {
        name: 'useAuth',
        description: 'Authentication hook with login/logout',
        code: `export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    checkAuth()
  }, [])
  
  async function checkAuth() {
    const session = await getSession()
    setUser(session?.user || null)
    setLoading(false)
  }
  
  return { user, loading, signIn, signOut }
}`,
        category: 'authentication',
        userId: admin.id,
      },
      {
        name: 'useFetch',
        description: 'Data fetching hook with loading and error states',
        code: `export function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [url])
  
  return { data, loading, error, refetch }
}`,
        category: 'data',
        userId: user.id,
      },
    ]

    for (const hook of hooks) {
      await prisma.hook.create({ data: hook })
    }
    console.log(`✅ Created ${hooks.length} sample hooks`)

    // 3. Create Sample Components (Component Builder examples)
    const components = [
      {
        name: 'ProfileCard',
        description: 'User profile card with avatar and bio',
        code: `export function ProfileCard({ user }: { user: User }) {
  return (
    <div className="rounded-lg border p-6">
      <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full" />
      <h3 className="text-xl font-bold mt-4">{user.name}</h3>
      <p className="text-gray-600">{user.bio}</p>
    </div>
  )
}`,
        category: 'profile',
        userId: admin.id,
      },
      {
        name: 'DataTable',
        description: 'Sortable data table with pagination',
        code: `export function DataTable<T>({ data, columns }: DataTableProps<T>) {
  const [sortBy, setSortBy] = useState<keyof T | null>(null)
  const [page, setPage] = useState(1)
  
  const sortedData = useMemo(() => {
    if (!sortBy) return data
    return [...data].sort((a, b) => {
      if (a[sortBy] < b[sortBy]) return -1
      if (a[sortBy] > b[sortBy]) return 1
      return 0
    })
  }, [data, sortBy])
  
  return <table>...</table>
}`,
        category: 'data',
        userId: user.id,
      },
    ]

    for (const component of components) {
      await prisma.component.create({ data: component })
    }
    console.log(`✅ Created ${components.length} sample components`)

    // 4. Create Sample Prompts (Prompt Builder examples)
    const prompts = [
      {
        name: 'Code Review Assistant',
        template: 'Review this code for security, performance, and best practices:\n\n{code}\n\nProvide specific suggestions.',
        variables: ['code'],
        category: 'development',
        userId: admin.id,
      },
      {
        name: 'Email Writer',
        template: 'Write a professional email to {recipient} about {topic}. Tone: {tone}',
        variables: ['recipient', 'topic', 'tone'],
        category: 'writing',
        userId: user.id,
      },
    ]

    for (const prompt of prompts) {
      await prisma.prompt.create({ data: prompt })
    }
    console.log(`✅ Created ${prompts.length} sample prompts`)

    // 5. Create Sample API Endpoints (API Builder examples)
    const endpoints = [
      {
        path: '/api/users',
        method: 'GET',
        description: 'List all users with pagination',
        model: 'User',
        userId: admin.id,
      },
      {
        path: '/api/posts',
        method: 'POST',
        description: 'Create a new blog post',
        model: 'Post',
        userId: admin.id,
      },
    ]

    for (const endpoint of endpoints) {
      await prisma.apiEndpoint.create({ data: endpoint })
    }
    console.log(`✅ Created ${endpoints.length} sample API endpoints`)

    console.log('\n🎉 Demo data seeded successfully!')
    console.log('\n📋 Demo Credentials:')
    console.log('   Admin: admin@ccplate.dev / Demo123!@#')
    console.log('   User: user@ccplate.dev / Demo123!@#')
    console.log('\n🚀 Start the app and login to see AI builders!')

  } catch (error) {
    console.error('❌ Error seeding demo data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  seedDemoData().then(() => process.exit(0))
}

export { seedDemoData }
