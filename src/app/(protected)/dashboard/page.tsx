import { Metadata } from "next";
import Link from "next/link";
import { requireAuth } from "@/lib/auth-utils";
import { getDashboardStats, formatStorageSize } from "@/lib/dashboard/stats";

export const metadata: Metadata = {
  title: "Dashboard | CCPLATE",
  description: "Your personal dashboard - view stats and manage your account",
};

export default async function DashboardPage() {
  const user = await requireAuth();
  const stats = await getDashboardStats(user.id);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user.name || user.email}!
        </h1>
        <p className="mt-2 text-gray-600">
          Here&apos;s an overview of your account activity.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Files"
          value={stats.totalFiles.toString()}
          description="Uploaded files"
          icon="📁"
        />
        <StatCard
          title="Storage Used"
          value={formatStorageSize(stats.storageUsedBytes)}
          description="Total storage"
          icon="💾"
        />
        <MemberSinceCard memberSince={stats.memberSince} />
        <StatCard
          title="Account Status"
          value={user.emailVerified ? "Verified" : "Unverified"}
          description={user.emailVerified ? "Email confirmed" : "Email pending"}
          icon={user.emailVerified ? "✅" : "⚠️"}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Recent Files</h2>
            <Link
              href="/files"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              View all →
            </Link>
          </div>
          {stats.recentFiles.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p>No files uploaded yet</p>
              <Link
                href="/files"
                className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-500"
              >
                Upload your first file
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <span className="text-xl">
                    {getFileIcon(file.mimeType)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {file.originalName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatStorageSize(file.size)} •{" "}
                      {file.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Quick Actions
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickActionButton href="/files" label="Upload File" icon="📤" />
            <QuickActionButton href="/hook-builder" label="Build Hook" icon="🪝" />
            <QuickActionButton href="/agent-builder" label="Create Agent" icon="🤖" />
            <QuickActionButton href="/profile" label="View Profile" icon="👤" />
          </div>
        </div>
      </div>

      {stats.totalFiles === 0 && (
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">
            🚀 Getting Started
          </h2>
          <p className="text-blue-800 mb-4">
            Welcome to CCPLATE! Here are some things you can do:
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <GettingStartedCard
              href="/files"
              title="Upload Files"
              description="Store and manage your files with secure cloud storage"
            />
            <GettingStartedCard
              href="/hook-builder"
              title="Hook Builder"
              description="Generate React Query hooks from natural language"
            />
            <GettingStartedCard
              href="/prompt-builder"
              title="Prompt Builder"
              description="Create and manage reusable AI prompts"
            />
            <GettingStartedCard
              href="/agent-builder"
              title="Agent Builder"
              description="Build AI agents with custom tools and configurations"
            />
            <GettingStartedCard
              href="/schema-builder"
              title="Schema Builder"
              description="Generate Prisma models from descriptions"
            />
            <GettingStartedCard
              href="/api-builder"
              title="API Builder"
              description="Create CRUD API routes from Prisma models"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

function QuickActionButton({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
    >
      <span>{icon}</span>
      {label}
    </Link>
  );
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎥";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType === "application/pdf") return "📄";
  return "📁";
}

function MemberSinceCard({ memberSince }: { memberSince: Date }) {
  const daysAgo = Math.floor(
    (new Date().getTime() - memberSince.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <StatCard
      title="Member Since"
      value={memberSince.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })}
      description={`${daysAgo} days ago`}
      icon="📅"
    />
  );
}

function GettingStartedCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-blue-200 bg-white p-4 transition-shadow hover:shadow-md"
    >
      <h3 className="font-semibold text-blue-900">{title}</h3>
      <p className="mt-1 text-sm text-blue-700">{description}</p>
    </Link>
  );
}
