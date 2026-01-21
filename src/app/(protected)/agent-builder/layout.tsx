import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Builder | CCPLATE",
  description: "Create and manage AI agents with custom tools and configurations",
};

export default function AgentBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
