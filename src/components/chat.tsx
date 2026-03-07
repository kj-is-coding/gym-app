"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage, TextUIPart } from "ai";
import { useRef, useEffect, useState, FormEvent, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SuggestionChips } from "./suggestion-chips";
import { cn } from "@/lib/utils";

function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning!";
  if (hour < 17) return "Good afternoon!";
  return "Good evening!";
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is TextUIPart => part.type === "text")
    .map((part) => part.text)
    .join("");
}

/** Lightweight markdown: bold, italic, inline code, line breaks */
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    const rendered = parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={j}>{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={j} className="bg-secondary rounded px-1 py-0.5 text-[0.9em] font-mono">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
    return (
      <span key={i}>
        {rendered}
        {i < lines.length - 1 && line !== "" && <br />}
      </span>
    );
  });
}

type RecordingState = "idle" | "recording" | "transcribing" | "error";

const SUGGESTION_CHIPS = [
  { label: "Plan my workout", message: "Plan my workout for today" },
  { label: "Log a meal", message: "I just ate " },
  { label: "How am I doing?", message: "How am I doing today with nutrition and training?" },
];

const LOADING_MESSAGES = [
  "Thinking...",
  "Analyzing...",
  "Generating response...",
];

interface ChatProps {
  initialMessage?: string;
  variant?: "mobile" | "desktop";
}

