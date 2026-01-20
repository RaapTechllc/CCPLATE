import { Metadata } from "next"
import { requireAuth } from "@/lib/auth-utils"

export const metadata: Metadata = {
  title: "Dashboard | CCPLATE",
  description: "Your personal dashboard - view stats and manage your account",
}

export default async function DashboardPage() {
  const user = await requireAuth()

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
          title="Total Projects"
          value="12"
          description="Active projects"
          trend="+2 this month"
        />
        <StatCard
          title="Tasks Completed"
          value="48"
          description="This week"
          trend="+15% vs last week"
        />
        <StatCard
          title="Team Members"
          value="8"
          description="Collaborators"
          trend="2 pending invites"
        />
        <StatCard
          title="Storage Used"
          value="2.4 GB"
          description="Of 10 GB"
          trend="24% used"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Recent Activity
          </h2>
          <div className="space-y-4">
            <ActivityItem
              title="Project updated"
              description="You updated the marketing dashboard"
              time="2 hours ago"
            />
            <ActivityItem
              title="New comment"
              description="Sarah commented on your design file"
              time="4 hours ago"
            />
            <ActivityItem
              title="Task completed"
              description="Homepage redesign marked as complete"
              time="Yesterday"
            />
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Quick Actions
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickActionButton label="Create Project" />
            <QuickActionButton label="Invite Member" />
            <QuickActionButton label="Upload File" />
            <QuickActionButton label="View Reports" />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  description,
  trend,
}: {
  title: string
  value: string
  description: string
  trend: string
}) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <p className="mt-2 text-xs text-green-600">{trend}</p>
    </div>
  )
}

function ActivityItem({
  title,
  description,
  time,
}: {
  title: string
  description: string
  time: string
}) {
  return (
    <div className="flex items-start gap-3 border-b pb-3 last:border-0">
      <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
      <div className="flex-1">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
        <p className="mt-1 text-xs text-gray-400">{time}</p>
      </div>
    </div>
  )
}

function QuickActionButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
    >
      {label}
    </button>
  )
}
