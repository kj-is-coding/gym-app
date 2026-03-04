"use client";

import { useState } from "react";
import type { Nutrition, UserGoals } from "@/types";
import { Card } from "@/components/ui/card";
import { CircularProgress } from "./circular-progress";
import { cn } from "@/lib/utils";

interface NutritionSectionProps {
  nutrition: Nutrition;
  goals?: UserGoals | null;
}

const UNCERTAINTY_COLORS: Record<string, string> = {
  low: "var(--success)",
  medium: "var(--warning)",
  high: "var(--error)",
};

function MealRow({ meal }: { meal: Nutrition["meals"][0] }) {
  const [expanded, setExpanded] = useState(false);
  const { cal, p, c, f } = meal.estimated_macros ?? { cal: 0, p: 0, c: 0, f: 0 };
  const uncertainty = meal.uncertainty ?? "medium";

  return (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className="w-full text-left border-b border-border"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: UNCERTAINTY_COLORS[uncertainty] }}
          />
          <span className="text-sm font-medium text-foreground truncate">{meal.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold text-muted-foreground">{cal} cal</span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            className={cn("text-muted-foreground transition-transform duration-200", expanded && "rotate-180")}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="flex gap-5 pl-[34px] pb-3">
          {[
            { label: "Protein", value: p, unit: "g", color: "var(--protein)" },
            { label: "Carbs", value: c, unit: "g", color: "var(--carbs)" },
            { label: "Fat", value: f, unit: "g", color: "var(--fat)" },
          ].map((macro) => (
            <div key={macro.label}>
              <span className="text-sm font-bold" style={{ color: macro.color }}>
                {macro.value}{macro.unit}
              </span>
              <span className="text-[11px] text-muted-foreground ml-0.5">{macro.label}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

export function NutritionSection({ nutrition, goals }: NutritionSectionProps) {
  const hasMeals = nutrition.meals.length > 0;
  const totals = nutrition.totals;
  const remaining = goals?.target_calories
    ? Math.max(0, goals.target_calories - totals.cal)
    : null;

  return (
    <div className="mb-6">
      {/* Macro rings */}
      <Card className="p-4 mb-2.5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Macros
          </span>
          {remaining !== null && (
            <span className="text-[13px] font-semibold text-muted-foreground">
              {remaining.toLocaleString()} cal left
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3">
          <CircularProgress label="Cal" current={totals.cal} target={goals?.target_calories} unit="kcal" color="var(--cal)" size={76} />
          <CircularProgress label="Protein" current={totals.p} target={goals?.target_protein} unit="g" color="var(--protein)" size={76} />
          <CircularProgress label="Carbs" current={totals.c} target={goals?.target_carbs} unit="g" color="var(--carbs)" size={76} />
          <CircularProgress label="Fat" current={totals.f} target={goals?.target_fat} unit="g" color="var(--fat)" size={76} />
        </div>
      </Card>

      {/* Meals */}
      {hasMeals && (
        <Card className="p-0 gap-0 overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Meals
            </span>
            <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground">
              <span className="opacity-70">Confidence</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: UNCERTAINTY_COLORS.low }} />
                Low
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: UNCERTAINTY_COLORS.medium }} />
                Med
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: UNCERTAINTY_COLORS.high }} />
                High
              </span>
            </div>
          </div>
          {nutrition.meals.map((meal, idx) => (
            <MealRow key={idx} meal={meal} />
          ))}
        </Card>
      )}
    </div>
  );
}
