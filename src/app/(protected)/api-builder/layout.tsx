import { Metadata } from "next";

// Force dynamic rendering for Convex auth
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "API Builder | CCPLATE",
  description: "Generate CRUD API routes from Prisma models or descriptions",
};

export default function APIBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
