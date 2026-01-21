"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UsersTable } from "@/components/admin/users-table";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { showToast } from "@/lib/toast";

type RoleFilter = "USER" | "ADMIN" | "";
type StatusFilter = "active" | "deleted" | "";

export default function AdminUsersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");

  const { users, pagination, loading, error, setQuery, query, refresh } =
    useAdminUsers();

  const handleSearch = () => {
    setQuery({
      search: searchInput || undefined,
      role: roleFilter || undefined,
      status: statusFilter || undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setRoleFilter("");
    setStatusFilter("");
    setQuery({
      search: undefined,
      role: undefined,
      status: undefined,
    });
  };

  const handlePageChange = (page: number) => {
    setQuery({ ...query, page });
  };

  const handleRefresh = async () => {
    try {
      await refresh();
      showToast.success("Users refreshed");
    } catch {
      showToast.error("Failed to refresh users");
    }
  };

  const hasActiveFilters = searchInput || roleFilter || statusFilter;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Users
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage user accounts and permissions
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </Button>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {/* Search Input */}
            <div className="flex-1 space-y-2">
              <label
                htmlFor="search"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Search
              </label>
              <Input
                id="search"
                type="text"
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* Role Filter */}
            <div className="w-full space-y-2 sm:w-40">
              <label
                htmlFor="role"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Role
              </label>
              <select
                id="role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">All Roles</option>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-full space-y-2 sm:w-40">
              <label
                htmlFor="status"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Status
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={handleSearch}>Apply</Button>
              {hasActiveFilters && (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <UsersTable users={users} loading={loading} />
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6 rounded-lg">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Showing{" "}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}
                </span>{" "}
                of <span className="font-medium">{pagination.total}</span>{" "}
                results
              </p>
            </div>
            <div>
              <nav
                className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                aria-label="Pagination"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="rounded-r-none"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </Button>
                {Array.from(
                  { length: Math.min(5, pagination.totalPages) },
                  (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={
                          pagination.page === pageNum ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="rounded-none"
                      >
                        {pageNum}
                      </Button>
                    );
                  }
                )}
                {pagination.totalPages > 5 && (
                  <>
                    <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      ...
                    </span>
                    <Button
                      variant={
                        pagination.page === pagination.totalPages
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => handlePageChange(pagination.totalPages)}
                      className="rounded-none"
                    >
                      {pagination.totalPages}
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="rounded-l-none"
                >
                  <svg
                    className="h-4 w-4"
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
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
