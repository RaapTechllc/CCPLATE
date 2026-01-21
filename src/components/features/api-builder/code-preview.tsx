"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import type { GeneratedFiles } from "@/lib/api-builder";

interface CodePreviewProps {
  files: GeneratedFiles | null;
  onApply: () => void;
  isApplying?: boolean;
  existingFiles?: string[];
}

export function CodePreview({ files, onApply, isApplying, existingFiles = [] }: CodePreviewProps) {
  const [activeTab, setActiveTab] = useState<"route" | "dynamic">("route");
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  if (!files) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <p>Generate an API to see the code</p>
      </div>
    );
  }

  const handleCopy = async (content: string, file: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedFile(file);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const hasExistingFiles = existingFiles.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("route")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "route"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            route.ts
          </button>
          {files.dynamicRouteContent && (
            <button
              type="button"
              onClick={() => setActiveTab("dynamic")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "dynamic"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              [id]/route.ts
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            handleCopy(
              activeTab === "route"
                ? files.routeContent
                : files.dynamicRouteContent || "",
              activeTab
            )
          }
        >
          {copiedFile === activeTab ? "Copied!" : "Copy"}
        </Button>
      </div>

      <div className="space-y-2">
        <p className="font-mono text-sm text-muted-foreground">
          {activeTab === "route" ? files.routePath : files.dynamicRoutePath}
        </p>
        <div className="max-h-96 overflow-auto">
          <CodeBlock 
            code={activeTab === "route" ? files.routeContent : files.dynamicRouteContent || ""} 
            language="typescript" 
          />
        </div>
      </div>

      {hasExistingFiles && (
        <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3">
          <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
            ⚠️ The following files already exist and will be overwritten:
          </p>
          <ul className="mt-1 list-inside list-disc text-sm text-yellow-600/80 dark:text-yellow-400/80">
            {existingFiles.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
        </div>
      )}

      <Button
        className="w-full"
        onClick={onApply}
        disabled={isApplying}
        variant={hasExistingFiles ? "destructive" : "default"}
      >
        {isApplying
          ? "Applying..."
          : hasExistingFiles
          ? "Overwrite & Apply"
          : "Apply - Write Files"}
      </Button>
    </div>
  );
}
