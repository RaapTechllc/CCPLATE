"use client";

import { useState, useRef } from "react";
import { showToast } from "@/lib/toast";
import { updateAvatarAction } from "@/lib/actions/profile.actions";

interface ProfileAvatarFormProps {
  currentImage: string | null;
  userName: string;
}

export function ProfileAvatarForm({
  currentImage,
  userName,
}: ProfileAvatarFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const result = await updateAvatarAction(formData);

      if (result.success) {
        showToast.success(result.message);
        if (result.imageUrl) {
          setPreviewUrl(result.imageUrl);
        }
      } else {
        showToast.error(result.message);
        setPreviewUrl(currentImage);
      }
    } catch {
      showToast.error("Failed to update avatar");
      setPreviewUrl(currentImage);
    } finally {
      setIsLoading(false);
      URL.revokeObjectURL(preview);
    }
  };

  const handleClick = () => {
    if (!isLoading) {
      inputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col items-center">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload avatar"
      />

      <div className="relative mb-4">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Profile"
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-3xl font-bold text-blue-600">
            {userName.charAt(0).toUpperCase()}
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <svg
              className="h-8 w-8 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Uploading..." : "Change Picture"}
      </button>

      <p className="mt-2 text-xs text-gray-500">JPEG, PNG, GIF, or WebP. Max 5MB.</p>
    </div>
  );
}
