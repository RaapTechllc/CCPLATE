"use client";

import { useState } from "react";
import type { ComponentSpec } from "@/lib/component-builder";

interface PropsPreviewProps {
  spec: ComponentSpec | null;
}

export function PropsPreview({ spec }: PropsPreviewProps) {
  const [showJson, setShowJson] = useState(false);

  if (!spec) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Props Interface</h4>
        <button
          type="button"
          onClick={() => setShowJson(!showJson)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {showJson ? "Hide JSON" : "Show JSON"}
        </button>
      </div>

      {spec.props.length > 0 ? (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Required</th>
                <th className="px-3 py-2 text-left font-medium">Default</th>
              </tr>
            </thead>
            <tbody>
              {spec.props.map((prop) => (
                <tr key={prop.name} className="border-t">
                  <td className="px-3 py-2 font-mono text-sm">{prop.name}</td>
                  <td className="px-3 py-2 font-mono text-sm text-blue-600 dark:text-blue-400">
                    {prop.type}
                  </td>
                  <td className="px-3 py-2">
                    {prop.required ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-zinc-400">No</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-sm text-zinc-500">
                    {prop.defaultValue || "-"}
                  </td>
                </tr>
              ))}
              {spec.hasChildren && (
                <tr className="border-t">
                  <td className="px-3 py-2 font-mono text-sm">children</td>
                  <td className="px-3 py-2 font-mono text-sm text-blue-600 dark:text-blue-400">
                    React.ReactNode
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-zinc-400">No</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-sm text-zinc-500">-</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {spec.hasChildren
            ? "This component accepts children but has no other props."
            : "This component has no props."}
        </p>
      )}

      {showJson && (
        <div className="rounded-md border bg-zinc-950 dark:bg-zinc-900">
          <pre className="overflow-x-auto p-4 text-sm text-zinc-100">
            <code>{JSON.stringify(spec, null, 2)}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
