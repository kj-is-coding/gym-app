"use client";

import { useState, useEffect } from "react";
import type { DayLog } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DayLogSummary {
  day_key: string;
  status: string;
  day_log: DayLog | null;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function DaySummaryCard({ log }: { log: DayLogSummary }) {
  const dayLog = log.day_log;
  const date = new Date(log.day_key + "T12:00:00");
  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Card className="mb-3 p-0 gap-0 card-hover">
      <CardContent className="px-4 py-4">
        <p className="font-semibold text-[15px] text-foreground mb-3">{dateLabel}</p>

        {dayLog && (
          <div className="space-y-2">
            {dayLog.nutrition?.totals && (
              <div className="flex gap-4">
                {[
                  { label: "cal", value: dayLog.nutrition.totals.cal, color: "var(--cal)" },
                  { label: "P", value: dayLog.nutrition.totals.p, color: "var(--protein)" },
                  { label: "C", value: dayLog.nutrition.totals.c, color: "var(--carbs)" },
                  { label: "F", value: dayLog.nutrition.totals.f, color: "var(--fat)" },
                ].map((m) => (
                  <div key={m.label}>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: m.color }}>{m.value}</span>
                    <span className="text-xs text-muted-foreground ml-0.5">{m.label}</span>
                  </div>
                ))}
              </div>
            )}

            {dayLog.sessions?.length > 0 && (
              <div className="text-[13px] text-muted-foreground">
                🏋️ {dayLog.sessions.map((s) => `${s.label || "Session"} · ${s.exercises.length} exercise${s.exercises.length !== 1 ? "s" : ""}`).join("  ")}
              </div>
            )}

            {dayLog.weigh_ins?.[0]?.weight && (
              <div className="text-[13px] text-muted-foreground">
                ⚖️ {dayLog.weigh_ins[0].weight} {dayLog.weigh_ins[0].unit}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function HistoryView() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [logs, setLogs] = useState<DayLogSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/history?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [year, month]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);
  const loggedDays = new Set(logs.map((l) => parseInt(l.day_key.split("-")[2])));

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

  return (
    <div>
      {/* Month navigation */}
      <Card className="mb-4 p-0 gap-0 card-hover">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="text-muted-foreground hover:bg-accent">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Button>
            <span className="text-base font-semibold text-foreground">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="text-muted-foreground disabled:opacity-30 hover:bg-accent"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-center text-[11px] text-muted-foreground pb-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDow }, (_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const hasLog = loggedDays.has(day);
              const isToday = isCurrentMonth && day === today.getDate();
              return (
                <div
                  key={day}
                  className="flex flex-col items-center justify-center"
                  style={{ aspectRatio: "1" }}
                >
                  <span
                    className={cn(
                      "text-[13px] rounded-full w-8 h-8 flex items-center justify-center",
                      isToday && "bg-primary text-primary-foreground font-bold",
                      !isToday && hasLog && "text-foreground",
                      !isToday && !hasLog && "text-muted-foreground"
                    )}
                  >
                    {day}
                  </span>
                  {hasLog && !isToday && (
                    <span className="w-1 h-1 rounded-full bg-primary block mt-px" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Log list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl skeleton h-24" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card className="p-8 text-center card-hover">
          <p className="text-sm text-muted-foreground">
            No logs for {MONTH_NAMES[month - 1]} {year}
          </p>
        </Card>
      ) : (
        logs.map((log) => <DaySummaryCard key={log.day_key} log={log} />)
      )}
    </div>
  );
}
