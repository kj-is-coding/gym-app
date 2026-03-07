import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dayKey = searchParams.get("day");

  if (!dayKey) {
    return NextResponse.json({ error: "Missing day parameter" }, { status: 400 });
  }

  const [{ data: dayLogRow }, { data: userGoalsRow }] = await Promise.all([
    supabaseAdmin
      .from("day_logs")
      .select("day_log, status, processed_at")
      .eq("user_id", user.id)
      .eq("day_key", dayKey)
      .single(),
    supabaseAdmin
      .from("user_goals")
      .select("data")
      .eq("user_id", user.id)
      .single(),
  ]);

  return NextResponse.json({
    dayLogRow,
    goals: (userGoalsRow?.data as { target_calories?: number; target_protein?: number; target_carbs?: number; target_fat?: number }) ?? null,
  });
}
