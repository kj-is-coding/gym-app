import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { NextResponse } from "next/server";
import { DayLogSchema, DayLog } from "@/lib/schemas";
import {
  buildProcessDayPrompt,
  PROCESS_DAY_SYSTEM_PROMPT,
} from "@/lib/prompts";

// Allow up to 60 seconds for LLM processing (Vercel serverless function timeout)
export const maxDuration = 60;

export async function POST(req: Request) {
  // 1. Auth check
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse request
  let dayKey: string;
  try {
    const body = await req.json();
    dayKey = body.dayKey;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!dayKey) {
    return NextResponse.json({ error: "dayKey required" }, { status: 400 });
  }

  // 3. Validate dayKey format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
    return NextResponse.json(
      { error: "Invalid dayKey format. Use YYYY-MM-DD" },
      { status: 400 }
    );
  }

  try {
    // 4. Fetch all messages for this user/day
    const { data: messages, error: fetchError } = await supabaseAdmin
      .from("messages")
      .select("role, content, created_at")
      .eq("user_id", user.id)
      .eq("day_key", dayKey)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("Failed to fetch messages:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages found for this day" },
        { status: 400 }
      );
    }

    // 5. Get max message ID for tracking
    const { data: maxIdResult } = await supabaseAdmin
      .from("messages")
      .select("id")
      .eq("user_id", user.id)
      .eq("day_key", dayKey)
      .order("id", { ascending: false })
      .limit(1)
      .single();

    const sourceMessageMaxId = maxIdResult?.id ?? null;

    // 6. Initialize z.ai client (OpenAI-compatible)
    const zai = createOpenAI({
      apiKey: process.env.ZAI_API_KEY,
      baseURL: process.env.ZAI_BASE_URL,
    });

    // 7. Build prompt and call LLM
    const prompt = buildProcessDayPrompt(messages, dayKey);

    // Note: Using .chat() for legacy /chat/completions endpoint (z.ai doesn't support Responses API)
    const { text } = await generateText({
      model: zai.chat("glm-4.6"),
      system: PROCESS_DAY_SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: 4000,
    });

    // 8. Parse and validate JSON
    let dayLog: DayLog;
    try {
      const parsed = JSON.parse(text);
      dayLog = DayLogSchema.parse(parsed);
    } catch (parseError) {
      console.error("Failed to parse/validate DayLog:", parseError);
      console.error("Raw LLM output:", text);

      // Store failed attempt for debugging
      await supabaseAdmin.from("day_logs").upsert({
        user_id: user.id,
        day_key: dayKey,
        status: "failed",
        error: `Parse/validation error: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        day_log: { raw: text },
        source_message_max_id: sourceMessageMaxId,
      });

      return NextResponse.json(
        {
          error: "Failed to generate valid DayLog",
          details:
            parseError instanceof Error
              ? parseError.message
              : "Unknown error",
        },
        { status: 500 }
      );
    }

    // 9. Store successful DayLog
    const { error: upsertError } = await supabaseAdmin
      .from("day_logs")
      .upsert({
        user_id: user.id,
        day_key: dayKey,
        status: "processed",
        day_log: dayLog,
        processed_at: new Date().toISOString(),
        source_message_max_id: sourceMessageMaxId,
      }, { onConflict: 'user_id,day_key' });

    if (upsertError) {
      console.error("Failed to store DayLog:", upsertError);
      return NextResponse.json(
        { error: "Failed to store DayLog" },
        { status: 500 }
      );
    }

    // 10. Return success with summary
    return NextResponse.json({
      success: true,
      dayLog,
      summary: {
        sessionsCount: dayLog.sessions.length,
        exercisesCount: dayLog.sessions.reduce(
          (sum: number, s: { exercises: unknown[] }) =>
            sum + s.exercises.length,
          0
        ),
        totalCalories: dayLog.nutrition.totals.cal,
        totalProtein: dayLog.nutrition.totals.p,
        weighInsCount: dayLog.weigh_ins.length,
      },
    });
  } catch (error) {
    console.error("Process day error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
