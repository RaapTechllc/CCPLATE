import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  APISpecSchema,
  generateFiles,
  writeAPIFiles,
  checkFilesExist,
} from "@/lib/api-builder";

const applyRequestSchema = z.object({
  spec: APISpecSchema,
  overwrite: z.boolean().default(false),
});

function isValidBasePath(basePath: string): boolean {
  if (!basePath.startsWith("/api/")) return false;
  if (basePath.includes("..") || basePath.includes("\\")) return false;
  if (basePath.includes("//")) return false;
  return /^\/api\/[a-z0-9\-/_]+$/.test(basePath);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = applyRequestSchema.parse(body);

    if (!isValidBasePath(validated.spec.basePath)) {
      return NextResponse.json(
        { error: "Invalid basePath. Must start with /api/ and contain only lowercase letters, numbers, -, _, /" },
        { status: 400 }
      );
    }

    const files = generateFiles(validated.spec);
    const existingFiles = checkFilesExist(files, process.cwd());

    if (existingFiles.length > 0 && !validated.overwrite) {
      return NextResponse.json(
        { error: "Files already exist", existingFiles },
        { status: 409 }
      );
    }

    writeAPIFiles(files, process.cwd());

    const createdFiles = [files.routePath];
    if (files.dynamicRoutePath) {
      createdFiles.push(files.dynamicRoutePath);
    }

    return NextResponse.json({
      success: true,
      createdFiles,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Apply API error:", error);
    return NextResponse.json(
      { error: "Failed to write API files" },
      { status: 500 }
    );
  }
}
