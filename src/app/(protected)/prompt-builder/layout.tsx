import { Metadata } from "next";

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
