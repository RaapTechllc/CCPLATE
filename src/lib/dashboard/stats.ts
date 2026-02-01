import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";

interface DashboardStats {
  totalFiles: number;
  storageUsedBytes: number;
  recentFiles: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    createdAt: Date;
  }>;
  memberSince: Date;
}

type FileDoc = Doc<"files">;
type UserDoc = Doc<"users">;

export async function getDashboardStats(
  client: ConvexHttpClient
): Promise<DashboardStats> {
  const [filesData, user] = (await Promise.all([
    client.query(api.files.getFiles, { includeDeleted: false }),
    client.query(api.users.getCurrentUser, {}),
  ])) as [FileDoc[], UserDoc | null];

  const totalFiles = filesData.length;
  const storageUsedBytes = filesData.reduce((sum, file) => sum + file.size, 0);
  const recentFiles = filesData.slice(0, 5).map((file) => ({
    id: file._id,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    createdAt: new Date(file.createdAt ?? file._creationTime),
  }));
  const memberSince = new Date(
    user?.createdAt ?? user?._creationTime ?? Date.now()
  );

  return {
    totalFiles,
    storageUsedBytes,
    recentFiles,
    memberSince,
  };
}

export function formatStorageSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
