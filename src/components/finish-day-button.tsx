"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "./bottom-sheet";

function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function FinishDayButton() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinishDay = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/process-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayKey: getLocalDate() }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "No messages found for this day") {
          throw new Error("Nothing logged yet — start chatting first!");
        }
        throw new Error(data.error || "Failed to process day");
      }

      window.location.href = "/app/today";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  const openSheet = () => {
    setError(null);
    setSheetOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openSheet}
        className="rounded-full border-primary text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary text-[13px] font-semibold"
      >
        Finish Day
      </Button>

      <BottomSheet
        open={sheetOpen && !isLoading}
        onClose={() => !isLoading && setSheetOpen(false)}
        title="Finish today's log?"
        description="This processes today's chat into a structured summary. You can re-run it anytime if you log more later."
      >
        {error && (
          <div className="mb-4 rounded-xl px-4 py-3 text-sm text-destructive bg-destructive/10 border border-destructive">
            {error}
          </div>
        )}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => setSheetOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={handleFinishDay}
          >
            Process
          </Button>
        </div>
      </BottomSheet>

      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 fade-in bg-black/90">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }}
          />
          <p className="text-sm text-muted-foreground">Processing today&apos;s log…</p>
        </div>
      )}
    </>
  );
}
