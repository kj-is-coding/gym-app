import { supabaseAdmin } from "./db";

export interface DayLogSummary {
  day_key: string;
  day_log: Record<string, unknown>;
}

export interface UserGoals {
  target_calories?: number;
  target_protein?: number;
  target_carbs?: number;
  target_fat?: number;
  goal_type?: "bulk" | "lean_bulk" | "cut" | "maintain";
  [key: string]: unknown;
}

export interface ChatContext {
  dayLogs: DayLogSummary[];
  goals: UserGoals | null;
  todayDayLog: DayLogSummary | null;
}

/**
 * Load context for chat API: past 7 days of day_logs + user goals
 */
export async function loadChatContext(
  userId: string,
  currentDayKey: string
): Promise<ChatContext> {
  // Calculate date range: past 7 days including today
  const currentDate = new Date(currentDayKey);
  const sevenDaysAgo = new Date(currentDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  // Parallel queries for efficiency
  const [dayLogsResult, goalsResult] = await Promise.all([
    // Query 1: Past 7 days of day_logs (status = 'processed')
    supabaseAdmin
      .from("day_logs")
      .select("day_key, day_log")
      .eq("user_id", userId)
      .eq("status", "processed")
      .gte("day_key", sevenDaysAgoStr)
      .lte("day_key", currentDayKey)
      .order("day_key", { ascending: false }),

    // Query 2: User goals
    supabaseAdmin
      .from("user_goals")
      .select("data")
      .eq("user_id", userId)
      .single(),
  ]);

  const dayLogs = (dayLogsResult.data || []) as DayLogSummary[];
  const goals = (goalsResult.data?.data as UserGoals) || null;

  // Separate today's log if present
  const todayDayLog =
    dayLogs.find((log) => log.day_key === currentDayKey) || null;

  return {
    dayLogs,
    goals,
    todayDayLog,
  };
}
