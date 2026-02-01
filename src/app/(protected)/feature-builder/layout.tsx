import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feature Builder | CCPLATE",
  description: "Generate full-stack features by chaining builders",
};

export default function FeatureBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
