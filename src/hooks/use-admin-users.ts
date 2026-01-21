"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  UserDetails,
  PaginatedUsers,
  UserListQuery,
  UserUpdateRequest,
} from "@/types/admin";

interface UseAdminUsersResult {
  users: UserDetails[];
  pagination: PaginatedUsers["pagination"] | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setQuery: (query: Partial<UserListQuery>) => void;
  query: UserListQuery;
}

interface UseAdminUserResult {
  user: UserDetails | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseUserMutationsResult {
  updateUser: (id: string, data: UserUpdateRequest) => Promise<UserDetails>;
  deleteUser: (id: string) => Promise<void>;
  restoreUser: (id: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const defaultQuery: UserListQuery = {
  page: 1,
  limit: 20,
  sortBy: "createdAt",
  sortOrder: "desc",
};

export function useAdminUsers(
  initialQuery: Partial<UserListQuery> = {}
): UseAdminUsersResult {
  const [users, setUsers] = useState<UserDetails[]>([]);
  const [pagination, setPagination] =
    useState<PaginatedUsers["pagination"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQueryState] = useState<UserListQuery>({
    ...defaultQuery,
    ...initialQuery,
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (query.page) params.set("page", String(query.page));
      if (query.limit) params.set("limit", String(query.limit));
      if (query.search) params.set("search", query.search);
      if (query.role) params.set("role", query.role);
      if (query.status) params.set("status", query.status);
      if (query.sortBy) params.set("sortBy", query.sortBy);
      if (query.sortOrder) params.set("sortOrder", query.sortOrder);

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to fetch users");
      }

      setUsers(data.data.users);
      setPagination(data.data.pagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const setQuery = useCallback((newQuery: Partial<UserListQuery>) => {
    setQueryState((prev) => ({
      ...prev,
      ...newQuery,
      // Reset to page 1 when filters change (except when changing page)
      page: newQuery.page ?? 1,
    }));
  }, []);

  return {
    users,
    pagination,
    loading,
    error,
    refresh: fetchUsers,
    setQuery,
    query,
  };
}

export function useAdminUser(userId: string | null): UseAdminUserResult {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!userId) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/users/${userId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to fetch user");
      }

      setUser(data.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    user,
    loading,
    error,
    refresh: fetchUser,
  };
}

export function useUserMutations(): UseUserMutationsResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateUser = useCallback(
    async (id: string, data: UserUpdateRequest): Promise<UserDetails> => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/admin/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error?.message || "Failed to update user");
        }

        return result.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An error occurred";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteUser = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to delete user");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const restoreUser = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/users/${id}/restore`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to restore user");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    updateUser,
    deleteUser,
    restoreUser,
    loading,
    error,
  };
}
