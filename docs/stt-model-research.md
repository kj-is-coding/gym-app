# STT / Transcription API Research — Faster Than `whisper-1`

**Date:** March 3, 2026
**Goal:** Find a drop-in or near-drop-in replacement for OpenAI `whisper-1` that is faster (lower wall-clock latency) for short English voice recordings (2–15 seconds) sent from a Next.js API route.

**Current setup:**

```
POST https://api.openai.com/v1/audio/transcriptions
model: whisper-1
input: audio/webm (Chrome) or audio/mp4 (iOS Safari)
called from: Next.js API route (server-side)
```

---

## Summary of Findings

### 1. OpenAI: `gpt-4o-mini-transcribe` and `gpt-4o-transcribe`

OpenAI released a new generation of transcription models in **March 2025**, with a snapshot update in **December 2025**.

- **Models:** `gpt-4o-mini-transcribe`, `gpt-4o-transcribe`
- **Endpoint:** Same as `whisper-1` — `POST /v1/audio/transcriptions`
- **Latency:** Quoted at ~320ms; real-world developer reports are mixed — some see improvement, some see worse latency or missing text vs. `whisper-1`. A meaningful subset of developers tried these and reverted to `whisper-1`.
- **Accuracy:** Measurably better WER than `whisper-1` (`gpt-4o-transcribe` is best; `gpt-4o-mini-transcribe` is a step below but still better than `whisper-1`).
- **Audio formats:** webm and mp4 are supported.
- **Pricing:** `gpt-4o-mini-transcribe` = **$0.003/min** (half the cost of `whisper-1`). `gpt-4o-transcribe` = $0.006/min (same as `whisper-1`).
- **API format:** Drop-in swap — same endpoint, same request shape. Change only `model: "whisper-1"` to `model: "gpt-4o-mini-transcribe"`.
- **Ease of swap:** 1 line change.
- **Caveat:** Community feedback indicates `gpt-4o-mini-transcribe` sometimes drops words or transcribes less reliably than `whisper-1` on short clips. Worth testing but not a guaranteed improvement. Notably, `gpt-4o-transcribe` does **not** support granular word-level timestamps (if you ever need those, stay on `whisper-1`).

**Verdict:** Easy to try. Speed improvement over `whisper-1` is not dramatic and is inconsistent in practice.

---

### 2. Groq Whisper (STRONGEST CANDIDATE)

Groq runs the Whisper model family on their **LPU (Language Processing Unit)** hardware, which provides dramatically faster inference than GPU-based implementations.

- **Models available:**
  - `whisper-large-v3-turbo` — 216x real-time speed factor; best balance of speed and accuracy
  - `whisper-large-v3` — 164–299x real-time; highest accuracy, slightly slower than turbo
  - `distil-whisper-large-v3-en` — 240x real-time; English-only; slightly lower accuracy than turbo
