import type { ComponentSpec } from "../spec";

export function listTemplate(spec: ComponentSpec): string {
  const isClient = spec.type === "client";
  const hasSearch = spec.features.includes("search");
  const hasPagination = spec.features.includes("pagination");
  const hasLoadingState = spec.features.includes("loading-state");
  const hasErrorState = spec.features.includes("error-state");
  const hasEmptyState = spec.features.includes("empty-state");
  const hasAnimations = spec.features.includes("animations");

  const imports = [
    isClient ? '"use client";\n' : "",
    'import { cn } from "@/lib/utils";',
    isClient && (hasSearch || hasPagination) ? 'import { useState } from "react";' : "",
    hasLoadingState ? 'import { Spinner } from "@/components/ui/spinner";' : "",
  ].filter(Boolean).join("\n");

  const stateLines = [
    hasSearch ? '  const [searchQuery, setSearchQuery] = useState("");' : "",
    hasPagination ? "  const [page, setPage] = useState(1);" : "",
    hasLoadingState && !spec.props.find((p) => p.name === "isLoading") ? "  const [isLoading, setIsLoading] = useState(false);" : "",
    hasErrorState && !spec.props.find((p) => p.name === "error") ? "  const [error, setError] = useState<Error | null>(null);" : "",
  ].filter(Boolean).join("\n");

  return `${imports}

interface ${spec.name}Item {
  id: string | number;
  [key: string]: unknown;
}

interface ${spec.name}Props<T extends ${spec.name}Item> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  itemClassName?: string;
${hasLoadingState ? "  isLoading?: boolean;\n" : ""}${hasErrorState ? "  error?: Error | null;\n" : ""}${hasPagination ? "  pageSize?: number;\n" : ""}${spec.hasChildren ? "  children?: React.ReactNode;\n" : ""}}

export function ${spec.name}<T extends ${spec.name}Item>({
  items,
  renderItem,
  className,
  itemClassName,
${hasLoadingState ? "  isLoading,\n" : ""}${hasErrorState ? "  error,\n" : ""}${hasPagination ? "  pageSize = 10,\n" : ""}${spec.hasChildren ? "  children,\n" : ""}}: ${spec.name}Props<T>) {
${stateLines}
${hasLoadingState ? `
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }
` : ""}${hasErrorState ? `
  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        Error: {error.message}
      </div>
    );
  }
` : ""}${hasEmptyState ? `
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        No items to display
      </div>
    );
  }
` : ""}
${hasSearch ? `  const filteredItems = items.filter((item) =>
    Object.values(item).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
` : "  const filteredItems = items;"}
${hasPagination ? `  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);
` : "  const paginatedItems = filteredItems;"}

  return (
    <div className={cn("w-full", className)}>
${hasSearch ? `      <div className="mb-4">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
        />
      </div>
` : ""}
      <ul className="space-y-2">
        {paginatedItems.map((item, index) => (
          <li
            key={item.id}
            className={cn(
              "rounded-md border p-3${hasAnimations ? " transition-all duration-200 hover:shadow-md" : ""}",
              itemClassName
            )}
          >
            {renderItem(item, index)}
          </li>
        ))}
      </ul>
${hasPagination ? `
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>` : ""}
${spec.hasChildren ? "\n      {children}" : ""}
    </div>
  );
}
`;
}
