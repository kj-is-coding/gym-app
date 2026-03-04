import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { NextResponse } from "next/server";

function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dayKey = getLocalDate();

  // Count user messages for today (role = 'user')
  const { count, error } = await supabaseAdmin
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("day_key", dayKey)
    .eq("role", "user");

  if (error) {
    console.error("Failed to fetch pending count:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending count" },
      { status: 500 }
    );
  }

  return NextResponse.json({ count: count ?? 0 });
}
