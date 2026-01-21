"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { WorktreeCard } from "@/components/features/guardian/worktree-card";
import { CreateWorktreeModal } from "@/components/features/guardian/create-worktree-modal";
import { ConfirmDialog } from "@/components/features/guardian/confirm-dialog";
import { createWorktree, cleanupWorktree } from "./actions";
import type { Worktree } from "@/types/worktree";

interface WorktreesClientProps {
  initialWorktrees: Worktree[];
}

export function WorktreesClient({ initialWorktrees }: WorktreesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [worktrees, setWorktrees] = useState(initialWorktrees);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [cleanupTarget, setCleanupTarget] = useState<string | null>(null);
  const [cleaningUp, setCleaningUp] = useState<string | null>(null);

  const handleCreateWorktree = async (taskId: string, agent: string) => {
    const result = await createWorktree(taskId, agent);
    if (result.success && result.worktree) {
      setWorktrees((prev) => [...prev, result.worktree!]);
      startTransition(() => router.refresh());
    } else {
      throw new Error(result.error);
    }
  };

  const handleCleanupWorktree = async () => {
    if (!cleanupTarget) return;

    setCleaningUp(cleanupTarget);
    const result = await cleanupWorktree(cleanupTarget);
    if (result.success) {
      setWorktrees((prev) => prev.filter((wt) => wt.task_id !== cleanupTarget));
      startTransition(() => router.refresh());
    }
    setCleaningUp(null);
    setCleanupTarget(null);
  };

  const activeCount = worktrees.filter((wt) => wt.status === "active").length;
  const staleCount = worktrees.filter((wt) => wt.status === "stale").length;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            Active: {activeCount}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
            Stale: {staleCount}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
            Total: {worktrees.length}
          </span>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          Create Worktree
        </Button>
      </div>

      {worktrees.length === 0 ? (
        <div className="rounded-lg border bg-gray-50 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No worktrees yet
          </h3>
          <p className="mt-2 text-gray-500">
            Create a worktree to start parallel development on a task.
          </p>
          <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
            Create First Worktree
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {worktrees.map((worktree) => (
            <WorktreeCard
              key={worktree.task_id}
              worktree={worktree}
              onCleanup={(taskId) => setCleanupTarget(taskId)}
              isLoading={cleaningUp === worktree.task_id || isPending}
            />
          ))}
        </div>
      )}

      <CreateWorktreeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateWorktree}
      />

      <ConfirmDialog
        isOpen={!!cleanupTarget}
        title="Cleanup Worktree"
        message={`Are you sure you want to remove the worktree for "${cleanupTarget}"? This will delete the worktree directory and branch.`}
        confirmLabel="Cleanup"
        onConfirm={handleCleanupWorktree}
        onCancel={() => setCleanupTarget(null)}
        isLoading={!!cleaningUp}
      />
    </>
  );
}
