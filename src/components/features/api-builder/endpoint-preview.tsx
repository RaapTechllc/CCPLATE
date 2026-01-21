"use client";

import type { APISpec, Endpoint } from "@/lib/api-builder";

interface EndpointPreviewProps {
  spec: APISpec | null;
}

const methodColors: Record<string, string> = {
  GET: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  POST: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PUT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  PATCH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function EndpointPreview({ spec }: EndpointPreviewProps) {
  if (!spec) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        <p>Generate an API to see endpoints</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{spec.name}</h3>
        <span className="text-sm text-muted-foreground">{spec.model} model</span>
      </div>

      <div className="space-y-2">
        {spec.endpoints.map((endpoint, i) => (
          <EndpointItem key={i} endpoint={endpoint} />
        ))}
      </div>
    </div>
  );
}

function EndpointItem({ endpoint }: { endpoint: Endpoint }) {
  return (
    <div className="flex items-center gap-3 rounded-md border px-3 py-2">
      <span
        className={`rounded px-2 py-0.5 text-xs font-semibold ${
          methodColors[endpoint.method]
        }`}
      >
        {endpoint.method}
      </span>
      <span className="flex-1 font-mono text-sm">{endpoint.path}</span>
      {endpoint.auth !== "none" && (
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {endpoint.auth === "admin" ? "🔐 Admin" : "🔒 Auth"}
        </span>
      )}
      {endpoint.pagination && (
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          📄 Paginated
        </span>
      )}
    </div>
  );
}
