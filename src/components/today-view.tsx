"use client";

import type { DayLog, DayLogRow, UserGoals } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WorkoutSection } from "./workout-section";
import { NutritionSection } from "./nutrition-section";
import { useRouter } from "next/navigation";

interface TodayViewProps {
  dayLogRow: DayLogRow | null;
  goals: UserGoals | null;
}

const QUICK_ACTIONS = [
  { label: "Log breakfast", message: "I had breakfast: " },
  { label: "Add workout", message: "I just finished a workout: " },
  { label: "Log meal", message: "I had a meal: " },
  { label: "Log weight", message: "I weighed in at " },
];

function WeighInCard({ weighIns }: { weighIns: DayLog["weigh_ins"] }) {
  if (!weighIns?.length) return null;
  const latest = weighIns[0];
  if (latest.weight === undefined || latest.weight === null) return null;

  return (
    <Card className="mb-3 p-0 gap-0 card-hover">
      <CardContent className="px-4 py-3 flex items-center gap-3">
        <div className="w-11 h-11 flex items-center justify-center bg-muted rounded-xl shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-muted-foreground">
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v4l2 2" />
          </svg>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-0.5">
            Weigh-in{latest.context ? ` · ${latest.context}` : ""}
          </div>
          <div className="text-2xl font-extrabold text-foreground leading-none tracking-tight tabular-nums">
            {latest.weight}{" "}
            <span className="text-[15px] font-medium text-muted-foreground">{latest.unit}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ type }: { type: "no_data" | "pending" | "failed" }) {
  const router = useRouter();

  const handleQuickAction = (message: string) => {
    const encoded = encodeURIComponent(message);
    router.push(`/app/chat?message=${encoded}`);
  };

  if (type === "pending") {
    return (
      <Card className="p-10 text-center card-hover">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
          style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }}
        />
        <p className="text-sm text-muted-foreground">Processing today&apos;s data…</p>
      </Card>
    );
  }

  if (type === "failed") {
    return (
      <Card className="p-10 text-center card-hover">
        <div className="text-4xl mb-3 leading-none">⚠️</div>
        <p className="text-sm text-muted-foreground mb-4">Failed to process today&apos;s data.</p>
        <Button asChild className="rounded-full">
          <a href="/app/chat">Try again</a>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-10 text-center card-hover">
      <div className="text-[52px] leading-none mb-3">🏋️</div>
      <p className="font-bold text-[17px] text-foreground mb-2">Nothing logged yet</p>
      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
        Chat with AI to log meals and workouts
      </p>

      {/* Quick action chips */}
      <div className="flex flex-wrap gap-2 justify-center mb-5">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.label}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction(action.message)}
            className="rounded-full text-sm font-medium bg-secondary text-foreground border-0 hover:bg-primary/15 hover:text-primary whitespace-nowrap h-auto px-4 py-2 transition-colors"
          >
            {action.label}
          </Button>
        ))}
      </div>

      {/* Primary CTA */}
      <Button asChild className="rounded-full px-7 text-[15px] font-semibold" style={{ background: "var(--brand)" }}>
        <a href="/app/chat">Start logging</a>
      </Button>
    </Card>
  );
}

export function TodayView({ dayLogRow, goals }: TodayViewProps) {
  if (!dayLogRow) return <EmptyState type="no_data" />;
  if (dayLogRow.status === "pending") return <EmptyState type="pending" />;
  if (dayLogRow.status === "failed") return <EmptyState type="failed" />;

  const dayLog = dayLogRow.day_log!;

  return (
    <div>
      <WeighInCard weighIns={dayLog.weigh_ins} />
      <WorkoutSection sessions={dayLog.sessions} />
      <NutritionSection nutrition={dayLog.nutrition} goals={goals} />
    </div>
  );
}
