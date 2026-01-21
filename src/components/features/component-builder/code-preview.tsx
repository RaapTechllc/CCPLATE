"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import type { ComponentBuilderOutput } from "@/lib/component-builder";

interface CodePreviewProps {
  output: ComponentBuilderOutput | null;
  onApply?: (output: ComponentBuilderOutput) => void;
  isApplying?: boolean;
}

export function CodePreview({ output, onApply, isApplying }: CodePreviewProps) {
  const [copied, setCopied] = useState(false);

  if (!output) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <p>Generate a component to see the preview</p>
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
          <p className="text-sm text-muted-foreground">{output.suggestedPath}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            Download
          </Button>
          {onApply && (
            <Button
              size="sm"
              onClick={() => onApply(output)}
              disabled={isApplying}
            >
              {isApplying ? "Applying..." : "Apply"}
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
          {output.template}
        </span>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
          {output.spec.type}
        </span>
        {output.spec.features.map((feature) => (
          <span
            key={feature}
            className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300"
          >
            {feature}
          </span>
        ))}
      </div>

      <div className="relative">
        <div className="absolute right-2 top-2 z-10 text-xs text-zinc-500">
          {output.filename}
        </div>
        <CodeBlock code={output.code} language="tsx" className="pt-8" />
      </div>
    </div>
  );
}
