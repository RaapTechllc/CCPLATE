"use client"

import { useState } from "react"
import { z } from "zod"
import { showToast } from "@/lib/toast"
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/types/auth"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Validate email
      const validatedData = forgotPasswordSchema.parse({ email })

      // Submit to password reset API
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: validatedData.email }),
      })

      // Always show success message for security reasons
      // (don't reveal whether email exists in system)
      setIsSubmitted(true)
      showToast.success("If an account exists, you will receive a reset link")
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0]?.message || "Invalid email address")
      } else {
        // Still show success for security - don't reveal server errors
        setIsSubmitted(true)
        showToast.success("If an account exists, you will receive a reset link")
      }
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-green-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
              Check your email
            </h3>
            <div className="mt-2 text-sm text-green-700 dark:text-green-300">
              <p>
                If an account with that email exists, we have sent password reset
                instructions to your inbox. Please check your email and follow the
                link to reset your password.
              </p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false)
                  setEmail("")
                }}
                className="text-sm font-medium text-green-800 underline hover:text-green-700 dark:text-green-200 dark:hover:text-green-100"
              >
                Try a different email
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError(null)
          }}
          disabled={isLoading}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          placeholder="you@example.com"
        />
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Enter your email address and we will send you instructions to reset your
        password.
      </p>

      <button
        type="submit"
        disabled={isLoading}
        className="flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-zinc-900"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
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
            Sending...
          </span>
        ) : (
          "Send reset link"
        )}
      </button>
    </form>
  )
}
