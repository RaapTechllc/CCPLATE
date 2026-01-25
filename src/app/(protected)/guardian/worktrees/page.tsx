import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getWorktrees } from "./actions";
import { WorktreesClient } from "./worktrees-client";

// Force dynamic rendering - this page uses auth
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Worktrees | CCPLATE Guardian",
  description: "Manage git worktrees for parallel development",
};

export default async function WorktreesPage() {
  const { authenticated } = await requireAuth();

  if (!authenticated) {
    redirect("/login");
  }

  const worktrees = await getWorktrees();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Git Worktrees</h1>
        <p className="mt-2 text-gray-600">
          Manage worktrees for parallel development tasks.
        </p>
      </div>

      <WorktreesClient initialWorktrees={worktrees} />
    </div>
  );
}
