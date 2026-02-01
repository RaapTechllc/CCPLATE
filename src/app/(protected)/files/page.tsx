import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getUserFiles } from "@/lib/services/file-service";
import { FilesTable } from "@/components/features/files/files-table";
import { FileUploadSection } from "@/components/features/files/file-upload-section";

// Force dynamic rendering - this page uses auth
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Files | CCPLATE",
  description: "Manage your uploaded files",
};

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function FilesPage({ searchParams }: Props) {
  const { authenticated, user, convex } = await requireAuth();

  if (!authenticated || !user || !convex) {
    redirect("/login");
  }

  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);

  const { files, pagination } = await getUserFiles(convex, {
    page,
    limit: 20,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Files</h1>
        <p className="mt-2 text-gray-600">
          Manage your uploaded files and documents.
        </p>
      </div>

      <FileUploadSection />

      <div className="mt-8">
        <FilesTable files={files} pagination={pagination} currentPage={page} />
      </div>
    </div>
  );
}
