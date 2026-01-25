/**
 * Prisma Database Client
 *
 * This project uses both:
 * - Convex for authentication and real-time data
 * - Prisma/PostgreSQL for file storage, admin operations, and system settings
 *
 * For auth-related operations, use Convex:
 *   import { useQuery } from "convex/react";
 *   import { api } from "../../convex/_generated/api";
 *
 * For file/admin operations, use Prisma:
 *   import { prisma } from "@/lib/db";
 */

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var pool: Pool | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = globalThis.pool || new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  if (process.env.NODE_ENV !== "production") {
    globalThis.pool = pool;
  }

  return new PrismaClient({ adapter });
}

// Prevent multiple instances of Prisma Client in development
export const prisma = globalThis.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
