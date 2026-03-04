"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/auth-client";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const notAllowed = searchParams.get("error") === "not_allowed";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      setStatus("sent");
    }
  };

  if (status === "sent") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 w-16 h-16 flex items-center justify-center rounded-2xl bg-[var(--success)]/10 border-2 border-[var(--success)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Check your email</h2>
        <p className="text-[15px] text-muted-foreground">
          We sent a magic link to{" "}
          <span className="text-foreground font-medium">{email}</span>
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 text-sm text-primary"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <>
      {notAllowed && (
        <div className="w-full rounded-xl px-4 py-3 mb-5 text-center text-sm text-destructive bg-destructive/10 border border-destructive">
          This email isn&apos;t on the access list.
        </div>
      )}

      <form onSubmit={handleLogin} className="w-full">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          required
          className="mb-4 h-14 text-base rounded-xl bg-muted border-border focus-visible:ring-primary"
        />

        {error && (
          <p className="mb-4 text-sm text-destructive">{error}</p>
        )}

        <Button
          type="submit"
          disabled={status === "loading"}
          className="w-full h-14 rounded-2xl text-base font-semibold"
        >
          {status === "loading" ? "Sending…" : "Send Magic Link"}
        </Button>
      </form>
    </>
  );
}

function LoginFallback() {
  return (
    <div className="w-full space-y-4">
      <div className="skeleton rounded-xl h-14" />
      <div className="skeleton rounded-2xl h-14" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-dvh bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Logo */}
        <div className="mb-6 w-18 h-18 flex items-center justify-center rounded-2xl bg-primary/10 border-2 border-primary" style={{ width: 72, height: 72 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 6.5h11M6.5 17.5h11M4 12h16M3 8.5C3 7.12 4.12 6 5.5 6S8 7.12 8 8.5 6.88 11 5.5 11 3 9.88 3 8.5zM21 8.5C21 7.12 19.88 6 18.5 6S16 7.12 16 8.5s1.12 2.5 2.5 2.5S21 9.88 21 8.5zM3 15.5C3 14.12 4.12 13 5.5 13S8 14.12 8 15.5 6.88 18 5.5 18 3 16.88 3 15.5zM21 15.5C21 14.12 19.88 13 18.5 13S16 14.12 16 15.5s1.12 2.5 2.5 2.5S21 16.88 21 15.5z" />
          </svg>
        </div>

        <h1 className="text-[28px] font-bold text-foreground mb-1 text-center">Gym App</h1>
        <p className="text-[15px] text-muted-foreground mb-8 text-center">
          Track workouts &amp; nutrition with AI
        </p>

        <Suspense fallback={<LoginFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
