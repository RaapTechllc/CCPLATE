"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import type { HookBuilderOutput } from "@/lib/hook-builder";

interface HookPreviewProps {
  output: HookBuilderOutput | null;
}

export function HookPreview({ output }: HookPreviewProps) {
  const [showSpec, setShowSpec] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!output) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>Generate a hook to see the preview</p>
      </div>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([output.code], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = output.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{output.spec.name}</h3>
          <p className="text-sm text-muted-foreground">{output.filename}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            Download
          </Button>
        </div>
      </div>

      <CodeBlock code={output.code} language="typescript" />

      <div>
        <button
          type="button"
          onClick={() => setShowSpec(!showSpec)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <svg
            className={`h-4 w-4 transition-transform ${showSpec ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          {showSpec ? "Hide" : "Show"} Hook Spec (JSON)
        </button>

        {showSpec && (
          <div className="mt-2">
            <CodeBlock code={JSON.stringify(output.spec, null, 2)} language="json" />
          </div>
        )}
      </div>
    </div>
  );
}
