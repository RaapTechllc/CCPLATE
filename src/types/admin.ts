// Admin dashboard statistics
export interface DashboardStats {
  totalUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  activeUsers: number;
  totalFiles: number;
  storageUsed: number; // bytes
}

// User list query parameters
export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: "USER" | "ADMIN";
  status?: "active" | "deleted";
  sortBy?: "createdAt" | "name" | "email" | "lastLoginAt";
  sortOrder?: "asc" | "desc";
}

// User details for admin view
export interface UserDetails {
  id: string;
  name: string | null;
  email: string;
  emailVerified: string | null;
  image: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  lastLoginAt: string | null;
  _count?: {
    files: number;
    sessions: number;
  };
}

// User update request
export interface UserUpdateRequest {
  name?: string;
  email?: string;
  role?: "USER" | "ADMIN";
  image?: string;
}

// Paginated users response
export interface PaginatedUsers {
  users: UserDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Impersonation token response
export interface ImpersonationResponse {
  token: string;
  expiresAt: string;
  userId: string;
}

// Activity log entry (future use)
export interface ActivityLogEntry {
  id: string;
  action: string;
  userId: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
