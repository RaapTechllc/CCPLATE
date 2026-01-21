import type { ComponentSpec } from "../spec";

export function dataTableTemplate(spec: ComponentSpec): string {
  const isClient = spec.type === "client";
  const hasSort = spec.features.includes("sorting");
  const hasPagination = spec.features.includes("pagination");
  const hasSearch = spec.features.includes("search");

  const imports = [
    isClient ? '"use client";\n' : "",
    'import { cn } from "@/lib/utils";',
    isClient && (hasSort || hasPagination || hasSearch) ? 'import { useState } from "react";' : "",
    spec.features.includes("loading-state") ? 'import { Spinner } from "@/components/ui/spinner";' : "",
  ].filter(Boolean).join("\n");

  const stateLines = [
    hasSearch ? '  const [searchQuery, setSearchQuery] = useState("");' : "",
    hasPagination ? "  const [page, setPage] = useState(1);" : "",
    hasSort ? '  const [sortColumn, setSortColumn] = useState<string | null>(null);' : "",
    hasSort ? '  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");' : "",
    spec.features.includes("loading-state") ? "  const [isLoading, setIsLoading] = useState(false);" : "",
    spec.features.includes("error-state") ? "  const [error, setError] = useState<Error | null>(null);" : "",
  ].filter(Boolean).join("\n");

  return `${imports}

interface Column<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface ${spec.name}Props<T> {
  data: T[];
  columns: Column<T>[];
  className?: string;
${hasPagination ? "  pageSize?: number;\n" : ""}${spec.hasChildren ? "  children?: React.ReactNode;\n" : ""}}

export function ${spec.name}<T extends Record<string, unknown>>({
  data,
  columns,
  className,
${hasPagination ? "  pageSize = 10,\n" : ""}${spec.hasChildren ? "  children,\n" : ""}}: ${spec.name}Props<T>) {
${stateLines}
${spec.features.includes("loading-state") ? `
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }
` : ""}${spec.features.includes("error-state") ? `
  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        Error: {error.message}
      </div>
    );
  }
` : ""}${spec.features.includes("empty-state") ? `
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        No data available
      </div>
    );
  }
` : ""}
${hasSearch ? `  const filteredData = data.filter((row) =>
    Object.values(row).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
` : "  const filteredData = data;"}
${hasSort ? `  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    const modifier = sortDirection === "asc" ? 1 : -1;
    if (aVal < bVal) return -1 * modifier;
    if (aVal > bVal) return 1 * modifier;
    return 0;
  });
` : "  const sortedData = filteredData;"}
${hasPagination ? `  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice((page - 1) * pageSize, page * pageSize);
` : "  const paginatedData = sortedData;"}
  const handleSort = (column: keyof T) => {
${hasSort ? `    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column as string);
      setSortDirection("asc");
    }` : "    // Sorting not enabled"}
  };

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
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    "px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-300",
                    column.sortable && "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
${hasSort ? `                    {column.sortable && sortColumn === column.key && (
                      <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}` : ""}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-t border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-4 py-3">
                    {column.render
                      ? column.render(row[column.key], row)
                      : String(row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    </div>
  );
}
`;
}
