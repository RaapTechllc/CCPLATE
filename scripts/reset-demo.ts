#!/usr/bin/env tsx
/**
 * Reset Demo Data
 * Wipes database and re-seeds with fresh demo data
 * Perfect for back-to-back demos
 */

import { PrismaClient } from '@prisma/client'
import { seedDemoData } from './seed-demo'

const prisma = new PrismaClient()

async function resetDemo() {
  console.log('🔄 Resetting demo environment...')

  try {
    // Delete all data (in reverse order of dependencies)
    console.log('🗑️  Clearing database...')
    
    await prisma.apiEndpoint.deleteMany({})
    await prisma.prompt.deleteMany({})
    await prisma.component.deleteMany({})
    await prisma.hook.deleteMany({})
    await prisma.session.deleteMany({})
    await prisma.user.deleteMany({})
    
    console.log('✅ Database cleared')

    console.log('\n🌱 Re-seeding demo data...\n')
    
    // Re-seed
    await seedDemoData()

    console.log('\n✨ Demo reset complete!')

  } catch (error) {
    console.error('❌ Error resetting demo:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  resetDemo().then(() => process.exit(0))
}

export { resetDemo }
