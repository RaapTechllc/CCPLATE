import { Metadata } from "next";

// Force dynamic rendering for Convex auth
export const dynamic = "force-dynamic";

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
