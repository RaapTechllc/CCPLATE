"use client";

import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/ui/file-upload";
import { showToast } from "@/lib/toast";

export function FileUploadSection() {
  const router = useRouter();

  const handleUpload = async (files: File[]) => {
    const formData = new FormData();

    if (files.length === 1) {
      formData.append("file", files[0]);
    } else {
      files.forEach((file) => {
        formData.append("files", file);
      });
    }

    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        showToast.success(
          files.length === 1
            ? "File uploaded successfully"
            : `${files.length} files uploaded successfully`
        );
        router.refresh();
      } else {
        const data = await response.json();
        showToast.error(data.error || "Failed to upload file");
      }
    } catch {
      showToast.error("Failed to upload file");
    }
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Upload Files</h2>
      <FileUpload
        onUpload={handleUpload}
        maxFiles={10}
        maxSize={10 * 1024 * 1024}
      />
    </div>
  );
}
