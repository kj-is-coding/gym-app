// DayLog types from SPEC.md

export interface MacroTotals {
  cal: number;
  p: number; // protein (g)
  c: number; // carbs (g)
  f: number; // fat (g)
}

export interface Set {
  weight: number;
  unit: "lb" | "kg";
  reps: number;
  rir?: number; // reps in reserve
  to_failure?: boolean;
  is_warmup?: boolean;
  drop_from_set_id?: string | null;
  notes?: string;
}

export interface Exercise {
  name: string;
  alias_used?: string;
  sets: Set[];
}

export interface Session {
  label: string; // "Gym"
  start_time: string; // ISO timestamp
  exercises: Exercise[];
}

export interface Meal {
  name: string;
  estimated_macros: MacroTotals;
  uncertainty: "low" | "medium" | "high";
}

export interface WeighIn {
  weight: number;
  unit: "lb" | "kg";
  context?: string; // "morning"
  timestamp: string;
}

export interface Nutrition {
  meals: Meal[];
  totals: MacroTotals;
  uncertainty: "low" | "medium" | "high";
}

export interface DayLog {
  date: string; // "2026-03-01"
  sessions: Session[];
  nutrition: Nutrition;
  weigh_ins: WeighIn[];
}

export interface UserGoals {
  target_calories?: number;
  target_protein?: number; // grams
  target_carbs?: number; // grams
  target_fat?: number; // grams
  goal_type?: "bulk" | "lean_bulk" | "cut" | "maintain";
}

// Database row types
export interface DayLogRow {
  day_log: DayLog | null;
  status: "pending" | "processed" | "failed";
  processed_at: string | null;
}

export interface UserGoalsRow {
  data: UserGoals | null;
}
