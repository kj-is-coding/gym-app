import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { z } from "zod";

const GoalsSchema = z.object({
  goal_type: z.enum(["bulk", "lean_bulk", "cut", "maintain"]).optional(),
  target_calories: z.number().int().positive().optional(),
  target_protein: z.number().int().positive().optional(),
  target_carbs: z.number().int().positive().optional(),
  target_fat: z.number().int().positive().optional(),
});

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("user_goals")
    .select("data")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ goals: data?.data ?? null });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = GoalsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid goals data" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("user_goals")
    .upsert(
      { user_id: user.id, data: parsed.data, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
