"use client";

import { useState } from "react";
import { claimGenericInvite } from "@/lib/invite-operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ClaimFormProps {
  token: string;
  mode: "claim";
}

interface AcceptFormProps {
  email: string;
  name: string;
  mode: "accept";
}

type Props = ClaimFormProps | AcceptFormProps;

export function InviteAcceptForm(props: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state for claim mode
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const handleClaim = async () => {
    if (!email.trim() || !name.trim()) {
      setErrorMsg("Please fill in all fields");
      return;
    }

    setStatus("loading");
    setErrorMsg(null);

    // Call the API route to claim invite and set up session
    try {
      const response = await fetch('/api/invite/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: (props as ClaimFormProps).token,
          email: email.trim(),
          name: name.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.error || "Failed to claim invite");
        setStatus("error");
        return;
      }

      setStatus("sent");

      // Redirect to the app or login (as determined by the API)
      setTimeout(() => {
        window.location.href = data.redirect || "/app/today";
      }, 500);
    } catch (err) {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  const handleAccept = async () => {
    setStatus("loading");

    // For accept mode, the invite was already claimed with known email
    // Just redirect to login
    setStatus("sent");

    setTimeout(() => {
      window.location.href = `/login?email=${encodeURIComponent((props as AcceptFormProps).email)}`;
    }, 1500);
  };

  if (status === "sent") {
    return (
      <div className="w-full text-center animate-in">
        <div className="mx-auto mb-5 w-14 h-14 flex items-center justify-center rounded-2xl bg-success/10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1.5">You're in!</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Setting up your account...
        </p>
      </div>
    );
  }

  // Claim mode - show form to collect name/email
  if (props.mode === "claim") {
    return (
      <div className="w-full space-y-4">
        <div className="space-y-3">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
              Name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
              disabled={status === "loading"}
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
              disabled={status === "loading"}
            />
          </div>
        </div>

        {errorMsg && (
          <p className="text-sm text-destructive text-center">{errorMsg}</p>
        )}

        <Button
          onClick={handleClaim}
          disabled={status === "loading"}
          className="w-full h-12 rounded-xl text-[15px] font-medium"
        >
          {status === "loading" ? "Sending..." : "Accept Invitation"}
        </Button>
      </div>
    );
  }

  // Accept mode - email/name already known
  return (
    <div className="w-full space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        Email: <span className="text-foreground font-medium">{(props as AcceptFormProps).email}</span>
      </p>
      <Button
        onClick={handleAccept}
        disabled={status === "loading"}
        className="w-full h-12 rounded-xl text-[15px] font-medium"
      >
        {status === "loading" ? "Sending..." : "Accept Invitation"}
      </Button>
    </div>
  );
}
