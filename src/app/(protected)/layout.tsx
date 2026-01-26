import { Footer } from "@/components/layout/footer"

// Force dynamic rendering for protected routes (Convex auth required)
export const dynamic = "force-dynamic";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
