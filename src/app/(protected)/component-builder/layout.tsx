import { Metadata } from "next";

// Force dynamic rendering for Convex auth
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Component Builder | CCPLATE",
  description: "Generate React components from natural language descriptions",
};

export default function ComponentBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
