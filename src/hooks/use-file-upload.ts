import { useState, useCallback } from "react"
import { showToast } from "@/lib/toast"

interface UploadResult {
  id: string
  url: string
  name: string
  size: number
  type: string
  uploadedAt: string
}

interface UploadError {
  message: string
  file?: string
}

interface UseFileUploadOptions {
  onSuccess?: (result: UploadResult | UploadResult[]) => void
  onError?: (error: UploadError) => void
}

interface UseFileUploadReturn {
  uploadFile: (file: File) => Promise<UploadResult | null>
  uploadFiles: (files: File[]) => Promise<UploadResult[]>
  loading: boolean
  error: UploadError | null
  progress: number
  reset: () => void
}

export function useFileUpload(
  options: UseFileUploadOptions = {}
): UseFileUploadReturn {
  const { onSuccess, onError } = options
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<UploadError | null>(null)
  const [progress, setProgress] = useState(0)

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setProgress(0)
  }, [])

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      setLoading(true)
      setError(null)
      setProgress(0)

      try {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage =
            errorData.error || `Upload failed with status ${response.status}`
          throw new Error(errorMessage)
        }

        const result: UploadResult = await response.json()
        setProgress(100)
        showToast.success(`${file.name} uploaded successfully`)
        onSuccess?.(result)
        return result
      } catch (err) {
        const uploadError: UploadError = {
          message: err instanceof Error ? err.message : "Upload failed",
          file: file.name,
        }
        setError(uploadError)
        showToast.error(uploadError.message)
        onError?.(uploadError)
        return null
      } finally {
        setLoading(false)
      }
    },
    [onSuccess, onError]
  )

  const uploadFiles = useCallback(
    async (files: File[]): Promise<UploadResult[]> => {
      if (files.length === 0) return []

      setLoading(true)
      setError(null)
      setProgress(0)

      const results: UploadResult[] = []
      const errors: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
          const formData = new FormData()
          formData.append("file", file)

          const response = await fetch("/api/uploads", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `Upload failed for ${file.name}`)
          }

          const result: UploadResult = await response.json()
          results.push(result)
        } catch (err) {
          errors.push(
            `${file.name}: ${err instanceof Error ? err.message : "Upload failed"}`
          )
        }

        setProgress(Math.round(((i + 1) / files.length) * 100))
      }

      setLoading(false)

      if (errors.length > 0) {
        const uploadError: UploadError = {
          message: `${errors.length} file(s) failed to upload`,
        }
        setError(uploadError)
        showToast.error(uploadError.message)
        onError?.(uploadError)
      }

      if (results.length > 0) {
        showToast.success(`${results.length} file(s) uploaded successfully`)
        onSuccess?.(results)
      }

      return results
    },
    [onSuccess, onError]
  )

  return {
    uploadFile,
    uploadFiles,
    loading,
    error,
    progress,
    reset,
  }
}
