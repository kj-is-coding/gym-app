import { getUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  // 1. Auth check
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse FormData
  const formData = await req.formData();
  const audioFile = formData.get("audio");

  // 3. Validate audio file
  if (!audioFile || !(audioFile instanceof File)) {
    return NextResponse.json(
      { error: "Audio file required" },
      { status: 400 }
    );
  }

  // 4. Call Groq Whisper API (whisper-large-v3-turbo — ~10x faster than whisper-1)
  try {
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3-turbo",
      language: "en",
      response_format: "json",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 }
    );
  }
}
