"use client";

import { useState } from "react";
import type { UserGoals } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GoalsFormProps {
  currentGoals: UserGoals | null;
}

const GOAL_TYPES: { value: UserGoals["goal_type"]; label: string }[] = [
  { value: "bulk", label: "Bulk" },
  { value: "lean_bulk", label: "Lean Bulk" },
  { value: "cut", label: "Cut" },
  { value: "maintain", label: "Maintain" },
];

function NumberInput({
  label,
  value,
  onChange,
  unit,
  color,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
  color: string;
}) {
  const numVal = parseInt(value) || 0;
  const step = unit === "calories" ? 50 : 5;

  return (
    <Card className="p-0 gap-0">
      <CardContent className="px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-[15px] font-medium text-foreground">{label}</div>
          <div className="text-xs text-muted-foreground">{unit}</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange(String(Math.max(0, numVal - step)))}
            className="w-9 h-9 rounded-full bg-secondary text-foreground text-xl flex items-center justify-center hover:bg-secondary/80 transition-colors"
          >
            −
          </button>
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-18 bg-transparent border-none outline-none text-center text-xl font-bold"
            style={{ color, width: "72px" }}
          />
          <button
            type="button"
            onClick={() => onChange(String(numVal + step))}
            className="w-9 h-9 rounded-full bg-secondary text-foreground text-xl flex items-center justify-center hover:bg-secondary/80 transition-colors"
          >
            +
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export function GoalsForm({ currentGoals }: GoalsFormProps) {
  const [goalType, setGoalType] = useState<UserGoals["goal_type"]>(
    currentGoals?.goal_type ?? "lean_bulk"
  );
  const [calories, setCalories] = useState(String(currentGoals?.target_calories ?? 2500));
  const [protein, setProtein] = useState(String(currentGoals?.target_protein ?? 180));
  const [carbs, setCarbs] = useState(String(currentGoals?.target_carbs ?? 250));
  const [fat, setFat] = useState(String(currentGoals?.target_fat ?? 80));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const handleSave = async () => {
    setStatus("saving");
    setError("");
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal_type: goalType,
          target_calories: parseInt(calories) || undefined,
          target_protein: parseInt(protein) || undefined,
          target_carbs: parseInt(carbs) || undefined,
          target_fat: parseInt(fat) || undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setStatus("error");
    }
  };

  return (
    <div className="space-y-4">
      {/* Goal type */}
      <Card className="p-0 gap-0">
        <CardContent className="p-4">
          <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Goal Type
          </p>
          <div className="grid grid-cols-2 gap-2">
            {GOAL_TYPES.map((gt) => (
              <Button
                key={gt.value}
                type="button"
                variant={goalType === gt.value ? "default" : "outline"}
                onClick={() => setGoalType(gt.value)}
                className="rounded-xl"
              >
                {gt.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <NumberInput label="Daily Calories" value={calories} onChange={setCalories} unit="calories" color="var(--cal)" />
      <NumberInput label="Protein" value={protein} onChange={setProtein} unit="grams" color="var(--protein)" />
      <NumberInput label="Carbs" value={carbs} onChange={setCarbs} unit="grams" color="var(--carbs)" />
      <NumberInput label="Fat" value={fat} onChange={setFat} unit="grams" color="var(--fat)" />

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm text-destructive bg-destructive/10 border border-destructive">
          {error}
        </div>
      )}

      <Button
        type="button"
        onClick={handleSave}
        disabled={status === "saving"}
        className={cn(
          "w-full py-4 rounded-2xl text-base font-semibold h-auto",
          status === "saved" && "bg-[var(--success)] hover:bg-[var(--success)]"
        )}
      >
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved!" : "Save Goals"}
      </Button>
    </div>
  );
}
