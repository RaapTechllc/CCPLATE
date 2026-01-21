import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hook Builder | CCPLATE",
  description: "Generate React hooks from natural language descriptions",
};

export default function HookBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
