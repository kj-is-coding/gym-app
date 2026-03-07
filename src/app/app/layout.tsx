"use client";

import { useEffect, useState } from "react";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { SidebarNav } from "@/components/sidebar-nav";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const mql = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mql.matches);

    const listener = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  // During SSR/initial render, show mobile layout
  if (!isMounted) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <div className="max-w-lg mx-auto mb-bottom-nav">
          {children}
        </div>
        <BottomTabBar />
      </div>
    );
  }

  if (isDesktop) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <SidebarNav />
        <div className="lg:pl-16 lg:pl-64">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="max-w-lg mx-auto mb-bottom-nav">
        {children}
      </div>
      <BottomTabBar />
    </div>
  );
}

export default AppLayout;
