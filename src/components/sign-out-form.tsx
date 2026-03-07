"use client";

import { useState } from "react";

export function SignOutForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const confirmed = confirm('Sign out? You\'ll need to sign in again with your email.');
    if (!confirmed) {
      e.preventDefault();
    } else {
      setIsSubmitting(true);
    }
  };

  return (
    <form action="/auth/signout" method="post" onSubmit={handleSubmit}>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center gap-3 px-4 py-4 hover:bg-accent transition-colors disabled:opacity-50"
      >
        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>
        <span className="text-[15px] font-semibold text-destructive">
          {isSubmitting ? "Signing out..." : "Sign out"}
        </span>
      </button>
    </form>
  );
}
