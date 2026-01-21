"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";

interface ModelPreviewProps {
  modelCode: string | null;
  onApply: () => void;
  isApplying: boolean;
}

export function ModelPreview({ modelCode, onApply, isApplying }: ModelPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!modelCode) return;

    await navigator.clipboard.writeText(modelCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!modelCode) {
    return (
      <div className="flex items-center justify-center h-[200px] text-zinc-400 dark:text-zinc-500">
        <p>Generated model will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <CodeBlock code={modelCode} language="prisma" />
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 px-2 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={onApply}
          disabled={isApplying}
          className="flex-1"
        >
          {isApplying ? (
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
              Applying...
            </>
          ) : (
            "Apply to Schema"
          )}
        </Button>
        <Button variant="outline" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy Code"}
        </Button>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        ⚠️ This will modify your prisma/schema.prisma file. A backup will be created automatically.
      </p>
    </div>
  );
}
