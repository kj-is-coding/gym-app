import { getUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // 1. Check API key
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
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

  console.log(`Transcribing audio: ${audioFile.name}, size: ${audioFile.size} bytes, type: ${audioFile.type}`);

  // 5. Call Groq Whisper API directly using fetch
  try {
    const blob = await audioFile.arrayBuffer();
    const buffer = Buffer.from(blob);

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: (() => {
        const formData = new FormData();
        formData.append("file", new Blob([buffer], { type: audioFile.type }), audioFile.name);
        formData.append("model", "whisper-large-v3-turbo");
        formData.append("language", "en");
        formData.append("response_format", "json");
        return formData;
      })(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Groq API error: ${response.status} ${response.statusText}`, errorText);
      return NextResponse.json(
        { error: "Transcription service error" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`Transcription success: "${data.text}"`);
    return NextResponse.json({ text: data.text });
  } catch (error) {
    console.error("Transcription error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 }
    );
  }
}
