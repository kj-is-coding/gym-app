"use client";

import { useState } from "react";
import type { Session } from "@/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function getSetSummary(sets: Session["exercises"][0]["sets"]): string {
  const workingSets = sets.filter((s) => !s.is_warmup);
  if (workingSets.length === 0) return "warmup only";

  const repsValues: number[] = [];
  for (const set of workingSets) {
    if (set.reps === undefined) continue;
    if (typeof set.reps === "number") repsValues.push(set.reps);
    else if (Array.isArray(set.reps)) repsValues.push(set.reps[0], set.reps[1]);
  }

  if (repsValues.length === 0) return `${workingSets.length} sets`;
  const minReps = Math.min(...repsValues);
  const maxReps = Math.max(...repsValues);
  const repsStr = minReps === maxReps ? `${minReps}` : `${minReps}-${maxReps}`;
  return `${workingSets.length}×${repsStr}`;
}

function ExerciseRow({ exercise }: { exercise: Session["exercises"][0] }) {
  const workingSets = exercise.sets.filter((s) => !s.is_warmup);
  const warmupSets = exercise.sets.filter((s) => s.is_warmup);

  const weights = workingSets
    .map((s) => s.weight)
    .filter((w): w is number => typeof w === "number");
  const units = new Set(workingSets.map((s) => s.unit));
  const unit = units.values().next().value ?? "lb";

  let weightStr = "";
  if (weights.length > 0) {
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    weightStr = minW === maxW ? `${minW} ${unit}` : `${minW}–${maxW} ${unit}`;
  }

  return (
    <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{exercise.name}</div>
        {exercise.alias_used && (
          <div className="text-[11px] text-muted-foreground mt-px">aka {exercise.alias_used}</div>
        )}
        {warmupSets.length > 0 && (
          <div className="text-[11px] text-muted-foreground mt-px">+{warmupSets.length} warmup</div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="text-[15px] font-bold text-foreground">{getSetSummary(exercise.sets)}</div>
        {weightStr && <div className="text-xs text-muted-foreground mt-px">{weightStr}</div>}
      </div>
    </div>
  );
}

function SessionCard({ session, defaultOpen }: { session: Session; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const exerciseCount = session.exercises.length;
  const label = session.label || "Session";

  return (
    <Card className="mb-2.5 overflow-hidden p-0 gap-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
          <span className="text-[15px] font-bold text-foreground">{label}</span>
          {session.start_time && (
            <span className="text-xs text-muted-foreground">{formatTime(session.start_time)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}
          </span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            className={cn("text-muted-foreground transition-transform duration-200", open && "rotate-180")}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {open && (
        <div>
          {session.exercises.map((exercise, idx) => (
            <ExerciseRow key={idx} exercise={exercise} />
          ))}
        </div>
      )}
    </Card>
  );
}

export function WorkoutSection({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <Card className="p-4 mb-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground mb-1.5">Workouts</p>
        <p className="text-sm text-muted-foreground">No workouts logged yet</p>
      </Card>
    );
  }

  return (
    <div className="mb-1.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground px-1 mb-2">
        Workouts
      </p>
      {sessions.map((session, idx) => (
        <SessionCard key={idx} session={session} defaultOpen={sessions.length === 1} />
      ))}
    </div>
  );
}
