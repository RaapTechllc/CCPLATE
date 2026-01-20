"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"

interface NavLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

function NavLink({ href, children, className, onClick }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "px-3 py-2 text-sm font-medium rounded-md transition-colors",
        isActive
          ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
          : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/50",
        className
      )}
    >
      {children}
    </Link>
  )
}

interface NavigationProps {
  className?: string
  orientation?: "horizontal" | "vertical"
  onLinkClick?: () => void
}

export function Navigation({
  className,
  orientation = "horizontal",
  onLinkClick
}: NavigationProps) {
  const { data: session } = useSession()

  return (
    <nav
      className={cn(
        "flex gap-1",
        orientation === "vertical" ? "flex-col" : "flex-row items-center",
        className
      )}
    >
      <NavLink href="/" onClick={onLinkClick}>
        Home
      </NavLink>
      {session && (
        <NavLink href="/dashboard" onClick={onLinkClick}>
          Dashboard
        </NavLink>
      )}
    </nav>
  )
}
