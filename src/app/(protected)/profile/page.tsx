import { Metadata } from "next"
import { requireAuth } from "@/lib/auth-utils"

export const metadata: Metadata = {
  title: "Profile | CCPLATE",
  description: "Manage your profile settings and account information",
}

export default async function ProfilePage() {
  const user = await requireAuth()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your account information and preferences.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">
              Personal Information
            </h2>
            <form className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    defaultValue={user.name || ""}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    defaultValue={user.email}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Email cannot be changed
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="bio"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">
              Change Password
            </h2>
            <form className="space-y-6">
              <div>
                <label
                  htmlFor="current-password"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Current Password
                </label>
                <input
                  type="password"
                  id="current-password"
                  name="currentPassword"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="new-password"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    New Password
                  </label>
                  <input
                    type="password"
                    id="new-password"
                    name="newPassword"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirm-password"
                    name="confirmPassword"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>

        <div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Profile Picture
            </h2>
            <div className="flex flex-col items-center">
              <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-3xl font-bold text-blue-600">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Change Picture
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Account Info
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Account ID</dt>
                <dd className="font-mono text-sm text-gray-900">{user.id}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Member Since</dt>
                <dd className="text-sm text-gray-900">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "N/A"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Account Status</dt>
                <dd className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                  Active
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="mb-2 text-lg font-semibold text-red-800">
              Danger Zone
            </h2>
            <p className="mb-4 text-sm text-red-600">
              Once you delete your account, there is no going back.
            </p>
            <button
              type="button"
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
