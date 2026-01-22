"use client"

import * as React from "react"
import { useCallback, useState, useRef } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Spinner } from "./spinner"

interface FileUploadProps {
  onUpload: (files: File[]) => void | Promise<void>
  accept?: string
  maxSize?: number
  maxFiles?: number
  disabled?: boolean
  className?: string
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/")
}

interface FilePreview {
  file: File
  preview: string | null
}

export function FileUpload({
  onUpload,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 1,
  disabled = false,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([])
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; errors: string[] } => {
      const valid: File[] = []
      const errors: string[] = []

      for (const file of files) {
        if (maxSize && file.size > maxSize) {
          errors.push(`${file.name} exceeds maximum size of ${formatFileSize(maxSize)}`)
          continue
        }

        if (accept) {
          const acceptedTypes = accept.split(",").map((t) => t.trim())
          const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`
          const isAccepted = acceptedTypes.some((type) => {
            if (type.startsWith(".")) {
              return fileExtension === type.toLowerCase()
            }
            if (type.endsWith("/*")) {
              return file.type.startsWith(type.replace("/*", "/"))
            }
            return file.type === type
          })

          if (!isAccepted) {
            errors.push(`${file.name} is not an accepted file type`)
            continue
          }
        }

        valid.push(file)
      }

      if (maxFiles && valid.length > maxFiles) {
        errors.push(`Maximum ${maxFiles} file(s) allowed`)
        return { valid: valid.slice(0, maxFiles), errors }
      }

      return { valid, errors }
    },
    [accept, maxSize, maxFiles]
  )

  const createPreviews = useCallback(async (files: File[]): Promise<FilePreview[]> => {
    const previews: FilePreview[] = []

    for (const file of files) {
      if (isImageFile(file)) {
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
        previews.push({ file, preview })
      } else {
        previews.push({ file, preview: null })
      }
    }

    return previews
  }, [])

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null)
      const fileArray = Array.from(files)
      const { valid, errors } = validateFiles(fileArray)

      if (errors.length > 0) {
        setError(errors.join(". "))
      }

      if (valid.length === 0) return

      const previews = await createPreviews(valid)
      setSelectedFiles(previews)

      setIsLoading(true)
      try {
        await onUpload(valid)
      } finally {
        setIsLoading(false)
      }
    },
    [validateFiles, createPreviews, onUpload]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) {
        setIsDragging(true)
      }
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const { files } = e.dataTransfer
      if (files && files.length > 0) {
        handleFiles(files)
      }
    },
    [disabled, handleFiles]
  )

  const handleClick = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click()
    }
  }, [disabled])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target
      if (files && files.length > 0) {
        handleFiles(files)
      }
      // Reset input so same file can be selected again
      e.target.value = ""
    },
    [handleFiles]
  )

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const acceptedTypesText = accept
    ? accept
        .split(",")
        .map((t) => t.trim())
        .join(", ")
    : "All files"

  return (
    <div className={cn("w-full", className)}>
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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          "hover:border-primary/50 hover:bg-accent/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDragging && "border-primary bg-accent",
          disabled && "cursor-not-allowed opacity-50",
          !disabled && "cursor-pointer"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleInputChange}
          disabled={disabled}
          className="sr-only"
          aria-label="File upload input"
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <Spinner size="lg" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <>
            <UploadIcon className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="mb-1 text-sm font-medium">
              Drag and drop files here, or click to select
            </p>
            <p className="text-xs text-muted-foreground">
              {acceptedTypesText} (max {formatFileSize(maxSize)})
            </p>
            {maxFiles > 1 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Up to {maxFiles} files
              </p>
            )}
          </>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {selectedFiles.map((item, index) => (
            <div
              key={`${item.file.name}-${index}`}
              className="flex items-center gap-3 rounded-md border bg-card p-3"
            >
              {item.preview ? (
                <Image
                  src={item.preview}
                  alt={item.file.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded object-cover"
                  unoptimized
                />
              ) : (
                <FileIcon className="h-12 w-12 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(item.file.size)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(index)
                }}
                disabled={isLoading}
                aria-label={`Remove ${item.file.name}`}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function UploadIcon({ className }: { className?: string }) {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function FileIcon({ className }: { className?: string }) {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