- **Latency:** At 216x real-time, a 10-second audio clip is transcribed in roughly **0.05 seconds of pure compute**. Wall-clock time (including network round-trip to Groq's servers) is reported as well under 1 second for short clips, commonly cited as significantly faster than `whisper-1`. The practical win is that `whisper-1` on OpenAI's API typically takes 1–3 seconds for short clips; Groq reduces this to the 200–600ms range in real-world use.
- **Accuracy:** `whisper-large-v3-turbo` has ~8.7% WER on short-form English, which is better than `whisper-1`. `distil-whisper` is slightly worse (~9.7% WER) but still competitive.
- **Audio formats:** webm and mp4 are explicitly supported. Full list: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm, opus.
- **Pricing:** `whisper-large-v3-turbo` = **$0.04/hour ($0.00067/min)** — roughly 9x cheaper than `whisper-1`. Minimum charge is 10 seconds per request.
- **API format:** OpenAI-compatible. Base URL is `https://api.groq.com/openai/v1`. You can use the `groq-sdk` npm package (which mirrors the `openai` SDK API shape) or switch the `baseURL` on the existing OpenAI client.
- **Ease of swap:** 3–5 lines of change (new env var, new client or baseURL override, new model name).
- **Tip from Groq docs:** Supplying `language: "en"` improves both speed and accuracy. Converting audio to WAV reduces latency further (though this adds client-side complexity — skippable for now).

---

### 3. Deepgram Nova-3

Deepgram is a purpose-built speech AI company with a proprietary non-Whisper model architecture optimized for low-latency streaming.

- **Model:** `nova-3` (current flagship as of 2026)
- **Latency:** Sub-300ms for streaming; batch (pre-recorded file) mode typically returns in well under 1 second for short clips. The billing is per-second of audio (no rounding up to the nearest minute).
- **Accuracy:** Strong — ~5.26–6.84% WER in production environments, better than Whisper-family models.
- **Audio formats:** webm and mp4 explicitly supported. Supports 100+ formats.
- **Pricing:** $0.0043/min for pre-recorded (batch); $0.0077/min for streaming. ~30–40% cheaper than `whisper-1` for batch mode.
- **API format:** NOT OpenAI-compatible. Deepgram has its own REST API. Requires a different request structure, different SDK (`@deepgram/sdk`), and a `DEEPGRAM_API_KEY`. Not a drop-in swap.
- **Ease of swap:** More work — need to rewrite the fetch call and response parsing. The Deepgram SDK is well-documented and the change is maybe 20–30 lines.
- **Free tier:** $200 in free credits for new accounts.

---

### 4. AssemblyAI Universal-2 / Universal-Streaming

AssemblyAI is a strong competitor to Deepgram with similar proprietary models.

- **Models:** `universal-2` (batch), `universal-streaming` (real-time streaming)
- **Latency:** ~300ms median for streaming (Universal-Streaming). Claims to be 41% faster than Deepgram Nova-3 for streaming latency. For batch transcription of short files, very fast — competitive with Deepgram.
- **Accuracy:** Excellent — 91%+ word accuracy on noisy real-world audio; 73% fewer false outputs from noise vs. Deepgram Nova-2.
- **Audio formats:** webm, mp4, and most common formats are supported.
- **Pricing:** Streaming at $0.15/hr; batch pricing is competitive with Deepgram.
- **API format:** NOT OpenAI-compatible. Requires AssemblyAI's own SDK (`assemblyai` npm package) and a different API structure. Not a drop-in swap.
- **Ease of swap:** Similar effort to Deepgram — requires rewriting the transcription call.

---

### 5. ElevenLabs Scribe v2 / Scribe v2 Realtime

ElevenLabs entered the STT market in early 2025 and quickly iterated.

- **Models:** `scribe_v1`, `scribe_v2`, `scribe_v2_realtime`
- **Latency:** Scribe v2 Realtime claims **~150ms latency** — the fastest figure of any provider found in this research. This is a streaming API, however.
- **Accuracy:** Scribe v2 Realtime hits 93.5% accuracy across 30 languages on the FLEURS benchmark.
- **Audio formats:** "Any format" accepted per their docs (MP4, MOV, MP3, WAV, etc.). WebM is not explicitly listed but the blanket statement likely covers it. Batch API is straightforward.
- **Pricing:** ~$0.40/hour for batch Scribe v1; pricing for v2 Realtime is separate (streaming-focused product).
- **API format:** ElevenLabs has its own REST API and SDK. Not OpenAI-compatible. Not a drop-in swap.
- **Ease of swap:** Requires SDK and request structure change.
- **Note:** Scribe v2 Realtime's 150ms latency headline applies to streaming (word-by-word emission). For the use case here (send a complete recorded clip, get back a transcript), batch mode is more relevant and latency will be higher.

---

### 6. Cloudflare Workers AI Whisper

Cloudflare offers Whisper as part of their Workers AI platform.

- **Model:** `@cf/openai/whisper` and `@cf/openai/whisper-large-v3-turbo`
- **Latency:** Suitable for edge deployment (close to users), but throughput/speed is not a primary focus — it is more of a convenience offering for developers already on Cloudflare.
- **Pricing:** Low (usage-based, part of Workers AI pricing), but the platform is oriented toward Cloudflare ecosystem integrations.
- **Verdict:** Not the best fit for this use case. The latency story is not as compelling as Groq, and the integration requires Cloudflare-specific plumbing. Skip for now.

---

### 7. Published Benchmarks — Key Takeaways

Multiple 2025 benchmarks (Artificial Analysis, WillowTree, NextLevel AI) converge on the same ranking for raw **file-upload-to-transcript** latency on short clips:

1. **Groq (distil-whisper or whisper-large-v3-turbo)** — consistently fastest WPM and lowest wall-clock time for batch transcription
2. **Deepgram Nova-3 / AssemblyAI Universal** — very fast, sub-300ms for streaming; batch mode also very fast
3. **OpenAI gpt-4o-mini-transcribe** — faster than `whisper-1` in ideal conditions, but inconsistent in practice
4. **OpenAI whisper-1** — baseline; 1–3 seconds for short clips in real-world usage
5. **AWS / Google / Azure** — 300–500ms+ and more expensive; not relevant here

---

## Options at a Glance

| Provider | Model | Latency (short clip) | Accuracy (WER) | Price/min | OpenAI-compatible? | Swap effort | webm/mp4 support |
|---|---|---|---|---|---|---|---|
| **Groq** | `whisper-large-v3-turbo` | ~200–500ms (est.) | ~8.7% | $0.00067 | Yes (base URL swap) | 3–5 lines | Yes |
| **Groq** | `distil-whisper-large-v3-en` | ~150–400ms (est.) | ~9.7% | Cheaper | Yes | 3–5 lines | Yes |
| **Deepgram** | `nova-3` | <300ms | ~6% | $0.0043 | No | ~20–30 lines | Yes |
| **AssemblyAI** | `universal-2` | <300ms | ~91% acc | ~$0.0065 | No | ~20–30 lines | Yes |
| **ElevenLabs** | `scribe_v2_realtime` | ~150ms (streaming) | 93.5% | ~$0.40/hr | No | ~20–30 lines | Likely |
| **OpenAI** | `gpt-4o-mini-transcribe` | ~320ms (inconsistent) | Better than whisper-1 | $0.003 | Yes (1 line) | 1 line | Yes |
| **OpenAI** | `whisper-1` (current) | ~1–3 seconds | ~10–15% | $0.006 | — | — | Yes |

---

## Recommendation

**Use Groq with `whisper-large-v3-turbo`.**

This is the best swap for this specific use case:

- **Fastest option** with a truly drop-in-compatible API (OpenAI SDK format)
- **9x cheaper** than `whisper-1`
- **Better accuracy** than `whisper-1`
- **Both webm and mp4** are explicitly supported — no audio preprocessing needed
- **Minimal code change** — swap the client init and model name; the rest of the route is identical
- English-only use case means the multilingual overhead of Large v3 Turbo is fine (Distil-Whisper English-only is marginally faster but Large v3 Turbo accuracy is better — prefer Turbo)

Deepgram Nova-3 is a legitimate alternative with slightly better accuracy, but it requires a full API rewrite. That's a reasonable second step if Groq's latency ends up being insufficient or if rate limits become an issue.

---

## How to Make the Change

### 1. Add environment variable

In `.env.local` (and in production environment):

```
GROQ_API_KEY=your_groq_api_key_here
```

Get a key at: https://console.groq.com

### 2. Install the Groq SDK

```bash
pnpm add groq-sdk
```

### 3. Update `/src/app/api/transcribe/route.ts`

**Before (current code):**

```typescript
import { getUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const audioFile = formData.get("audio");

  if (!audioFile || !(audioFile instanceof File)) {
    return NextResponse.json(
      { error: "Audio file required" },
      { status: 400 }
    );
  }

  try {
    const whisperFormData = new FormData();
    whisperFormData.append("file", audioFile);
    whisperFormData.append("model", "whisper-1");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: whisperFormData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Whisper API error:", errorText);
      return NextResponse.json(
        { error: "Transcription failed" },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ text: data.text });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 }
    );
  }
}
```

**After (Groq swap):**

```typescript
import { getUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import Groq from "groq-sdk";                          // NEW

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY }); // NEW

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const audioFile = formData.get("audio");

  if (!audioFile || !(audioFile instanceof File)) {
    return NextResponse.json(
      { error: "Audio file required" },
      { status: 400 }
    );
  }

  try {
    const transcription = await groq.audio.transcriptions.create({ // NEW
      file: audioFile,                                              // NEW
      model: "whisper-large-v3-turbo",                             // NEW
      language: "en",                                              // NEW (improves speed + accuracy)
      response_format: "json",                                     // NEW
    });

    return NextResponse.json({ text: transcription.text });        // SAME shape
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 }
    );
  }
}
```

**Required env vars:**
- `GROQ_API_KEY` — obtain from https://console.groq.com (free tier available)
- `OPENAI_API_KEY` — can be kept if used elsewhere in the app; not needed by this route after the swap

**Net change:** ~8 lines changed, response shape (`{ text: string }`) is identical — no client-side changes needed.

---

## Notes and Caveats

- **Groq rate limits:** The free tier has limits (roughly 20 requests/minute for audio). The paid tier is generous. For a gym logging app with normal usage patterns, the free tier is likely sufficient initially.
- **Minimum billing unit:** Groq charges a minimum of 10 seconds per request. For 2-second clips, you're billed as 10 seconds. At $0.00067/min this is essentially negligible.
- **WAV for lower latency:** Groq's docs note that WAV format reduces processing latency. The current setup sends webm/mp4 directly, which is fine. If squeezing every millisecond matters later, consider transcoding to WAV on the server before sending to Groq.
- **`language: "en"` param:** Explicitly passing this skips Groq's language detection step and meaningfully reduces latency. Always set it since the app is English-only.
- **Fallback option:** If Groq ever has an outage, switching back to `whisper-1` is a 1-line revert. Consider keeping `OPENAI_API_KEY` in env for this reason.

---

## Sources

- [OpenAI Next-Generation Audio Models Announcement](https://openai.com/index/introducing-our-next-generation-audio-models/)
- [OpenAI gpt-4o-mini-transcribe Model Docs](https://platform.openai.com/docs/models/gpt-4o-mini-transcribe)
- [OpenAI Transcription Pricing](https://platform.openai.com/docs/pricing)
- [Groq Whisper Large v3 Turbo Blog Post](https://groq.com/blog/whisper-large-v3-turbo-now-available-on-groq-combining-speed-quality-for-speech-recognition)
- [Groq Speech-to-Text Docs](https://console.groq.com/docs/speech-to-text)
- [Groq Whisper Large V3 164x Speed Factor (Artificial Analysis)](https://groq.com/blog/groq-runs-whisper-large-v3-at-a-164x-speed-factor-according-to-new-artificial-analysis-benchmark)
- [Groq Pricing](https://groq.com/pricing)
- [Groq Distil-Whisper Docs](https://console.groq.com/docs/model/distil-whisper-large-v3-en)
- [Deepgram Introducing Nova-3](https://deepgram.com/learn/introducing-nova-3-speech-to-text-api)
- [Deepgram Pricing 2026](https://brasstranscripts.com/blog/deepgram-pricing-per-minute-2025-real-time-vs-batch)
- [Deepgram Supported Audio Formats](https://developers.deepgram.com/docs/supported-audio-formats)
- [Whisper vs Deepgram (Deepgram)](https://deepgram.com/learn/whisper-vs-deepgram)
- [AssemblyAI Universal-Streaming Announcement](https://www.assemblyai.com/blog/introducing-universal-streaming)
- [AssemblyAI October 2025 Releases](https://www.assemblyai.com/blog/assemblyai-october-2025-releases)
- [ElevenLabs Scribe v2 Realtime](https://elevenlabs.io/blog/introducing-scribe-v2-realtime)
- [ElevenLabs STT API Pricing](https://elevenlabs.io/pricing/api)
- [Best STT APIs 2026 (Deepgram)](https://deepgram.com/learn/best-speech-to-text-apis-2026)
- [Top APIs for Real-Time STT 2026 (AssemblyAI)](https://www.assemblyai.com/blog/best-api-models-for-real-time-speech-recognition-and-transcription)
- [WillowTree: 10 STT Models Tested](https://www.willowtreeapps.com/craft/10-speech-to-text-models-tested)
- [STT APIs in 2026: Benchmarks (FutureAGI Substack)](https://futureagi.substack.com/p/speech-to-text-apis-in-2026-benchmarks)
- [Next.js + Groq Whisper Tutorial (Medium)](https://ninza7.medium.com/build-a-real-time-audio-to-text-app-with-whisper-ai-groq-api-and-next-js-15-7a1121b2e140)
- [Groq Whisper + Next.js 15 (Medium)](https://ninza7.medium.com/build-a-real-time-audio-to-text-app-with-whisper-ai-groq-api-and-next-js-15-7a1121b2e140)
- [OpenAI gpt-4o-mini-transcribe community feedback](https://community.openai.com/t/gpt-4o-mini-transcribe-and-gpt-4o-transcribe-not-as-good-as-whisper/1153905)
