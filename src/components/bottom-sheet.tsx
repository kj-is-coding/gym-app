"use client";

import { useEffect, useRef } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, description, children }: BottomSheetProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center fade-in">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg rounded-t-2xl p-6 bg-card"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}
      >
        <div className="mx-auto mb-5 w-9 h-1 rounded-full bg-secondary" />
        <h2 className="font-semibold text-[17px] text-foreground mb-1">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mb-5">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
}
