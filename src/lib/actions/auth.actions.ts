"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth-utils";
import { sendEmail } from "@/lib/email";
import { generateResetPasswordEmail } from "@/lib/email/templates/reset-password";
import { generateVerifyEmailTemplate } from "@/lib/email/templates/verify-email";
import {
  createPasswordResetToken,
  validatePasswordResetToken,
  markPasswordResetTokenUsed,
  createEmailVerificationToken,
  validateEmailVerificationToken,
  deleteEmailVerificationToken,
} from "@/lib/auth/tokens";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export async function forgotPasswordAction(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    const validated = forgotPasswordSchema.parse({ email });

    const user = await prisma.user.findUnique({
      where: { email: validated.email, deletedAt: null },
    });

    if (user) {
      const rawToken = await createPasswordResetToken(user.id);
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password/${rawToken}`;

      const { html, text } = generateResetPasswordEmail({
        resetUrl,
        userName: user.name || undefined,
      });

      await sendEmail({
        to: user.email,
        subject: "Reset Your Password",
        html,
        text,
      });
    }

    return {
      success: true,
      message: "If an account exists, you will receive a reset link.",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors[0]?.message || "Invalid input" };
    }
    console.error("Forgot password error:", error);
    return {
      success: true,
      message: "If an account exists, you will receive a reset link.",
    };
  }
}

export async function resetPasswordAction(
  token: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const validated = resetPasswordSchema.parse({ token, password: newPassword });

    const user = await validatePasswordResetToken(validated.token);
    if (!user) {
      return {
        success: false,
        message: "Invalid or expired reset link. Please request a new one.",
      };
    }

    const passwordHash = await hashPassword(validated.password);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await markPasswordResetTokenUsed(validated.token);

    return {
      success: true,
      message: "Password reset successfully. You can now log in.",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors[0]?.message || "Invalid input" };
    }
    console.error("Reset password error:", error);
    return {
      success: false,
      message: "Failed to reset password. Please try again.",
    };
  }
}

export async function sendVerificationEmailAction(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "You must be logged in." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return { success: false, message: "User not found." };
    }

    if (user.emailVerified) {
      return { success: false, message: "Email is already verified." };
    }

    const rawToken = await createEmailVerificationToken(user.id);
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify-email/${rawToken}`;

    const { html, text } = generateVerifyEmailTemplate({
      verifyUrl,
      userName: user.name || undefined,
    });

    await sendEmail({
      to: user.email,
      subject: "Verify Your Email Address",
      html,
      text,
    });

    return {
      success: true,
      message: "Verification email sent. Please check your inbox.",
    };
  } catch (error) {
    console.error("Send verification email error:", error);
    return {
      success: false,
      message: "Failed to send verification email. Please try again.",
    };
  }
}

export async function verifyEmailAction(
  token: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await validateEmailVerificationToken(token);
    if (!user) {
      return {
        success: false,
        message: "Invalid or expired verification link.",
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    await deleteEmailVerificationToken(user.id);

    return {
      success: true,
      message: "Email verified successfully!",
    };
  } catch (error) {
    console.error("Verify email error:", error);
    return {
      success: false,
      message: "Failed to verify email. Please try again.",
    };
  }
}
