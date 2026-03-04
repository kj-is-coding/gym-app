import { z } from "zod";

// --- Set Schema ---
export const ExerciseSetSchema = z.object({
  weight: z.number().nullable().optional(),
  unit: z.string().nullable().optional().default("lb"), // Accept any string, default to lb
  reps: z.union([z.number(), z.tuple([z.number(), z.number()])]).optional(), // single or range
  rir: z.number().nullable().optional(), // reps in reserve
  to_failure: z.boolean().default(false).optional(),
  is_warmup: z.boolean().default(false).optional(),
  drop_from_set_id: z.string().nullable().optional(), // reference to parent set for drop sets
  notes: z.string().nullish(),
});

// --- Exercise Schema ---
export const ExerciseSchema = z.object({
  name: z.string().optional(),
  alias_used: z.string().nullable().optional(),
  sets: z.array(ExerciseSetSchema),
});

// --- Session Schema ---
export const SessionSchema = z.object({
  label: z.string().optional(), // e.g., "Gym", "Home workout"
  start_time: z.string().nullable().optional(), // ISO timestamp
  exercises: z.array(ExerciseSchema),
});

// --- Macros Schema ---
export const MacrosSchema = z.object({
  cal: z.number(), // calories
  p: z.number(), // protein (g)
  c: z.number(), // carbs (g)
  f: z.number(), // fat (g)
});

// --- Meal Schema ---
export const MealSchema = z.object({
  name: z.string().optional(),
  estimated_macros: MacrosSchema.optional(),
  uncertainty: z.enum(["low", "medium", "high"]).optional(),
  timestamp: z.string().optional(), // ISO timestamp
});

// --- Nutrition Schema ---
export const NutritionSchema = z.object({
  meals: z.array(MealSchema),
  totals: MacrosSchema,
  uncertainty: z.enum(["low", "medium", "high"]),
});

// --- Weigh-In Schema ---
export const WeighInSchema = z.object({
  weight: z.number().optional(),
  unit: z.string().optional().default("lb"), // Accept any string
  context: z.enum(["morning", "evening", "post_workout", "other"]).optional(),
  timestamp: z.string().nullable().optional(), // ISO timestamp
});

// --- DayLog Schema (Root) ---
export const DayLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  sessions: z.array(SessionSchema),
  nutrition: NutritionSchema,
  weigh_ins: z.array(WeighInSchema),
});

// --- Type Exports ---
export type DayLog = z.infer<typeof DayLogSchema>;
export type ExerciseSet = z.infer<typeof ExerciseSetSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type Nutrition = z.infer<typeof NutritionSchema>;
export type Meal = z.infer<typeof MealSchema>;
export type WeighIn = z.infer<typeof WeighInSchema>;
export type Macros = z.infer<typeof MacrosSchema>;
