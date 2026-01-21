"use client"

import * as React from "react"
import { useCallback, useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { Spinner } from "./spinner"

interface AvatarUploadProps {
  currentAvatar?: string
  onUpload: (file: File) => void | Promise<void>
  size?: "sm" | "md" | "lg"
  disabled?: boolean
  className?: string
}

const sizeVariants = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
}

const iconSizeVariants = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
}

export function AvatarUpload({
  currentAvatar,
  onUpload,
  size = "md",
  disabled = false,
  className,
}: AvatarUploadProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = useCallback(() => {
    if (!disabled && !isLoading && inputRef.current) {
      inputRef.current.click()
    }
  }, [disabled, isLoading])

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Reset input for re-selection
      e.target.value = ""

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file")
        return
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        setError("Image must be smaller than 5MB")
        return
      }

      setError(null)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload
      setIsLoading(true)
      try {
        await onUpload(file)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed")
        setPreviewUrl(null)
      } finally {
        setIsLoading(false)
      }
    },
    [onUpload]
  )

  const displayImage = previewUrl || currentAvatar

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleClick()
          }
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onFocus={() => setIsHovering(true)}
        onBlur={() => setIsHovering(false)}
        className={cn(
          "relative overflow-hidden rounded-full transition-all",
          "border-2 border-muted bg-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          sizeVariants[size],
          !disabled && !isLoading && "cursor-pointer hover:border-primary/50",
          disabled && "cursor-not-allowed opacity-50"
        )}
        aria-label="Upload avatar"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={disabled || isLoading}
          className="sr-only"
          aria-label="Avatar file input"
        />

        {displayImage ? (
          <img
            src={displayImage}
            alt="Avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <UserIcon className={cn("text-muted-foreground", iconSizeVariants[size])} />
          </div>
        )}

        {/* Overlay */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity",
            (isHovering || isLoading) && !disabled ? "opacity-100" : "opacity-0"
          )}
        >
          {isLoading ? (
            <Spinner size="md" className="text-white" />
          ) : (
            <CameraIcon className={cn("text-white", iconSizeVariants[size])} />
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}
