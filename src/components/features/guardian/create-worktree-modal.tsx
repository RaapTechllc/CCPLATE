"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateWorktreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskId: string, agent: string) => Promise<void>;
}

const AGENTS = ["architect", "implementer", "reviewer", "tester", "documenter"];

export function CreateWorktreeModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateWorktreeModalProps) {
  const [taskId, setTaskId] = useState("");
  const [agent, setAgent] = useState(AGENTS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!taskId.trim()) {
      setError("Task ID is required");
      return;
    }

    if (!taskId.match(/^[a-zA-Z0-9_-]+$/)) {
      setError("Task ID can only contain letters, numbers, hyphens, and underscores");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(taskId, agent);
      setTaskId("");
      setAgent(AGENTS[0]);
      onClose();
    } catch {
      setError("Failed to create worktree");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold">Create Worktree</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="taskId">Task ID</Label>
            <Input
              id="taskId"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              placeholder="e.g., feature-123"
              error={!!error}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent">Assign Agent</Label>
            <select
              id="agent"
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {AGENTS.map((a) => (
                <option key={a} value={a}>
                  {a.charAt(0).toUpperCase() + a.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
