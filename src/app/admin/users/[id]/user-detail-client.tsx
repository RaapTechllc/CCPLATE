"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserForm } from "@/components/admin/user-form";
import { useUserMutations } from "@/hooks/use-admin-users";
import { showToast } from "@/lib/toast";
import type { UserDetails, UserUpdateRequest } from "@/types/admin";

interface UserDetailClientProps {
  user: UserDetails;
}

export function UserDetailClient({ user: initialUser }: UserDetailClientProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserDetails>(initialUser);
  const { updateUser, deleteUser, restoreUser, loading } = useUserMutations();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleSubmit = async (data: UserUpdateRequest) => {
    try {
      const updatedUser = await updateUser(user.id, data);
      setUser(updatedUser);
      showToast.success("User updated successfully");
      router.refresh();
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : "Failed to update user"
      );
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action can be undone."
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteUser(user.id);
      showToast.success("User deleted successfully");
      router.refresh();
      router.push("/admin/users");
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : "Failed to delete user"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsRestoring(true);
      await restoreUser(user.id);
      showToast.success("User restored successfully");
      router.refresh();
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : "Failed to restore user"
      );
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Edit Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Edit User</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm user={user} onSubmit={handleSubmit} loading={loading} />
        </CardContent>
      </Card>

      {/* Danger Zone Card */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user.deletedAt ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                This user has been soft-deleted. You can restore their account
                to make it active again.
              </p>
              <Button
                variant="outline"
                onClick={handleRestore}
                loading={isRestoring}
                className="border-green-600 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20"
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Restore User
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Deleting a user will soft-delete their account. They will no
                longer be able to log in, but their data will be preserved. This
                action can be undone.
              </p>
              <Button
                variant="destructive"
                onClick={handleDelete}
                loading={isDeleting}
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete User
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
