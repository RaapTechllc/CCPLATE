export function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />
      <p className="mt-4 text-sm text-zinc-500">Loading...</p>
    </div>
  )
}

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  }

  return (
    <div
      className={`animate-spin rounded-full border-zinc-200 border-t-zinc-900 ${sizeClasses[size]}`}
    />
  )
}
