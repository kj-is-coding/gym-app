import { getUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  // 1. Check API key
  if (!process.env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY is not set");
    return NextResponse.json(
      { error: "Transcription service not configured" },
      { status: 500 }
    );
  }

  // 2. Auth check
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Parse FormData
  const formData = await req.formData();
  const audioFile = formData.get("audio");

  // 4. Validate audio file
  if (!audioFile || !(audioFile instanceof File)) {
    return NextResponse.json(
      { error: "Audio file required" },
      { status: 400 }
    );
  }

  console.log(`Transcribing audio: ${audioFile.name}, size: ${audioFile.size} bytes`);

  // 5. Call Groq Whisper API (whisper-large-v3-turbo — ~10x faster than whisper-1)
  try {
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3-turbo",
      language: "en",
      response_format: "json",
    });

    console.log(`Transcription success: "${transcription.text}"`);
    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error("Transcription error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    // Check for Groq-specific errors
    if (error && typeof error === "object" && "response" in error) {
      const response = (error as any).response;
      console.error("Groq API response:", response?.data, response?.status);
    }
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 }
    );
  }
}