export function Chat({ initialMessage, variant = "mobile" }: ChatProps) {
  const [input, setInput] = useState(initialMessage ?? "");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [loadingElapsed, setLoadingElapsed] = useState(0);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Audio visualization refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { dayKey: getLocalDate() },
    }),
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "submitted" || status === "streaming";
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messageCycleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track elapsed time and cycle status messages while loading
  useEffect(() => {
    if (isLoading) {
      setLoadingElapsed(0);
      setLoadingMessageIndex(0);

      loadingTimerRef.current = setInterval(() => {
        setLoadingElapsed((s) => s + 1);
      }, 1000);

      messageCycleTimerRef.current = setInterval(() => {
        setLoadingMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
      }, 2500);

      return () => {
        if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
        if (messageCycleTimerRef.current) clearInterval(messageCycleTimerRef.current);
      };
    } else {
      setLoadingElapsed(0);
      setLoadingMessageIndex(0);
    }
  }, [isLoading]);

  const loadingMessage = useMemo(
    () => LOADING_MESSAGES[loadingMessageIndex],
    [loadingMessageIndex]
  );

  const formatElapsedTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = 4 * 24 + 16;
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim() });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      sendMessage({ text: input.trim() });
      setInput("");
    }
  };

  const handleChipSelect = (message: string) => {
    if (message.endsWith(" ")) {
      setInput(message);
      setTimeout(() => textareaRef.current?.focus(), 0);
    } else {
      sendMessage({ text: message });
    }
  };

  const NUM_BARS = 8;
  const FREQ_BINS = 24;

  const stopVisualization = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    // Reset bars to minimum height
    barRefs.current.forEach((bar) => {
      if (bar) bar.style.height = "3px";
    });
  }, []);

  const startRecording = useCallback(async () => {
    setRecordingError(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    // Create AudioContext synchronously, before any await, so iOS Safari
    // recognises it as part of the user gesture call stack.
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch { /* ignore */ }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Wire up the AnalyserNode
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      // Do NOT connect analyser to ctx.destination — that would route mic to speakers
      analyserRef.current = analyser;

      // Start the rAF visualization loop
      const step = Math.max(1, Math.floor(FREQ_BINS / NUM_BARS));
      const drawBars = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        barRefs.current.forEach((bar, i) => {
          if (!bar) return;
          const value = data[i * step] / 255; // 0–1
          const height = Math.max(3, value * 32); // min 3px, max 32px
          bar.style.height = `${height}px`;
        });
        rafRef.current = requestAnimationFrame(drawBars);
      };
      rafRef.current = requestAnimationFrame(drawBars);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        stopVisualization();

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType === "audio/webm" ? "webm" : "mp4";
        const audioFile = new File([audioBlob], `recording.${ext}`, { type: mimeType });

        setRecordingState("transcribing");
        try {
          const formData = new FormData();
          formData.append("audio", audioFile);
          const response = await fetch("/api/transcribe", { method: "POST", body: formData });
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Transcription failed");
          }
          const data = await response.json();
          if (data.text) {
            setInput((prev) => (prev ? `${prev} ${data.text}` : data.text));
          }
          setRecordingState("idle");
        } catch (err) {
          setRecordingError(err instanceof Error ? err.message : "Transcription failed");
          setRecordingState("error");
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecordingState("recording");

      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      // Clean up AudioContext on getUserMedia failure
      ctx.close().catch(() => {});
      audioCtxRef.current = null;
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          setRecordingError("Microphone access denied. Enable it in browser settings.");
        } else if (err.name === "NotFoundError") {
          setRecordingError("No microphone detected.");
        } else {
          setRecordingError("Could not access microphone.");
        }
      } else {
        setRecordingError("Failed to start recording.");
      }
      setRecordingState("error");
    }
  }, [stopVisualization]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    stopVisualization();
    setRecordingState("idle");
    setRecordingSeconds(0);
  }, [stopVisualization]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const hasInput = input.trim().length > 0;
  const isRecording = recordingState === "recording";
  const isTranscribing = recordingState === "transcribing";

  return (
    <div
      className="flex flex-col"
      style={{
        height: variant === "desktop"
          ? "100%"
          : "calc(100dvh - 56px - 64px - env(safe-area-inset-bottom))"
      }}
    >
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-4">
            <div className="text-center">
              <p className="text-xl font-semibold text-foreground mb-1">{getGreeting()}</p>
              <p className="text-sm text-muted-foreground">Chat to log workouts, meals, and more</p>
            </div>
            <SuggestionChips chips={SUGGESTION_CHIPS} onSelect={handleChipSelect} />
          </div>
        )}

        {messages.map((message: UIMessage) => {
          const content = getMessageText(message);
          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              className={cn("flex msg-in", isUser ? "justify-end" : "justify-start")}
            >
              <div
                className="text-[15px] leading-relaxed"
                style={{
                  maxWidth: "82%",
                  padding: "10px 14px",
                  borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isUser ? "var(--brand)" : "var(--muted)",
                  color: isUser ? "#fff" : "var(--foreground)",
                  wordBreak: "break-word",
                }}
              >
                {isUser ? content : renderMarkdown(content)}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start msg-in">
            <div
              className="flex flex-col items-start gap-1"
              style={{
                padding: "12px 16px",
                borderRadius: "18px 18px 18px 4px",
                background: "var(--muted)",
              }}
            >
              <div className="flex gap-[5px] items-center">
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{loadingMessage}</span>
                {loadingElapsed > 5 && (
                  <span className="opacity-60">({formatElapsedTime(loadingElapsed)})</span>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-2">
            <p className="text-[13px] text-destructive">Something went wrong. Please try again.</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-card">
        {/* Recording state bar */}
        {(isRecording || isTranscribing) && (
          <div
            className={cn(
              "flex items-center justify-between px-4 py-2 border-b border-border",
              isRecording ? "bg-destructive/5" : "skeleton"
            )}
          >
            <div className="flex items-center gap-2">
              {isRecording ? (
                <>
                  <div className="flex items-end gap-[3px] h-8" aria-hidden="true">
                    {Array.from({ length: NUM_BARS }).map((_, i) => (
                      <div
                        key={i}
                        ref={(el) => { barRefs.current[i] = el; }}
                        className="w-[3px] rounded-full bg-destructive"
                        style={{ height: "3px", transition: "height 0.05s ease", transformOrigin: "bottom center" }}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-destructive">{formatTime(recordingSeconds)}</span>
                </>
              ) : (
                <>
                  <div
                    className="flex items-end gap-[3px]"
                    style={{ height: "18px" }}
                    aria-label="Transcribing audio"
                    aria-live="polite"
                  >
                    {([0.75, 1.1, 0.85, 1.2, 0.9, 1.05, 0.8] as const).map((duration, i) => (
                      <div
                        key={i}
                        className="voice-bar w-[3px] h-full rounded-full bg-primary"
                        style={
                          { "--bar-duration": `${duration}s`, animationDelay: `${i * 0.07}s` } as React.CSSProperties
                        }
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">Transcribing…</span>
                </>
              )}
            </div>
            {isRecording && (
              <button
                type="button"
                onClick={cancelRecording}
                className="text-[13px] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {/* Recording error */}
        {recordingState === "error" && recordingError && (
          <div className="px-4 py-2 flex items-center justify-between bg-destructive/5">
            <span className="text-[13px] text-destructive">{recordingError}</span>
            <button
              type="button"
              onClick={() => { setRecordingState("idle"); setRecordingError(null); }}
              className="text-[13px] text-muted-foreground"
            >
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2 px-3 py-3">
          {/* Mic button */}
          <Button
            type="button"
            size="icon"
            variant={isRecording ? "destructive" : "secondary"}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing || isLoading}
            title={isRecording ? "Stop recording" : "Voice input"}
            className={cn(
              "w-11 h-11 rounded-full shrink-0 disabled:opacity-40",
              isRecording && "ring-2 ring-destructive ring-offset-2 ring-offset-card recording-pulse"
            )}
          >
            {isRecording ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="3" width="10" height="10" rx="2" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            )}
          </Button>

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording ? "Recording…" : isTranscribing ? "Transcribing…" : "Message"
            }
            disabled={isLoading || isTranscribing}
            rows={1}
            className="flex-1 resize-none min-h-[44px] max-h-[112px] overflow-y-auto rounded-2xl text-base leading-6 border-border bg-muted focus-visible:ring-1 focus-visible:ring-primary px-4 py-2.5"
          />

          {/* Send button */}
          {hasInput && (
            <Button
              type="submit"
              size="icon"
              disabled={isLoading}
              className="w-11 h-11 rounded-full bg-primary text-primary-foreground shrink-0 disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
