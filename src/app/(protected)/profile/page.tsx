import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { ProfileNameForm } from "@/components/features/profile/profile-name-form";
import { ProfileAvatarForm } from "@/components/features/profile/profile-avatar-form";
import { EmailVerificationBanner } from "@/components/features/profile/email-verification-banner";

// Force dynamic rendering - this page uses auth
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile | CCPLATE",
  description: "Manage your profile settings and account information",
};

export default async function ProfilePage() {
  const { authenticated, user } = await requireAuth();

  if (!authenticated || !user) {
    redirect("/login");
  }

  const isEmailVerified = !!user.emailVerificationTime;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your account information and preferences.
        </p>
      </div>

      {!isEmailVerified && <EmailVerificationBanner />}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">
              Personal Information
            </h2>
            <ProfileNameForm defaultName={user.name || ""} email={user.email ?? ""} />
          </div>

          <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">
              Authentication
            </h2>
            <p className="text-sm text-gray-500">
              Your account uses OAuth authentication (Google, GitHub). Password management is handled by your OAuth provider.
            </p>
          </div>
        </div>

        <div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Profile Picture
            </h2>
            <ProfileAvatarForm
              currentImage={user.image ?? null}
              userName={user.name || user.email || "User"}
            />
          </div>

          <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Account Info
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Account ID</dt>
                <dd className="font-mono text-sm text-gray-900">{user._id}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Member Since</dt>
                <dd className="text-sm text-gray-900">
                  {user._creationTime
                    ? new Date(user._creationTime).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "N/A"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Email Status</dt>
                <dd>
                  {isEmailVerified ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                      Not Verified
                    </span>
                  )}
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
  );
}
