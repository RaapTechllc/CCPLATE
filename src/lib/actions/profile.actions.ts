"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { uploadFile } from "@/lib/services/file-service";
import { api } from "../../../convex/_generated/api";

const updateNameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

/**
 * Update the current user's display name.
 */
export async function updateNameAction(
  name: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { authenticated, user, convex } = await requireAuth();
    if (!authenticated || !user || !convex) {
      return { success: false, message: "You must be logged in." };
    }

    const validated = updateNameSchema.parse({ name });

    await convex.mutation(api.users.updateProfile, {
      name: validated.name,
    });

    revalidatePath("/profile");

    return { success: true, message: "Name updated successfully." };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.issues[0]?.message || "Invalid input" };
    }
    console.error("Update name error:", error);
    return { success: false, message: "Failed to update name." };
  }
}

/**
 * @deprecated Password updates are not available with OAuth-only authentication.
 * Users should manage their passwords through their OAuth provider (Google, GitHub).
 */
export async function updatePasswordAction(
  _currentPassword: string,
  _newPassword: string
): Promise<{ success: boolean; message: string }> {
  return {
    success: false,
    message: "Password updates are not available. Please manage your password through your OAuth provider (Google, GitHub).",
  };
}

/**
 * Update the current user's avatar/profile image.
 */
export async function updateAvatarAction(
  formData: FormData
): Promise<{ success: boolean; message: string; imageUrl?: string }> {
  try {
    const { authenticated, user, convex } = await requireAuth();
    if (!authenticated || !user || !convex) {
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

    const uploadedFile = await uploadFile(convex, buffer, file.name, file.type);

    await convex.mutation(api.users.updateProfile, {
      image: uploadedFile.url,
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
