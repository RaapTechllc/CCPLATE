"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth-utils";
import { uploadFile } from "@/lib/services/file-service";

const updateNameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export async function updateNameAction(
  name: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "You must be logged in." };
    }

    const validated = updateNameSchema.parse({ name });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: validated.name },
    });

    revalidatePath("/profile");

    return { success: true, message: "Name updated successfully." };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors[0]?.message || "Invalid input" };
    }
    console.error("Update name error:", error);
    return { success: false, message: "Failed to update name." };
  }
}

export async function updatePasswordAction(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "You must be logged in." };
    }

    const validated = updatePasswordSchema.parse({ currentPassword, newPassword });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return { success: false, message: "User not found." };
    }

    if (!user.passwordHash) {
      return {
        success: false,
        message: "Cannot change password for accounts using social login.",
      };
    }

    const isValid = await verifyPassword(validated.currentPassword, user.passwordHash);
    if (!isValid) {
      return { success: false, message: "Current password is incorrect." };
    }

    const newPasswordHash = await hashPassword(validated.newPassword);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newPasswordHash },
    });

    return { success: true, message: "Password updated successfully." };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors[0]?.message || "Invalid input" };
    }
    console.error("Update password error:", error);
    return { success: false, message: "Failed to update password." };
  }
}

export async function updateAvatarAction(
  formData: FormData
): Promise<{ success: boolean; message: string; imageUrl?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "You must be logged in." };
    }

    const file = formData.get("avatar") as File | null;
    if (!file || !(file instanceof File)) {
      return { success: false, message: "No file provided." };
    }

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return {
        success: false,
        message: "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.",
      };
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { success: false, message: "File is too large. Maximum size is 5MB." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadedFile = await uploadFile(
      session.user.id,
      buffer,
      file.name,
      file.type
    );

    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: uploadedFile.url },
    });

    revalidatePath("/profile");

    return {
      success: true,
      message: "Avatar updated successfully.",
      imageUrl: uploadedFile.url,
    };
  } catch (error) {
    console.error("Update avatar error:", error);
    return { success: false, message: "Failed to update avatar." };
  }
}
