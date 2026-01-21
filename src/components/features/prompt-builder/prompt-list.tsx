"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Prompt } from "@/lib/prompt-builder";

interface PromptListProps {
  prompts: Prompt[];
  onDelete: (id: string) => void;
  onCreate: () => void;
}

export function PromptList({ prompts, onDelete, onCreate }: PromptListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prompt?")) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const groupedPrompts = prompts.reduce(
    (acc, prompt) => {
      const category = prompt.category || "general";
      if (!acc[category]) acc[category] = [];
      acc[category].push(prompt);
      return acc;
    },
    {} as Record<string, Prompt[]>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prompt Builder</h1>
        <Button onClick={onCreate}>Create Prompt</Button>
      </div>

      {prompts.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No prompts yet</p>
          <Button onClick={onCreate}>Create your first prompt</Button>
        </Card>
      ) : (
        Object.entries(groupedPrompts).map(([category, categoryPrompts]) => (
          <div key={category}>
            <h2 className="text-lg font-semibold mb-3 capitalize">{category}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryPrompts.map((prompt) => (
                <Card key={prompt.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/prompt-builder/${prompt.id}`}
                        className="font-medium hover:underline block truncate"
                      >
                        {prompt.name}
                      </Link>
                      {prompt.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {prompt.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        v{prompt.currentVersion} • Updated{" "}
                        {new Date(prompt.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(prompt.id)}
                      disabled={deletingId === prompt.id}
                      className="text-destructive hover:text-destructive"
                    >
                      {deletingId === prompt.id ? "..." : "Delete"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
