"use client";

import { useEffect, useState } from "react";
import type { DayLog, DayLogRow, UserGoals } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { WorkoutSection } from "./workout-section";
import { NutritionSection } from "./nutrition-section";

function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function WeighInCard({ weighIns }: { weighIns: DayLog["weigh_ins"] }) {
  if (!weighIns?.length) return null;
  const latest = weighIns[0];
  if (latest.weight === undefined || latest.weight === null) return null;

  return (
    <Card className="mb-3 p-0 gap-0">
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
          <div className="text-2xl font-extrabold text-foreground leading-none tracking-tight">
            {latest.weight}{" "}
            <span className="text-[15px] font-medium text-muted-foreground">{latest.unit}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="p-8 text-center">
      <div className="text-4xl mb-3 leading-none">🏋️</div>
      <p className="font-semibold text-foreground mb-1">Nothing logged yet</p>
      <p className="text-sm text-muted-foreground">
        Start chatting to see today&apos;s summary here
      </p>
    </Card>
  );
}

function LoadingState() {
  return (
    <Card className="p-8 text-center">
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
        style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }}
      />
      <p className="text-sm text-muted-foreground">Loading today&apos;s data…</p>
    </Card>
  );
}

export function TodayViewDesktop() {
  const [dayLogRow, setDayLogRow] = useState<DayLogRow | null>(null);
  const [goals, setGoals] = useState<UserGoals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const todayKey = getLocalDate();
        const response = await fetch(`/api/today?day=${todayKey}`);
        if (response.ok) {
          const data = await response.json();
          setDayLogRow(data.dayLogRow);
          setGoals(data.goals);
        }
      } catch (error) {
        console.error("Failed to load today data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <LoadingState />;

  if (!dayLogRow || dayLogRow.day_log === null) return <EmptyState />;
  if (dayLogRow.status === "pending") return <LoadingState />;
  if (dayLogRow.status === "failed") {
    return (
      <Card className="p-8 text-center">
        <div className="text-4xl mb-3 leading-none">⚠️</div>
        <p className="text-sm text-muted-foreground">Failed to load today&apos;s data.</p>
      </Card>
    );
  }

  const dayLog = dayLogRow.day_log!;

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4 px-1">Today&apos;s Summary</h2>
      <WeighInCard weighIns={dayLog.weigh_ins} />
      <WorkoutSection sessions={dayLog.sessions} />
      <NutritionSection nutrition={dayLog.nutrition} goals={goals} />
    </div>
  );
}
