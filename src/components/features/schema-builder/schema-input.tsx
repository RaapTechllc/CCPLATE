"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getExampleDescriptions } from "@/lib/schema-builder";

interface SchemaInputProps {
  onGenerate: (description: string) => void;
  isLoading: boolean;
}

export function SchemaInput({ onGenerate, isLoading }: SchemaInputProps) {
  const [description, setDescription] = useState("");
  const examples = getExampleDescriptions();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      onGenerate(description.trim());
    }
  };

  const handleExampleClick = (example: string) => {
    setDescription(example);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
        >
          Describe the model you need
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., A blog post with title, content, published status, and author relationship"
          className="w-full min-h-[120px] px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-y"
          disabled={isLoading}
        />
      </div>

      <div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
          Try an example:
        </p>
        <div className="flex flex-wrap gap-2">
          {examples.slice(0, 4).map((example, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleExampleClick(example)}
              className="text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors truncate max-w-[200px]"
              disabled={isLoading}
            >
              {example.slice(0, 40)}...
            </button>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        disabled={!description.trim() || isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Generating...
          </>
        ) : (
          "Generate Model"
        )}
      </Button>
    </form>
  );
}
