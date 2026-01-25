import type { APISpec, Endpoint } from "../spec";

export function crudRouteTemplate(spec: APISpec): string {
  const modelLower = spec.model.toLowerCase();
  const listEndpoint = spec.endpoints.find(e => e.method === "GET" && !e.path.includes("[id]"));
  const createEndpoint = spec.endpoints.find(e => e.method === "POST" && !e.path.includes("[id]"));

  const authRequired = listEndpoint?.auth === "required" || listEndpoint?.auth === "admin";
  const hasPagination = listEndpoint?.pagination ?? false;

  const imports = [
    'import { NextRequest, NextResponse } from "next/server";',
  ];

  if (authRequired) {
    imports.push('import { requireAuth, requireAdmin } from "@/lib/auth";');
  }

  if (createEndpoint?.input?.body) {
    imports.push('import { z } from "zod";');
  }

  imports.push('import { prisma } from "@/lib/db";');

  let code = imports.join("\n") + "\n";

  if (createEndpoint?.input?.body) {
    code += `
const createSchema = z.object({
  // TODO: Define validation schema based on ${spec.model} model
});
`;
  }

  if (listEndpoint) {
    code += generateGetHandler(listEndpoint, modelLower, authRequired, hasPagination);
  }

  if (createEndpoint) {
    code += generatePostHandler(createEndpoint, modelLower, createEndpoint.auth === "required" || createEndpoint.auth === "admin");
  }

  return code;
}

function generateGetHandler(endpoint: Endpoint, modelLower: string, authRequired: boolean, hasPagination: boolean): string {
  const isAdminOnly = endpoint.auth === "admin";

  let handler = `
export async function GET(request: NextRequest) {`;

  if (authRequired) {
    if (isAdminOnly) {
      handler += `
  const { authenticated, user, isAdmin } = await requireAdmin();
  if (!authenticated || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
`;
    } else {
      handler += `
  const { authenticated, user } = await requireAuth();
  if (!authenticated || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
`;
    }
  }

  if (hasPagination) {
    handler += `
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.${modelLower}.findMany({ skip, take: limit }),
    prisma.${modelLower}.count(),
  ]);

  return NextResponse.json({ items, total, page, limit });
}
`;
  } else {
    handler += `
  const items = await prisma.${modelLower}.findMany();
  return NextResponse.json(items);
}
`;
  }

  return handler;
}

function generatePostHandler(endpoint: Endpoint, modelLower: string, authRequired: boolean): string {
  const isAdminOnly = endpoint.auth === "admin";

  let handler = `
export async function POST(request: NextRequest) {`;

  if (authRequired) {
    if (isAdminOnly) {
      handler += `
  const { authenticated, user, isAdmin } = await requireAdmin();
  if (!authenticated || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
`;
    } else {
      handler += `
  const { authenticated, user } = await requireAuth();
  if (!authenticated || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
`;
    }
  }

  handler += `
  try {
    const body = await request.json();
    ${endpoint.input?.body ? "const validated = createSchema.parse(body);" : ""}

    const item = await prisma.${modelLower}.create({
      data: ${endpoint.input?.body ? "validated" : "body"},
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
`;

  return handler;
}
