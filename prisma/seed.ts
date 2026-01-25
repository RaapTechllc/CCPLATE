/**
 * Database Seed Script
 * Creates test users for development and E2E testing
 *
 * Run with: npm run db:seed
 *
 * SECURITY: Passwords must be set via environment variables:
 *   - SEED_TEST_PASSWORD
 *   - SEED_ADMIN_PASSWORD
 *   - SEED_DEMO_PASSWORD
 *
 * For development only, random passwords will be generated if env vars are not set.
 *
 * NOTE: This script uses bcrypt for password hashing because it creates users
 * directly in the Prisma/PostgreSQL database (legacy users). The main application
 * uses Convex Auth with OAuth providers only - no password authentication.
 * These seeded users are for E2E testing scenarios that interact with the legacy
 * Prisma database layer.
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as crypto from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Generate a secure random password.
 * Used only in development when env vars are not set.
 */
function generateSecurePassword(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/**
 * Get password from environment or generate one for development.
 * In production (NODE_ENV=production), throws if env var is missing.
 */
function getPassword(envVar: string, userType: string): string {
  const password = process.env[envVar];

  if (password) {
    return password;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `Missing required environment variable ${envVar} for ${userType} user. ` +
      `In production, all seed passwords must be set via environment variables.`
    );
  }

  // Development only: generate random password
  const generated = generateSecurePassword();
  console.log(`⚠️  Generated random password for ${userType} (dev only): ${generated}`);
  return generated;
}

async function main() {
  console.log("🌱 Seeding database...\n");

  // Get passwords from environment or generate for development
  const testPassword = getPassword("SEED_TEST_PASSWORD", "test");
  const adminPassword = getPassword("SEED_ADMIN_PASSWORD", "admin");
  const demoPassword = getPassword("SEED_DEMO_PASSWORD", "demo");

  // Create test user (for E2E tests)
  const testUserPasswordHash = await bcrypt.hash(testPassword, 12);
  const testUser = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      name: "Test User",
      passwordHash: testUserPasswordHash,
      emailVerified: new Date(),
      role: "USER",
    },
  });
  console.log(`✓ Test user: ${testUser.email}`);

  // Create admin user (for E2E tests)
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      passwordHash: adminPasswordHash,
      emailVerified: new Date(),
      role: "ADMIN",
    },
  });
  console.log(`✓ Admin user: ${adminUser.email}`);

  // Create demo user (for demos/screenshots)
  const demoPasswordHash = await bcrypt.hash(demoPassword, 12);
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
      passwordHash: demoPasswordHash,
      emailVerified: new Date(),
      role: "USER",
    },
  });
  console.log(`✓ Demo user: ${demoUser.email}`);

  console.log("\n✅ Seed complete!");

  if (process.env.NODE_ENV !== "production") {
    console.log("\n⚠️  Development mode: Credentials shown above (if generated).");
    console.log("   In production, set SEED_TEST_PASSWORD, SEED_ADMIN_PASSWORD, SEED_DEMO_PASSWORD.");
  }
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
