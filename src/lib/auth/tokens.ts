import crypto from "crypto";
import { prisma } from "@/lib/db";

const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1;
const EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  await prisma.passwordResetToken.deleteMany({
    where: { userId },
  });

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
  );

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return rawToken;
}

export async function validatePasswordResetToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!tokenRecord) {
    return null;
  }

  if (tokenRecord.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({
      where: { id: tokenRecord.id },
    });
    return null;
  }

  if (tokenRecord.usedAt) {
    return null;
  }

  return tokenRecord.user;
}

export async function markPasswordResetTokenUsed(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.passwordResetToken.update({
    where: { tokenHash },
    data: { usedAt: new Date() },
  });
}

export async function createEmailVerificationToken(userId: string): Promise<string> {
  await prisma.emailVerificationToken.deleteMany({
    where: { userId },
  });

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
  );

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return rawToken;
}

export async function validateEmailVerificationToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  const tokenRecord = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!tokenRecord) {
    return null;
  }

  if (tokenRecord.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({
      where: { id: tokenRecord.id },
    });
    return null;
  }

  return tokenRecord.user;
}

export async function deleteEmailVerificationToken(userId: string): Promise<void> {
  await prisma.emailVerificationToken.deleteMany({
    where: { userId },
  });
}
