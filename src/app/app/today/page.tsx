import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { TodayView } from "@/components/today-view";
import { AppHeader } from "@/components/app-header";
import type { DayLogRow, UserGoals } from "@/types";

function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default async function TodayPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const todayKey = getLocalDate();

  const [{ data: dayLogRow }, { data: userGoalsRow }] = await Promise.all([
    supabaseAdmin
      .from("day_logs")
      .select("day_log, status, processed_at")
      .eq("user_id", user.id)
      .eq("day_key", todayKey)
      .single(),
    supabaseAdmin
      .from("user_goals")
      .select("data")
      .eq("user_id", user.id)
      .single(),
  ]);

  return (
    <>
      <AppHeader title={getTodayLabel()} />
      <div className="px-4 py-4">
        <TodayView
          dayLogRow={dayLogRow as DayLogRow | null}
          goals={(userGoalsRow?.data as UserGoals) ?? null}
        />
      </div>
    </>
  );
}
