import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guardian Settings | CCPLATE",
  description: "Configure Guardian workflow supervisor settings",
};

export default function GuardianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
