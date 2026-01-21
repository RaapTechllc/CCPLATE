import { prisma } from "@/lib/db";

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

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [filesData, user] = await Promise.all([
    prisma.file.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        size: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    }),
  ]);

  const totalFiles = filesData.length;
  const storageUsedBytes = filesData.reduce((sum, file) => sum + file.size, 0);
  const recentFiles = filesData.slice(0, 5);
  const memberSince = user?.createdAt || new Date();

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
