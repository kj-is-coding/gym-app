"use client";

import { useState, useEffect } from "react";
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
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending count on mount and when sheet closes (to refresh after processing)
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await fetch("/api/pending-count");
        if (response.ok) {
          const data = await response.json();
          setPendingCount(data.count ?? 0);
        }
      } catch {
        // Silently fail - button still works, just no badge
      }
    };

    fetchPendingCount();
  }, [sheetOpen]); // Re-fetch when sheet closes

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
          throw new Error("Nothing logged yet - start chatting first!");
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

  const hasItems = pendingCount > 0;

  return (
    <>
      <Button
        type="button"
        variant={hasItems ? "default" : "outline"}
        size="sm"
        onClick={openSheet}
        className={`rounded-full text-[13px] font-semibold transition-all duration-200 ${
          hasItems
            ? "finish-day-pulse bg-primary text-primary-foreground hover:bg-primary/90"
            : "border-primary/50 text-primary/70 bg-primary/5 hover:bg-primary/10 hover:text-primary"
        }`}
      >
        Finish Day
        {hasItems && (
          <span className="ml-1.5 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary-foreground/20 text-[11px] font-bold">
            {pendingCount}
          </span>
        )}
      </Button>

      <BottomSheet
        open={sheetOpen && !isLoading}
        onClose={() => !isLoading && setSheetOpen(false)}
        title="Finish today's log?"
        description={
          hasItems
            ? `You have ${pendingCount} message${pendingCount === 1 ? "" : "s"} to process. This will create a structured summary of your workouts and nutrition. You can re-run it anytime if you log more later.`
            : "This processes today's chat into a structured summary. You can re-run it anytime if you log more later."
        }
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
            disabled={!hasItems}
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
          <p className="text-sm text-muted-foreground">Processing today&apos;s log...</p>
        </div>
      )}
    </>
  );
}
