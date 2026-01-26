import { Metadata } from "next";

// Force dynamic rendering for Convex auth
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Schema Builder | CCPLATE",
  description: "Generate Prisma models from natural language descriptions",
};

export default function SchemaBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
