"use client"

import { Toaster as SonnerToaster } from "sonner"

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800",
          title: "text-zinc-900 dark:text-zinc-100",
          description: "text-zinc-500 dark:text-zinc-400",
        },
      }}
    />
  )
}
