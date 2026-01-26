import { Metadata } from "next";

// Force dynamic rendering for Convex auth
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prompt Builder | CCPLATE",
  description: "Create and manage reusable AI prompts",
};

export default function PromptBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
