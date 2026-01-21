"use client"

import { useState } from "react"
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
  const isActive = pathname === href || pathname.startsWith(href + "/")

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

const mainLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/files", label: "Files" },
  { href: "/guardian", label: "Guardian" },
  { href: "/profile", label: "Profile" },
]

const builderLinks = [
  { href: "/hook-builder", label: "Hook Builder" },
  { href: "/prompt-builder", label: "Prompt Builder" },
  { href: "/agent-builder", label: "Agent Builder" },
  { href: "/schema-builder", label: "Schema Builder" },
  { href: "/api-builder", label: "API Builder" },
  { href: "/component-builder", label: "Component Builder" },
]

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
  const [buildersOpen, setBuildersOpen] = useState(false)
  const pathname = usePathname()
  const isBuilderActive = builderLinks.some(
    (link) => pathname === link.href || pathname.startsWith(link.href + "/")
  )

  if (orientation === "vertical") {
    return (
      <nav className={cn("flex flex-col gap-1", className)}>
        <NavLink href="/" onClick={onLinkClick}>
          Home
        </NavLink>
        {session && (
          <>
            {mainLinks.map((link) => (
              <NavLink key={link.href} href={link.href} onClick={onLinkClick}>
                {link.label}
              </NavLink>
            ))}
            <div className="my-2 border-t border-zinc-200 dark:border-zinc-700" />
            <span className="px-3 py-1 text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-500">
              Builders
            </span>
            {builderLinks.map((link) => (
              <NavLink key={link.href} href={link.href} onClick={onLinkClick}>
                {link.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>
    )
  }

  return (
    <nav className={cn("flex flex-row items-center gap-1", className)}>
      <NavLink href="/" onClick={onLinkClick}>
        Home
      </NavLink>
      {session && (
        <>
          {mainLinks.map((link) => (
            <NavLink key={link.href} href={link.href} onClick={onLinkClick}>
              {link.label}
            </NavLink>
          ))}
          <div className="relative">
            <button
              onClick={() => setBuildersOpen(!buildersOpen)}
              className={cn(
                "flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isBuilderActive
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/50"
              )}
            >
              Builders
              <svg
                className={cn(
                  "h-4 w-4 transition-transform",
                  buildersOpen && "rotate-180"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {buildersOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setBuildersOpen(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                  {builderLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => {
                        setBuildersOpen(false)
                        onLinkClick?.()
                      }}
                      className={cn(
                        "block px-4 py-2 text-sm transition-colors",
                        pathname === link.href || pathname.startsWith(link.href + "/")
                          ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </nav>
  )
}
