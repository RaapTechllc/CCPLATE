import Link from "next/link"
import { cn } from "@/lib/utils"

interface FooterProps {
  className?: string
}

export function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer
      className={cn(
        "border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950",
        className
      )}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Copyright */}
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            &copy; {currentYear} CCPLATE. All rights reserved.
          </p>

          {/* Links */}
          <nav className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              Terms of Service
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
