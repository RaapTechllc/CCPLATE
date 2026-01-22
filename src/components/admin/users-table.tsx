"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import type { UserDetails } from "@/types/admin";

interface UsersTableProps {
  users: UserDetails[];
  loading: boolean;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

function getRoleBadgeClasses(role: "USER" | "ADMIN"): string {
  return role === "ADMIN"
    ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
    : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400";
}

function getStatusBadgeClasses(isDeleted: boolean): string {
  return isDeleted
    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
}

export function UsersTable({ users, loading }: UsersTableProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg
          className="h-12 w-12 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          No users found
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Try adjusting your search or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              User
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Email
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Role
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Created
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {users.map((user) => (
            <tr
              key={user.id}
              onClick={() => router.push(`/admin/users/${user.id}`)}
              className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name || user.email}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                        {getInitials(user.name, user.email)}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {user.name || "No name"}
                    </p>
                    {user._count && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {user._count.files} files
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {user.email}
                </span>
              </td>
              <td className="px-4 py-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    getRoleBadgeClasses(user.role)
                  )}
                >
                  {user.role}
                </span>
              </td>
              <td className="px-4 py-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    getStatusBadgeClasses(!!user.deletedAt)
                  )}
                >
                  {user.deletedAt ? "Deleted" : "Active"}
                </span>
              </td>
              <td className="px-4 py-4">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {formatDate(user.createdAt)}
                </span>
              </td>
              <td className="px-4 py-4 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/admin/users/${user.id}`);
                  }}
                  className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
