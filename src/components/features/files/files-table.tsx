"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/toast";
import type { FileResponse } from "@/types/file";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FilesTableProps {
  files: FileResponse[];
  pagination: Pagination;
  currentPage: number;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎥";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("document") || mimeType.includes("word")) return "📝";
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return "📦";
  return "📁";
}

export function FilesTable({ files, pagination, currentPage }: FilesTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) {
      return;
    }

    setDeletingId(fileId);

    try {
      const response = await fetch(`/api/uploads/${fileId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showToast.success("File deleted successfully");
        router.refresh();
      } else {
        const data = await response.json();
        showToast.error(data.error || "Failed to delete file");
      }
    } catch {
      showToast.error("Failed to delete file");
    } finally {
      setDeletingId(null);
    }
  };

  if (files.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-12 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="h-8 w-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">No files yet</h3>
        <p className="mt-2 text-sm text-gray-500">
          Upload your first file using the upload section above.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                File
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Uploaded
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {files.map((file) => (
              <tr key={file.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getFileIcon(file.mimeType)}</span>
                    <div>
                      <div className="font-medium text-gray-900 max-w-xs truncate">
                        {file.originalName}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {file.id.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {file.mimeType.split("/")[1]?.toUpperCase() || file.mimeType}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {formatFileSize(file.size)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {formatDate(file.createdAt)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded px-2 py-1 text-blue-600 hover:bg-blue-50"
                    >
                      View
                    </a>
                    <button
                      onClick={() => handleDelete(file.id)}
                      disabled={deletingId === file.id}
                      className="rounded px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === file.id ? "..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-6 py-3">
          <div className="text-sm text-gray-500">
            Showing {(currentPage - 1) * pagination.limit + 1} to{" "}
            {Math.min(currentPage * pagination.limit, pagination.total)} of{" "}
            {pagination.total} files
          </div>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={`/files?page=${currentPage - 1}`}
                className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            {currentPage < pagination.totalPages && (
              <Link
                href={`/files?page=${currentPage + 1}`}
                className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
