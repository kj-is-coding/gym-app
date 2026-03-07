"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const navItems = [
  {
    href: "/app/chat",
    label: "Chat",
    icon: (active: boolean) => (
      <svg
        width="20"
        height="20"
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
        width="20"
        height="20"
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
    href: "/app/goals",
    label: "Goals",
    icon: (active: boolean) => (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    href: "/app/history",
    label: "History",
    icon: (active: boolean) => (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    href: "/app/more",
    label: "More",
    icon: (active: boolean) => (
      <svg
        width="20"
        height="20"
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

function getUserInitials(email: string): string {
  const parts = email.split("@")[0].split(/[\._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function SidebarNav() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Try to get user email from the page
    fetch("/api/user")
      .then(res => res.json())
      .then(data => {
        if (data.email) setUserEmail(data.email);
      })
      .catch(() => {
        // Fallback for BYPASS_AUTH mode
        setUserEmail("test@local.dev");
      });
  }, []);

  return (
    <nav
      className="fixed left-0 top-0 bottom-0 z-50 w-16 lg:w-64 bg-card border-r border-border flex flex-col"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Logo area */}
      <div className="h-14 flex items-center justify-center lg:justify-start lg:px-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 6.5h11M6.5 17.5h11M4 12h16M3 8.5C3 7.12 4.12 6 5.5 6S8 7.12 8 8.5 6.88 11 5.5 11 3 9.88 3 8.5zM21 8.5C21 7.12 19.88 6 18.5 6S16 7.12 16 8.5s1.12 2.5 2.5 2.5S21 9.88 21 8.5zM3 15.5C3 14.12 4.12 13 5.5 13S8 14.12 8 15.5 6.88 18 5.5 18 3 16.88 3 15.5zM21 15.5C21 14.12 19.88 13 18.5 13S16 14.12 16 15.5s1.12 2.5 2.5 2.5S21 16.88 21 15.5z" />
          </svg>
        </div>
        <span className="hidden lg:block ml-2 font-semibold text-foreground">Gym App</span>
      </div>

      {/* Nav items */}
      <div className="flex-1 py-2 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl transition-colors",
                active ? "bg-accent text-primary" : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              <div className="shrink-0">{item.icon(active)}</div>
              <span className="hidden lg:block text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* User section */}
      {userEmail && (
        <div className="hidden lg:flex lg:items-center lg:gap-3 lg:px-4 lg:py-3 lg:mx-2 lg:rounded-xl lg:bg-muted/50">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold">
            {getUserInitials(userEmail)}
          </div>
          <span className="text-sm text-muted-foreground truncate">{userEmail}</span>
        </div>
      )}

      {/* Sign out */}
      <div className="p-2 border-t border-border">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
            onClick={(e) => {
              if (!confirm('Sign out? You\'ll need to sign in again with your email.')) {
                e.preventDefault();
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="hidden lg:block text-sm font-medium">Sign out</span>
          </button>
        </form>
      </div>
    </nav>
  );
}
