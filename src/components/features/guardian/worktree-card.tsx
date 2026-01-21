"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Worktree, WorktreeStatus } from "@/types/worktree";

interface WorktreeCardProps {
  worktree: Worktree;
  onCleanup: (taskId: string) => void;
  isLoading?: boolean;
}

const statusConfig: Record<WorktreeStatus, { color: string; label: string }> = {
  active: { color: "bg-green-500", label: "Active" },
  completed: { color: "bg-blue-500", label: "Completed" },
  stale: { color: "bg-yellow-500", label: "Stale" },
  missing: { color: "bg-red-500", label: "Missing" },
};

export function WorktreeCard({ worktree, onCleanup, isLoading }: WorktreeCardProps) {
  const status = statusConfig[worktree.status];
  const createdDate = new Date(worktree.created_at).toLocaleString();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{worktree.task_id}</CardTitle>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${status.color}`} />
            <span className="text-sm text-muted-foreground">{status.label}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <span className="font-mono text-muted-foreground">{worktree.branch}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <span className="truncate text-muted-foreground" title={worktree.path}>
            {worktree.path}
          </span>
        </div>

        {worktree.agent && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {worktree.agent}
            </span>
          </div>
        )}

        <div className="text-xs text-muted-foreground">Created: {createdDate}</div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`vscode://file${worktree.path}`, "_blank")}
          >
            Open in VS Code
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onCleanup(worktree.task_id)}
            loading={isLoading}
          >
            Cleanup
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
