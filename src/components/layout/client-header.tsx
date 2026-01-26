"use client";

import { useState, useEffect } from "react";
import { Header } from "./header";

export function ClientHeader() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render during SSR to avoid hydration issues
  if (!mounted) {
    return (
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm h-16" />
    );
  }

  return <Header />;
}
