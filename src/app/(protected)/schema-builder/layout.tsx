import { Metadata } from "next";

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
