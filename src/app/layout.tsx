import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { ClientHeader } from "@/components/layout/client-header";

// Initialize Sentry on the client side
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void import("@/lib/sentry").then(({ initSentry }) => initSentry());
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CCPLATE - AI-Powered Development Platform",
  description: "A SaaS boilerplate with AI-powered developer tooling and multi-agent orchestration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <ClientHeader />
          <main className="min-h-screen">
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
