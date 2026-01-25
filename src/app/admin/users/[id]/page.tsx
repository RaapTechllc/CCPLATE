import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserDetailClient } from "./user-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getUser(id: string) {
  // Use absolute URL for server-side fetch
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/admin/users/${id}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error("Failed to fetch user");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getUser(id);

  if (!user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/admin/users"
        className="inline-flex items-center text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <svg
          className="mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Users
      </Link>

      {/* User Header */}
      <div className="flex items-start gap-6">
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name || user.email}
            width={80}
            height={80}
            className="h-20 w-20 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
            <span className="text-2xl font-medium text-zinc-600 dark:text-zinc-300">
              {getInitials(user.name, user.email)}
            </span>
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {user.name || "No name"}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">{user.email}</p>
          <div className="mt-2 flex gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                user.role === "ADMIN"
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                  : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {user.role}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                user.deletedAt
                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              }`}
            >
              {user.deletedAt ? "Deleted" : "Active"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  User ID
                </dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100 font-mono">
                  {user.id}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Email Verified
                </dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {user.emailVerified ? formatDate(user.emailVerified) : "Not verified"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Created At
                </dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {formatDate(user.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Last Updated
                </dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {formatDate(user.updatedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Last Login
                </dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {formatDate(user.lastLoginAt)}
                </dd>
              </div>
              {user.deletedAt && (
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Deleted At
                  </dt>
                  <dd className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {formatDate(user.deletedAt)}
                  </dd>
                </div>
              )}
              {user._count && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Files
                    </dt>
                    <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                      {user._count.files}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Active Sessions
                    </dt>
                    <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                      {user._count.sessions}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Edit Form Card */}
        <UserDetailClient user={user} />
      </div>
    </div>
  );
}
