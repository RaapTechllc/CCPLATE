import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readFileSync } from "fs";
import { join } from "path";
import { parsePrismaSchema } from "@/lib/api-builder";

export async function GET() {
  const { authenticated, user, isAdmin } = await requireAdmin();
  if (!authenticated || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
    const schemaContent = readFileSync(schemaPath, "utf-8");
    const models = parsePrismaSchema(schemaContent);

    return NextResponse.json({ models });
  } catch (error) {
    console.error("Failed to parse Prisma schema:", error);
    return NextResponse.json(
      { error: "Failed to parse Prisma schema" },
      { status: 500 }
    );
  }
}
