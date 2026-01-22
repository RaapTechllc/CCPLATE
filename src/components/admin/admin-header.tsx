"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface AdminHeaderProps {
  user: {
    name: string | null;
    email: string;
    image: string | null;
  };
}

// Breadcrumb mapping for admin routes
const breadcrumbLabels: Record<string, string> = {
  admin: "Admin",
  users: "Users",
  settings: "Settings",
};

export function AdminHeader({ user }: AdminHeaderProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Generate breadcrumbs from pathname
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = "/" + pathSegments.slice(0, index + 1).join("/");
    const label = breadcrumbLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    return { href, label };
  });

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menu on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const userInitial = user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-6 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
      {/* Mobile menu toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 lg:hidden"
        aria-label="Toggle mobile menu"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Breadcrumb navigation */}
      <nav className="hidden items-center gap-2 text-sm lg:flex" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.href} className="flex items-center gap-2">
            {index > 0 && (
              <svg
                className="h-4 w-4 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            {index === breadcrumbs.length - 1 ? (
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Mobile breadcrumb - just show current page */}
      <div className="flex-1 lg:hidden">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {breadcrumbs[breadcrumbs.length - 1]?.label || "Admin"}
        </span>
      </div>

      {/* User menu */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-2 rounded-full p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-expanded={isMenuOpen}
          aria-haspopup="true"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name || "User avatar"}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
                unoptimized
              />
            ) : (
              userInitial
            )}
          </div>
          <span className="hidden text-sm font-medium text-zinc-700 dark:text-zinc-300 md:block">
            {user.name || user.email}
          </span>
          <svg
            className={cn(
              "h-4 w-4 text-zinc-500 transition-transform",
              isMenuOpen && "rotate-180"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 z-50">
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {user.name || "User"}
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {user.email}
              </p>
            </div>

            <div className="py-1">
              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Profile
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Back to App
              </Link>
            </div>

            <div className="border-t border-zinc-200 py-1 dark:border-zinc-800">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-zinc-100 dark:text-red-400 dark:hover:bg-zinc-800"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
