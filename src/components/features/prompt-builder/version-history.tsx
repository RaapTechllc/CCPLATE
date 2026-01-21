"use client";

import { Button } from "@/components/ui/button";
import type { PromptVersion } from "@/lib/prompt-builder";

interface VersionHistoryProps {
  versions: PromptVersion[];
  currentVersion: number;
  onSelectVersion: (version: number) => void;
  onRestoreVersion: (version: number) => void;
}

export function VersionHistory({
  versions,
  currentVersion,
  onSelectVersion,
  onRestoreVersion,
}: VersionHistoryProps) {
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Version History</h3>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sortedVersions.map((version) => (
          <div
            key={version.id}
            className={`p-3 border rounded-md cursor-pointer transition-colors ${
              version.version === currentVersion
                ? "border-primary bg-primary/5"
                : "hover:bg-muted/50"
            }`}
            onClick={() => onSelectVersion(version.version)}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">
                v{version.version}
                {version.version === currentVersion && (
                  <span className="ml-2 text-xs text-primary">(current)</span>
                )}
              </span>
              {version.version !== currentVersion && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestoreVersion(version.version);
                  }}
                  className="h-6 px-2 text-xs"
                >
                  Restore
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(version.createdAt).toLocaleString()}
            </p>
            {version.notes && (
              <p className="text-xs text-muted-foreground mt-1 italic">
                {version.notes}
              </p>
            )}
            {version.model && (
              <p className="text-xs text-muted-foreground mt-1">
                Model: {version.model}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
