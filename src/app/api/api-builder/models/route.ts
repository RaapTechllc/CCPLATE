import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readFileSync } from "fs";
import { join } from "path";
import { parsePrismaSchema } from "@/lib/api-builder";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
