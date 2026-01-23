/**
 * Database Seed Script
 * Creates test users for development and E2E testing
 * 
 * Run with: npm run db:seed
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...\n");

  // Create test user (for E2E tests)
  const testUserPassword = await bcrypt.hash("TestPassword123!", 12);
  const testUser = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      name: "Test User",
      passwordHash: testUserPassword,
      emailVerified: new Date(),
      role: "USER",
    },
  });
  console.log(`✓ Test user: ${testUser.email}`);

  // Create admin user (for E2E tests)
  const adminPassword = await bcrypt.hash("AdminPassword123!", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      passwordHash: adminPassword,
      emailVerified: new Date(),
      role: "ADMIN",
    },
  });
  console.log(`✓ Admin user: ${adminUser.email}`);

  // Create demo user (for demos/screenshots)
  const demoPassword = await bcrypt.hash("DemoPassword123!", 12);
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
      passwordHash: demoPassword,
      emailVerified: new Date(),
      role: "USER",
    },
  });
  console.log(`✓ Demo user: ${demoUser.email}`);

  console.log("\n✅ Seed complete!");
  console.log("\nTest credentials:");
  console.log("  User:  test@example.com / TestPassword123!");
  console.log("  Admin: admin@example.com / AdminPassword123!");
  console.log("  Demo:  demo@example.com / DemoPassword123!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
