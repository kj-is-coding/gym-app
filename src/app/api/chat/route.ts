import { streamText, UIMessage, convertToModelMessages } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { loadChatContext, ChatContext } from "@/lib/context";
import { buildSystemPrompt } from "@/lib/prompts";
import { NextResponse } from "next/server";

// Allow up to 60 seconds for streaming LLM responses (Vercel serverless function timeout)
export const maxDuration = 60;

export async function POST(req: Request) {
  // 1. Auth check
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse request body
  const { messages, dayKey }: { messages: UIMessage[]; dayKey: string } = await req.json();

  // 3. Validate inputs
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "Messages required" }, { status: 400 });
  }
  if (!dayKey) {
    return NextResponse.json({ error: "dayKey required" }, { status: 400 });
  }

  // 4. Load context (past 7 days + goals)
  let context: ChatContext;
  try {
    context = await loadChatContext(user.id, dayKey);
  } catch (error) {
    console.error("Failed to load context:", error);
    // Continue without context - graceful degradation
    context = { dayLogs: [], goals: null, todayDayLog: null };
  }

  // 5. Build system prompt
  const systemPrompt = buildSystemPrompt(context);

  // 6. Initialize z.ai client (OpenAI-compatible)
  const zai = createOpenAI({
    apiKey: process.env.ZAI_API_KEY,
    baseURL: process.env.ZAI_BASE_URL,
  });

  // 7. Save user message to DB (before streaming)
  const userMessage = messages[messages.length - 1]; // last message is new
  // Extract text content from UIMessage parts array
  const userContent = userMessage.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");

  const { error: userMsgError } = await supabaseAdmin.from("messages").insert({
    user_id: user.id,
    day_key: dayKey,
    role: "user",
    content: userContent,
    meta: {},
  });
  if (userMsgError) {
    console.error("Failed to insert user message:", userMsgError);
    // Don't block streaming - user experience first
  }

  // 8. Stream response using streamText with context-aware system prompt
  // Note: Using .chat() for legacy /chat/completions endpoint (z.ai doesn't support Responses API)
  // Note: Using convertToModelMessages() to convert UIMessage[] to ModelMessage[]
  const result = streamText({
    model: zai.chat("glm-4.6"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text, finishReason }) => {
      // 9. Save assistant response after streaming completes
      if (finishReason === "stop" && text) {
        const { error: assistantMsgError } = await supabaseAdmin
          .from("messages")
          .insert({
            user_id: user.id,
            day_key: dayKey,
            role: "assistant",
            content: text,
            meta: {},
          });
        if (assistantMsgError) {
          console.error("Failed to insert assistant message:", assistantMsgError);
        }
      }
    },
  });

  // 10. Return streaming response (UI message stream for useChat compatibility)
  return result.toUIMessageStreamResponse();
}
