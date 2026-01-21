import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function GuardianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-zinc-50 dark:bg-zinc-950">{children}</main>
      <Footer />
    </div>
  );
}
