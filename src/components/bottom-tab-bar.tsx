"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  {
    href: "/app/chat",
    label: "Chat",
    icon: (active: boolean) => (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.8}
      >
        <path
          d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.663 2.97898 17.0901 4.60418 18.9375L3.5 21.5L6.75 20.5C8.36308 21.4659 10.1152 22 12 22Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/app/today",
    label: "Today",
    icon: (active: boolean) => (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {active ? (
          <>
            <rect x="3" y="3" width="18" height="18" rx="3" fill="currentColor" stroke="none" />
            <rect x="7" y="12" width="2" height="5" fill="white" />
            <rect x="11" y="9" width="2" height="8" fill="white" />
            <rect x="15" y="7" width="2" height="10" fill="white" />
          </>
        ) : (
          <>
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M7 17V12M11 17V9M15 17V7" />
          </>
        )}
      </svg>
    ),
  },
  {
    href: "/app/more",
    label: "More",
    icon: (active: boolean) => (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      >
        {active ? (
          <>
            <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
            <circle cx="8.5" cy="12" r="1.2" fill="white" />
            <circle cx="12" cy="12" r="1.2" fill="white" />
            <circle cx="15.5" cy="12" r="1.2" fill="white" />
          </>
        ) : (
          <>
            <circle cx="8.5" cy="12" r="1.2" fill="currentColor" />
            <circle cx="12" cy="12" r="1.2" fill="currentColor" />
            <circle cx="15.5" cy="12" r="1.2" fill="currentColor" />
          </>
        )}
      </svg>
    ),
  },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
              style={{ minHeight: "56px" }}
            >
              {tab.icon(active)}
              <span className={cn("text-[11px]", active ? "font-semibold" : "font-normal")}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
