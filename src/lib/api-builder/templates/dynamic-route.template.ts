import type { APISpec, Endpoint } from "../spec";

export function dynamicRouteTemplate(spec: APISpec): string {
  const modelLower = spec.model.toLowerCase();
  const getEndpoint = spec.endpoints.find(e => e.method === "GET" && e.path.includes("[id]"));
  const putEndpoint = spec.endpoints.find(e => e.method === "PUT" && e.path.includes("[id]"));
  const patchEndpoint = spec.endpoints.find(e => e.method === "PATCH" && e.path.includes("[id]"));
  const deleteEndpoint = spec.endpoints.find(e => e.method === "DELETE" && e.path.includes("[id]"));
  
  const anyAuthRequired = [getEndpoint, putEndpoint, patchEndpoint, deleteEndpoint]
    .some(e => e?.auth === "required" || e?.auth === "admin");
  const hasValidation = !!(putEndpoint?.input?.body || patchEndpoint?.input?.body);
  
  const imports = [
    'import { NextRequest, NextResponse } from "next/server";',
  ];
  
  if (anyAuthRequired) {
    imports.push('import { getServerSession } from "next-auth";');
    imports.push('import { authOptions } from "@/lib/auth";');
  }
  
  if (hasValidation) {
    imports.push('import { z } from "zod";');
  }
  
  imports.push('import { prisma } from "@/lib/db";');
  
  let code = imports.join("\n") + "\n";
  
  code += `
interface RouteParams {
  params: Promise<{ id: string }>;
}
`;
  
  if (hasValidation) {
    code += `
const updateSchema = z.object({
  // TODO: Define validation schema based on ${spec.model} model
});
`;
  }
  
  if (getEndpoint) {
    code += generateGetByIdHandler(getEndpoint, modelLower);
  }
  
  if (putEndpoint) {
    code += generatePutHandler(putEndpoint, modelLower, hasValidation);
  }
  
  if (patchEndpoint) {
    code += generatePatchHandler(patchEndpoint, modelLower, hasValidation);
  }
  
  if (deleteEndpoint) {
    code += generateDeleteHandler(deleteEndpoint, modelLower);
  }
  
  return code;
}

function generateGetByIdHandler(endpoint: Endpoint, modelLower: string): string {
  const authRequired = endpoint.auth === "required" || endpoint.auth === "admin";
  
  let handler = `
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
`;
  
  if (authRequired) {
    handler += `
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
`;
  }
  
  handler += `
  const item = await prisma.${modelLower}.findUnique({
    where: { id },
  });
  
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  
  return NextResponse.json(item);
}
`;
  
  return handler;
}

function generatePutHandler(endpoint: Endpoint, modelLower: string, hasValidation: boolean): string {
  const authRequired = endpoint.auth === "required" || endpoint.auth === "admin";
  
  let handler = `
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
`;
  
  if (authRequired) {
    handler += `
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
`;
  }
  
  handler += `
  try {
    const body = await request.json();
    ${hasValidation ? "const validated = updateSchema.parse(body);" : ""}
    
    const item = await prisma.${modelLower}.update({
      where: { id },
      data: ${hasValidation ? "validated" : "body"},
    });
    
    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
`;
  
  return handler;
}

function generatePatchHandler(endpoint: Endpoint, modelLower: string, hasValidation: boolean): string {
  const authRequired = endpoint.auth === "required" || endpoint.auth === "admin";
  
  let handler = `
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
`;
  
  if (authRequired) {
    handler += `
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
`;
  }
  
  handler += `
  try {
    const body = await request.json();
    ${hasValidation ? "const validated = updateSchema.partial().parse(body);" : ""}
    
    const item = await prisma.${modelLower}.update({
      where: { id },
      data: ${hasValidation ? "validated" : "body"},
    });
    
    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
`;
  
  return handler;
}

function generateDeleteHandler(endpoint: Endpoint, modelLower: string): string {
  const authRequired = endpoint.auth === "required" || endpoint.auth === "admin";
  
  let handler = `
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
`;
  
  if (authRequired) {
    handler += `
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
`;
  }
  
  handler += `
  try {
    await prisma.${modelLower}.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
`;
  
  return handler;
}
