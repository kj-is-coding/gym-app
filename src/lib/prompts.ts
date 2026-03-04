import { ChatContext } from "./context";

const SYSTEM_PROMPT_BASE = `You are a fitness and nutrition tracking assistant. Help users log workouts, meals, and track their progress toward their goals.

Your capabilities:
- Log workout sets (weight, reps, RIR, drop sets, notes)
- Log meals and estimate macros
- Track weigh-ins
- Plan workouts based on past sessions (progressive overload)
- Calculate remaining macros for the day
- Provide coaching suggestions

Guidelines:
- Be concise and action-oriented
- For workout logging, confirm what was logged briefly
- For workout planning, reference the user's last session for that muscle group
- For nutrition questions, reference their goals and today's intake`;

function formatDayLogSummary(dayLog: {
  day_key: string;
  day_log: Record<string, unknown>;
}): string {
  const log = dayLog.day_log;
  const date = dayLog.day_key;

  // Extract key info from day_log JSONB
  const sessions = (log.sessions as Array<Record<string, unknown>>) || [];
  const nutrition = (log.nutrition as Record<string, unknown>) || {};
  const totals = (nutrition.totals as Record<string, number>) || {};

  let summary = `\n### ${date}\n`;

  // Sessions summary
  if (sessions.length > 0) {
    summary += `Workouts:\n`;
    for (const session of sessions) {
      const label = (session.label as string) || "Session";
      const exercises =
        (session.exercises as Array<Record<string, unknown>>) || [];
      summary += `- ${label}: ${exercises.map((e) => e.name).join(", ")}\n`;
    }
  }

  // Nutrition summary
  if (Object.keys(totals).length > 0) {
    summary += `Nutrition: ${totals.cal || 0} cal, ${totals.p || 0}g protein, ${totals.c || 0}g carbs, ${totals.f || 0}g fat\n`;
  }

  return summary;
}

function formatGoals(goals: Record<string, unknown> | null): string {
  if (!goals) {
    return "\n## User Goals\n(No goals set yet - ask user to configure goals)\n";
  }

  let section = "\n## User Goals\n";

  if (goals.goal_type) {
    section += `Goal: ${goals.goal_type}\n`;
  }
  if (goals.target_calories) {
    section += `Target Calories: ${goals.target_calories} cal/day\n`;
  }
  if (goals.target_protein) {
    section += `Target Protein: ${goals.target_protein}g/day\n`;
  }
  if (goals.target_carbs) {
    section += `Target Carbs: ${goals.target_carbs}g/day\n`;
  }
  if (goals.target_fat) {
    section += `Target Fat: ${goals.target_fat}g/day\n`;
  }

  return section;
}

export function buildSystemPrompt(context: ChatContext): string {
  let prompt = SYSTEM_PROMPT_BASE;

  // Add user goals
  prompt += formatGoals(context.goals);

  // Add past week context
  if (context.dayLogs.length > 0) {
    prompt += "\n## Past Week (Workout & Nutrition History)\n";
    prompt += "Use this to inform workout planning and progression:\n";

    for (const dayLog of context.dayLogs) {
      prompt += formatDayLogSummary(dayLog);
    }
  } else {
    prompt +=
      "\n## Past Week\n(No processed day logs yet - this may be a new user)\n";
  }

  // Add today's log separately for quick reference
  if (context.todayDayLog) {
    prompt += "\n## Today's Summary (so far)\n";
    prompt += formatDayLogSummary(context.todayDayLog);
  }

  return prompt;
}

// --- Process Day Prompts ---

export function buildProcessDayPrompt(
  messages: Array<{ role: string; content: string }>,
  dayKey: string
): string {
  return `You are a fitness data processor. Your task is to convert a day's worth of chat messages into a structured JSON log.

## Input
- Date: ${dayKey}
- Chat transcript (user and assistant messages from today):

${messages.map((m) => `[${m.role.toUpperCase()}]: ${m.content}`).join("\n\n")}

## Your Task
Extract all workout, nutrition, and weigh-in data from this conversation and output valid JSON matching the DayLog schema.

## Extraction Rules

### Sessions & Exercises
- Group exercises into sessions (gym sessions, home workouts, etc.)
- Infer session start times from message timestamps when possible
- Each exercise should have a canonical name (use common names like "Dumbbell curl", "Bench press")
- Capture alias_used if user used non-standard terminology
- Sets should be ordered chronologically
- Mark warmup sets if clearly indicated
- Link drop sets to their parent using drop_from_set_id (use incrementing IDs like "set-1", "set-2")
- Parse RIR (reps in reserve) and to_failure indicators
- Handle rep ranges like "8-10 reps" as tuples [8, 10]

### Nutrition
- Each distinct food/meal mentioned becomes a meal entry
- Estimate macros based on typical portion sizes
- Set uncertainty based on how specific the user was:
  - low: exact portions, specific foods
  - medium: some estimation needed
  - high: vague descriptions, unknown portions
- Calculate totals as sum of all meals
- Set overall nutrition uncertainty to the highest meal uncertainty

### Weigh-Ins
- Extract any weight measurements
- Infer context (morning, evening, etc.) from conversation
- Include timestamp if mentioned or infer from message order

### Handling Corrections
- If user corrects earlier data ("actually that was 7.5 not 17.5"), use the CORRECTED value
- Apply corrections to the relevant entry

### Missing Data
- If no workouts were logged, sessions should be an empty array
- If no nutrition was logged, use zero totals with high uncertainty
- If no weigh-ins, weigh_ins should be an empty array

## Output Format
Output ONLY valid JSON matching this structure. No markdown code blocks, no explanation.

Example output:
{
  "date": "${dayKey}",
  "sessions": [...],
  "nutrition": {
    "meals": [...],
    "totals": {"cal": 0, "p": 0, "c": 0, "f": 0},
    "uncertainty": "high"
  },
  "weigh_ins": [...]
}`;
}

export const PROCESS_DAY_SYSTEM_PROMPT =
  "You are a precise data extraction assistant. You output only valid JSON with no additional text or markdown formatting.";
