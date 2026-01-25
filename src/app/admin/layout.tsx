import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

// Force dynamic rendering - admin pages use auth
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { authenticated, user } = await requireAuth();

  // Redirect unauthenticated users to login
  if (!authenticated || !user) {
    redirect("/login");
  }

  // Check for admin role - redirect non-admins to dashboard
  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Header */}
        <AdminHeader user={{ name: user.name ?? null, email: user.email ?? "", image: user.image ?? null }} />

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
