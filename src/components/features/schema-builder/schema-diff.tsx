"use client";

interface SchemaDiffProps {
  diff: string | null;
}

export function SchemaDiff({ diff }: SchemaDiffProps) {
  if (!diff) {
    return (
      <div className="flex items-center justify-center h-[150px] text-zinc-400 dark:text-zinc-500">
        <p>Preview diff will appear here</p>
      </div>
    );
  }

  const lines = diff.split("\n");

  return (
    <div className="rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700">
      <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Changes Preview
      </div>
      <pre className="p-4 bg-zinc-50 dark:bg-zinc-900 overflow-x-auto text-sm font-mono">
        {lines.map((line, i) => {
          let className = "text-zinc-600 dark:text-zinc-400";

          if (line.startsWith("+") && !line.startsWith("+++")) {
            className = "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
          } else if (line.startsWith("-") && !line.startsWith("---")) {
            className = "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20";
          } else if (line.startsWith("@@")) {
            className = "text-blue-600 dark:text-blue-400";
          }

          return (
            <div key={i} className={className}>
              {line}
            </div>
          );
        })}
      </pre>
    </div>
  );
}
