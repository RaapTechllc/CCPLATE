import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import bcryptjs from "bcryptjs";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import type { User } from "@/generated/prisma/client";

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcryptjs with 12 salt rounds
 */
export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

/**
 * Get the current authenticated user (server-side only)
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  return user;
}

/**
 * Require authentication - redirects to login if not authenticated
 * Returns the authenticated user
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
