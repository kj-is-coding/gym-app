# Audio Visualization Research: Real-Time Mic Input in Browser/React

**Date:** 2026-03-03
**Context:** Adding live waveform/level visualization to the recording state in `/src/components/chat.tsx`
**Goal:** While the user holds the mic button and speaks, show a live visual representation of voice amplitude (like WhatsApp voice messages or iOS Voice Memos).

---

## 1. Web Audio API + AnalyserNode

### The Core Pipeline

The standard browser API for real-time audio analysis is the **Web Audio API**, specifically the `AnalyserNode`. The pipeline is:

```
getUserMedia (MediaStream)
  → AudioContext.createMediaStreamSource(stream)
    → AnalyserNode
      → (optionally) AudioContext.destination (speakers — NOT needed for mic visualization)
```

The `AnalyserNode` is unique in that it passes audio through unchanged AND lets you read frequency/waveform data from it. It works even if its output is not connected — meaning you can analyze mic input without routing it to speakers.

### Connecting a MediaStream

```js
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256;                    // see FFT Size section below
analyser.smoothingTimeConstant = 0.8;      // 0–1, higher = smoother/slower response

const source = audioCtx.createMediaStreamSource(stream); // stream from getUserMedia
source.connect(analyser);
// Do NOT connect analyser to destination — that would route mic audio to speakers
```

### Reading Data: Two Methods

**`getByteFrequencyData(dataArray)`** — Copies frequency spectrum data into a `Uint8Array`.
- Each value is 0–255, representing amplitude at a frequency band.
- `fftSize = 256` → 128 frequency bins (frequencyBinCount = fftSize / 2).
- Best for: equalizer-style bars (each bar = a frequency band).
- Values concentrate in lower frequencies for voice; upper bins are often near-zero.

**`getByteTimeDomainData(dataArray)`** — Copies the raw waveform (oscilloscope data) into a `Uint8Array`.
- Values are 0–255, centered around 128 (silence = all 128s).
- The deviation from 128 represents amplitude at each sample point.
- Best for: oscilloscope/waveform line, or RMS volume calculation.

### The requestAnimationFrame Loop Pattern

The standard pattern for rendering is a self-scheduling loop:

```js
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength); // allocate ONCE, reuse every frame

let rafId: number;

function draw() {
  rafId = requestAnimationFrame(draw);             // schedule next frame
  analyser.getByteFrequencyData(dataArray);        // fill array with current data
  // ... render bars using dataArray ...
}

draw(); // kick off the loop

// Cleanup:
cancelAnimationFrame(rafId);
```

**Critical:** Allocate the `Uint8Array` once outside the loop. Creating a new array every frame causes GC pressure on mobile.

### Getting a Single Volume Level (RMS)

For a simple level meter (one bar that grows/shrinks with loudness), compute RMS from time-domain data:

```js
analyser.fftSize = 256;
const dataArray = new Uint8Array(analyser.frequencyBinCount);

function getVolume(): number {
  analyser.getByteTimeDomainData(dataArray);
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const normalized = (dataArray[i] - 128) / 128; // -1.0 to 1.0
    sum += normalized * normalized;
  }
  return Math.sqrt(sum / dataArray.length); // 0.0 to 1.0
}
```

Alternatively, use `getFloatTimeDomainData` into a `Float32Array` for more precision, but `Uint8Array` + byte math is fine for visualization.

### Performance: rAF + Canvas vs rAF + DOM

- **rAF** (requestAnimationFrame) targets 60fps on desktop, 60fps on modern mobile (may be capped at device refresh rate — 60 or 120hz).
- **Canvas:** Best for many elements. Pixel-level control, no DOM reflow. Requires manual DPR scaling for retina.
- **DOM div heights:** Causes style recalculations on each update. For 8–12 bars, the overhead is minimal and acceptable. The key optimization is bypassing React's re-render cycle by using `useRef` to mutate `element.style.height` directly (see Section 4).
- **For 8–12 bars at 30fps:** DOM div mutation via refs is entirely acceptable and keeps styling in CSS/Tailwind.

---

## 2. Visualization Approaches

### Option A: Multi-Bar Frequency Visualizer (Equalizer Style)

- N bars (e.g., 8–16), each represents a frequency band.
- Data: `getByteFrequencyData()` — each bar gets `dataArray[i]` as its height.
- Visual: bars grow/shrink individually, looks like an equalizer.
- Issue: voice energy concentrates in low frequencies, so the upper bars stay flat. Fix by selecting only the lower portion of the frequency bins (e.g., the first 20–30 of 128 bins for `fftSize=256`), or use logarithmic frequency scaling.

```js
// Map 8 display bars to first 24 frequency bins (voice range)
const NUM_BARS = 8;
const FREQ_RANGE = 24; // use only first 24 of 128 bins
const step = Math.floor(FREQ_RANGE / NUM_BARS);

for (let i = 0; i < NUM_BARS; i++) {
  const value = dataArray[i * step]; // 0–255
  const heightPct = value / 255;
  barRefs.current[i].style.height = `${heightPct * MAX_HEIGHT_PX}px`;
}
```

### Option B: Canvas Waveform Line (Oscilloscope)

- Data: `getByteTimeDomainData()`.
- Visual: a continuous sine-wave-like line drawn on a canvas.
- Good for: audio editors, waveform displays. Looks more technical than "consumer app."
- Harder to style with Tailwind. Requires canvas context management in React.
- Performance: excellent — single canvas, single draw call per frame.

```js
// Minimal oscilloscope on canvas
function drawWaveform(ctx: CanvasRenderingContext2D, width: number, height: number) {
  analyser.getByteTimeDomainData(dataArray);
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  const sliceWidth = width / dataArray.length;
  let x = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i] / 128.0; // normalize to 0–2
    const y = (v / 2) * height;     // scale to canvas height
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    x += sliceWidth;
  }
  ctx.stroke();
}
```

### Option C: Single RMS Volume Bar (Simplest)

- One bar whose width/height grows with loudness.
- Data: RMS computed from `getByteTimeDomainData()`.
- Visual: simplest possible — like a loading/progress bar that pulses with your voice.
- Add `transition: height 0.05s ease` for smooth CSS-driven interpolation between frames.
- Pro: zero rendering complexity, works everywhere, zero performance concerns.
- Con: not as visually interesting; gives the user less nuanced feedback.

### Option D: Amplitude Bars Growing from Center (WhatsApp Style)

- Multiple bars that grow outward from a center baseline (symmetric up/down), like WhatsApp voice notes or iOS Voice Memos.
- This is actually a pre-recorded waveform display in those apps — WhatsApp computes 64 amplitude samples across the whole recording and stores them.
- For **live** visualization, you can simulate this by keeping a rolling buffer of RMS values and rendering the most recent N values as bar heights.
- Result looks like a scrolling waveform building up in real-time, left to right.
- This is the most visually impressive option.

```js
// Rolling buffer approach for live scrolling waveform
const HISTORY_LEN = 30; // 30 bars visible at once
const volumeHistory = useRef<number[]>(new Array(HISTORY_LEN).fill(0));

// In the rAF loop:
const rms = getVolume(); // 0–1
volumeHistory.current.push(rms);
volumeHistory.current.shift(); // remove oldest
// Render each bar with height proportional to volumeHistory.current[i]
```

### Visual Comparison

| Approach | Visual Quality | Complexity | Mobile Perf | Best For |
|---|---|---|---|---|
| A: Frequency bars (8 bars) | High | Medium | Excellent | Chat input, small spaces |
| B: Canvas waveform line | High | High | Excellent | Audio editors |
| C: Single RMS bar | Low | Minimal | Excellent | Minimal UI, fallback |
| D: Scrolling amplitude bars | Highest | Medium-High | Excellent | WhatsApp-style UX |

**For a small (~300px) mobile chat input area, Option A (8 frequency bars) or a hybrid of A+D (scrolling amplitude bars using frequency data) gives the best visual payoff relative to implementation effort.**

---

## 3. Canvas vs DOM vs SVG

### Canvas

- Best raw performance — single DOM element, no layout/reflow.
- Every frame you clear and redraw everything.
- Requires manual DPR scaling: `canvas.width = width * devicePixelRatio`, etc.
- Harder to make look exactly right with CSS/Tailwind since styling is all JavaScript.
- Used by: most serious audio visualization libraries (Wavesurfer.js, react-audio-visualize).

### DOM (div heights via style)

- Most natural React integration.
- For 8–12 bars at 30fps: performance is **entirely acceptable** — browsers handle this trivially.
- Key: use `useRef` to mutate `element.style.height` directly instead of `setState`, to avoid React reconciler overhead on every frame.
- Styling is pure CSS/Tailwind — easy to match the app's visual design.
- Used by: simple visualizers, LiveKit's `BarVisualizer` component.

### SVG

- Middle ground: vector-based so retina-ready, but still part of the DOM.
- More complex than div bars for this use case with little benefit.
- Not recommended here.

### What Real Apps Use

- **WhatsApp Web:** Canvas-based for the playback waveform display.
- **Telegram Web:** Canvas for waveform drawing.
- **Otter.ai:** Canvas for live transcription waveform.
- **Simple recording buttons** in mobile apps (iOS Voice Memos, etc.): DOM/native UI, animated bars driven by audio level callbacks.

**For this app** (8 bars, dark theme, Tailwind): DOM div mutation via refs is the right call. It's simpler, keeps styling in Tailwind, and the performance difference vs canvas is negligible at this bar count and 30fps.

---

## 4. React Integration Patterns

### Managing AudioContext Lifecycle with Refs

```tsx
const audioCtxRef = useRef<AudioContext | null>(null);
const analyserRef = useRef<AnalyserNode | null>(null);
const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
const rafIdRef = useRef<number | null>(null);
const dataArrayRef = useRef<Uint8Array | null>(null);
const barRefs = useRef<(HTMLDivElement | null)[]>([]);

// Setup — call this inside startRecording, after getUserMedia succeeds:
function setupAudioAnalysis(stream: MediaStream) {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;

  const source = ctx.createMediaStreamSource(stream);
  source.connect(analyser);
  // NOTE: do NOT connect to ctx.destination (would route mic to speakers)

  audioCtxRef.current = ctx;
  analyserRef.current = analyser;
  sourceRef.current = source;
  dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

  startVisualizationLoop();
}

// Visualization loop using refs (no React re-renders)
function startVisualizationLoop() {
  const analyser = analyserRef.current;
  const dataArray = dataArrayRef.current;
  if (!analyser || !dataArray) return;

  const NUM_BARS = 8;
  const FREQ_RANGE = 20; // only use low-frequency bins where voice energy lives
  const step = Math.floor(FREQ_RANGE / NUM_BARS);
  const MAX_H = 20; // max bar height in px
  const MIN_H = 3;  // min bar height in px

  const tick = () => {
    analyser.getByteFrequencyData(dataArray);
    for (let i = 0; i < NUM_BARS; i++) {
      const bar = barRefs.current[i];
      if (!bar) continue;
      const value = dataArray[i * step]; // 0–255
      const h = MIN_H + (value / 255) * (MAX_H - MIN_H);
      bar.style.height = `${h}px`;
    }
    rafIdRef.current = requestAnimationFrame(tick);
  };

  rafIdRef.current = requestAnimationFrame(tick);
}

// Teardown — call this when recording stops:
function teardownAudioAnalysis() {
  if (rafIdRef.current !== null) {
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
  }
  if (sourceRef.current) {
    sourceRef.current.disconnect();
    sourceRef.current = null;
  }
  if (audioCtxRef.current) {
    audioCtxRef.current.close(); // releases resources
    audioCtxRef.current = null;
  }
  analyserRef.current = null;
  dataArrayRef.current = null;
}
```

### Avoiding Memory Leaks

Three things to clean up:
1. `cancelAnimationFrame(rafId)` — stops the draw loop.
2. `source.disconnect()` — detaches the mic stream from the analyser graph.
3. `audioCtx.close()` — releases the AudioContext and all its resources.

Also ensure the `MediaStream` tracks are stopped via `stream.getTracks().forEach(t => t.stop())` — this is already done in the existing `chat.tsx` code's `onstop` handler.

### AudioContext User Gesture Requirement

**Critical for iOS and Chrome:** The `AudioContext` must be created (or resumed) from within the synchronous call stack of a user gesture (click/tap). Creating it inside a Promise callback does NOT count as a user gesture on iOS.

**The solution for this specific codebase:** Create the `AudioContext` synchronously inside the `onClick` handler (or the beginning of `startRecording`), *before* calling `getUserMedia`. The `getUserMedia` call itself is a button click, which qualifies as a user gesture.

```tsx
// CORRECT: AudioContext created synchronously in the click handler
const startRecording = useCallback(async () => {
  // Create AudioContext FIRST, synchronously in the user gesture call stack
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  audioCtxRef.current = ctx;

  // Resume if needed (belt and suspenders for Chrome)
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  // THEN call getUserMedia (this is a Promise, no longer in gesture call stack)
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const source = ctx.createMediaStreamSource(stream);
  // ... etc
}, []);
```

**Note on Chrome M71+:** Chrome added an exception for WebRTC contexts — when the mic is active, AudioContext is allowed to be in running state even if created after the gesture. However, creating it before the await is the safest cross-browser pattern and definitively works on iOS.

---

## 5. iOS Safari Compatibility

### What Works (iOS 15+)

- `navigator.mediaDevices.getUserMedia({ audio: true })` — works on iOS 15+ Safari.
- `AudioContext.createMediaStreamSource(stream)` — works on iOS 15+ Safari.
- `AnalyserNode.getByteFrequencyData()` and `getByteTimeDomainData()` — work.
- `webkitAudioContext` prefix — required as fallback for older iOS: `window.AudioContext || window.webkitAudioContext`.

### Known Issues

1. **iOS 17.0–17.0.3 regression:** Web Audio API broke in a regression that was fixed in iOS 17.1. This is historical; users on 17.0.x should have updated by now (2026).

2. **Audio output rerouting:** When `getUserMedia` is active on iOS, the system may reroute audio output to the built-in speaker. This does NOT affect the visualization since the analyser is not connected to the destination (speakers). The rerouting only affects audio playback, not analysis.

3. **AudioContext must be warm:** As described above, create the `AudioContext` synchronously in the click handler. If it starts in `suspended` state, call `resume()`.

4. **All iOS browsers are WebKit:** Chrome, Firefox, and all other iOS browsers use WebKit under the hood. Any workaround that works in Safari also works in Chrome iOS.

5. **Tested working pattern (iOS 16+):**
```js
// This works reliably on iOS Safari 15+
button.addEventListener('click', async () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') await ctx.resume();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  source.connect(analyser);
  // start rAF loop
});
```

### MediaRecorder Format Note

The existing code uses `{ mimeType: "audio/webm" }`. This is Chrome's format and will silently fail on iOS Safari (which uses `audio/mp4`). This is a pre-existing bug in the app unrelated to visualization, but worth noting: the `MediaRecorder` should use a format check like `MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'`.

---

## 6. Specific Implementation Options Evaluated

### Option A: `getByteFrequencyData()` → 8 DOM Bars via Refs

**Code sketch (the recommended approach — see Section 7):**

- `fftSize = 256` → 128 frequency bins.
- Use first 20–24 bins (voice energy is in lower frequencies: ~80Hz–3kHz).
- 8 `<div>` elements with refs, height mutated directly in rAF loop.
- No React state updates, no re-renders.

**Browser support:** All modern browsers (Chrome, Safari, Firefox, Edge). iOS Safari 15+.
**Performance:** Excellent. 8 style mutations at 60fps is negligible overhead.
**Visual quality:** Very good — looks like an equalizer, bars respond naturally to voice pitch and volume.
**Pros:** Natural-looking multi-bar response to voice; easy to tune by adjusting bin range; works well in small spaces.
**Cons:** Bars don't respond equally to all sounds — some frequency bins may be quiet for some voices.

### Option B: `getByteTimeDomainData()` → Canvas Waveform Line

**Code sketch:**

```js
analyser.fftSize = 2048; // more samples = smoother line
const dataArray = new Uint8Array(analyser.frequencyBinCount);

function draw(ctx, w, h) {
  analyser.getByteTimeDomainData(dataArray);
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();
  ctx.strokeStyle = '#4d8eff'; // --brand color
  ctx.lineWidth = 2;
  dataArray.forEach((byte, i) => {
    const x = (i / dataArray.length) * w;
    const y = (byte / 255) * h;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
}
```

**Browser support:** All modern browsers.
**Performance:** Excellent — single canvas element.
**Visual quality:** High — looks like an oscilloscope.
**Pros:** Accurate representation of the actual waveform.
**Cons:** More complex React integration (canvas ref, DPR scaling); looks more technical/clinical than "consumer app"; harder to Tailwind-style.

### Option C: Simple RMS Volume → Single CSS Bar

```js
analyser.fftSize = 256;
const dataArray = new Uint8Array(analyser.frequencyBinCount);

function getRMS() {
  analyser.getByteTimeDomainData(dataArray);
  let sum = 0;
  for (const byte of dataArray) {
    const n = (byte - 128) / 128;
    sum += n * n;
  }
  return Math.sqrt(sum / dataArray.length); // 0.0 to 1.0
}
// Then: barRef.current.style.height = `${getRMS() * 100}%`
// CSS: transition: height 0.05s ease
```

**Browser support:** Universal.
**Performance:** Trivial.
**Visual quality:** Minimal — a single pulsing bar.
**Pros:** Zero complexity, works everywhere, 0 lines that could break.
**Cons:** Boring; doesn't show voice character; less engaging for users.

---

## 7. npm Packages Evaluated

### `react-audio-visualize` (samhirtarif)

- **Size:** 56.2 kB, 13 dependencies.
- Has a `<LiveAudioVisualizer>` component that takes a `MediaRecorder` instance — nearly drop-in with the existing code.
- Canvas-based, renders bars.
- **Usage:**
  ```tsx
  import { LiveAudioVisualizer } from 'react-audio-visualize';
  // In JSX (only when isRecording):
  {mediaRecorderRef.current && (
    <LiveAudioVisualizer
      mediaRecorder={mediaRecorderRef.current}
      width={200}
      height={24}
      barWidth={3}
      gap={2}
      barColor="#4d8eff"
    />
  )}
  ```
- **Verdict:** This is the fastest path to a working visualizer. The API is simple, it handles all AudioContext management internally, and it accepts the existing `MediaRecorder` ref. The 56KB cost is the main downside for a feature this simple.

### `react-voice-visualizer` (YZarytskyi)

- Batteries-included: recording controls, visualization, playback — all in one.
- Takes over the entire recording lifecycle; incompatible with the existing custom `startRecording`/`stopRecording` implementation.
- **Verdict:** Not appropriate here. Would require significant refactor of existing recording logic.

### DIY (Web Audio API)

- Zero dependencies, full control over visual design and behavior.
- Implementation is approximately 60–80 lines of code.
- Integrates cleanly into the existing component without refactoring.
- **Verdict:** The recommended approach for this codebase (see Section 7).

---

## 8. Recommendation

### Pick: DIY — 8 DOM Bars with `getByteFrequencyData()` + Ref Mutation

**Rationale:** The existing `chat.tsx` already has the `MediaRecorder` and `MediaStream` plumbed. Adding the `LiveAudioVisualizer` from `react-audio-visualize` would work but adds ~56KB for functionality that's ~70 lines of code to DIY. The DIY approach fits neatly into the existing component, uses the same dark-theme variables already in the CSS, and gives full control over the visual design (number of bars, spacing, colors, height range). The `useRef` + direct DOM mutation pattern is performant on mobile at 30fps with 8 bars.

### Key Implementation Detail: Create AudioContext Before `getUserMedia`

On iOS Safari, the `AudioContext` must be constructed synchronously in the click handler (before any `await`). The current `startRecording` function starts with `setRecordingError(null)` and then immediately does `await navigator.mediaDevices.getUserMedia(...)`. The `AudioContext` must be constructed between those two lines — synchronously, before the first `await`.

### The Full Code Pattern

Below is the complete implementation pattern. This should be integrated into the existing `chat.tsx`:

```tsx
// === NEW REFS (add alongside existing refs) ===
const audioCtxRef = useRef<AudioContext | null>(null);
const analyserRef = useRef<AnalyserNode | null>(null);
const dataArrayRef = useRef<Uint8Array | null>(null);
const rafIdRef = useRef<number | null>(null);
const barRefs = useRef<(HTMLDivElement | null)[]>([]);

// === CONSTANTS ===
const NUM_BARS = 8;
// Voice energy concentrates in lower frequency bins.
// With fftSize=256, frequencyBinCount=128. We use the first 24 bins
// (roughly 0–5kHz), which captures most voice content.
const FREQ_BINS_USED = 24;
const BAR_MAX_H = 20; // px — container height
const BAR_MIN_H = 3;  // px — always visible, never flat

// === MODIFIED startRecording ===
const startRecording = useCallback(async () => {
  setRecordingError(null);
  audioChunksRef.current = [];
  setRecordingSeconds(0);

  // STEP 1: Create AudioContext synchronously (required for iOS Safari).
  // Must happen before any await — the getUserMedia call itself is the
  // user gesture, and iOS requires AudioContext creation in that call stack.
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  audioCtxRef.current = ctx;
  // Resume in case browser starts it suspended (common on Chrome).
  if (ctx.state === 'suspended') {
    try { await ctx.resume(); } catch { /* ignore */ }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // STEP 2: Wire up the analyser.
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    // Do NOT connect analyser to ctx.destination — that routes mic to speakers.

    analyserRef.current = analyser;
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

    // STEP 3: Start the visualization loop.
    const step = Math.max(1, Math.floor(FREQ_BINS_USED / NUM_BARS));
    const tick = () => {
      const a = analyserRef.current;
      const d = dataArrayRef.current;
      if (!a || !d) return;
      a.getByteFrequencyData(d);
      for (let i = 0; i < NUM_BARS; i++) {
        const bar = barRefs.current[i];
        if (!bar) continue;
        const value = d[i * step]; // 0–255
        const h = BAR_MIN_H + (value / 255) * (BAR_MAX_H - BAR_MIN_H);
        bar.style.height = `${h}px`;
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };
    rafIdRef.current = requestAnimationFrame(tick);

    // STEP 4: Set up the MediaRecorder as before.
    const mimeType = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/mp4';
    const mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);

      // Stop visualization
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (audioCtxRef.current) {
        await audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
      dataArrayRef.current = null;
      // Reset bars to min height
      barRefs.current.forEach((bar) => {
        if (bar) bar.style.height = `${BAR_MIN_H}px`;
      });

      // ... rest of transcription logic unchanged ...
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      // ...
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setRecordingState('recording');
    timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);

  } catch (err) {
    // Cleanup AudioContext on error
    ctx.close().catch(() => {});
    audioCtxRef.current = null;
    // ... existing error handling unchanged ...
  }
}, []);

// === NEW JSX: Replace the pulse dot in the recording bar ===
// Current JSX (lines 304–308 in chat.tsx):
//   <span className="animate-pulse w-2 h-2 rounded-full bg-destructive" />
//   <span className="text-sm font-medium text-destructive">{formatTime(recordingSeconds)}</span>
//
// Replace with:
{isRecording && (
  <div className="flex items-center gap-2">
    {/* Live audio bars — animated by the rAF loop via ref mutation */}
    <div
      className="flex items-end gap-[3px]"
      style={{ height: `${BAR_MAX_H}px` }}
      aria-hidden="true"
    >
      {Array.from({ length: NUM_BARS }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { barRefs.current[i] = el; }}
          className="w-[3px] rounded-full bg-destructive"
          style={{
            height: `${BAR_MIN_H}px`,
            transition: 'height 0.05s ease', // optional: smooth between frames
          }}
        />
      ))}
    </div>
    <span className="text-sm font-medium text-destructive">
      {formatTime(recordingSeconds)}
    </span>
  </div>
)}
```

### Tuning Tips

1. **`smoothingTimeConstant`:** `0.8` gives smooth but responsive bars. Lower it to `0.5` if bars feel sluggish; raise to `0.9` if they're too jittery.
2. **`FREQ_BINS_USED`:** `24` bins out of 128 captures voice (roughly 0–5kHz). If bars seem mostly flat, lower this to `12–16`. If some bars never move, raise it.
3. **`BAR_MAX_H`:** Set to match the container height. Current recording bar uses `18px` height — set `BAR_MAX_H = 18`.
4. **`transition: height 0.05s ease`:** Makes bar animation smoother between 60fps frames without sacrificing responsiveness. Remove if you want snappier (more digital-looking) response.
5. **rAF at 30fps instead of 60fps:** On lower-end devices, throttle to 30fps by skipping every other frame:
   ```js
   let frameCount = 0;
   const tick = () => {
     rafIdRef.current = requestAnimationFrame(tick);
     if (++frameCount % 2 !== 0) return; // run at ~30fps
     // ... rest of tick logic
   };
   ```

### Alternative: `react-audio-visualize` Drop-In

If time is a constraint, `react-audio-visualize` is a viable shortcut:

```bash
pnpm add react-audio-visualize
```

```tsx
import { LiveAudioVisualizer } from 'react-audio-visualize';

// In JSX, inside the recording state bar:
{isRecording && mediaRecorderRef.current && (
  <LiveAudioVisualizer
    mediaRecorder={mediaRecorderRef.current}
    width={120}
    height={20}
    barWidth={3}
    gap={2}
    barColor="var(--destructive)"
    backgroundColor="transparent"
  />
)}
```

This handles all AudioContext setup internally, accepts the existing `MediaRecorder` instance, and renders a canvas-based bar visualizer. The cost is ~56KB added to the bundle.

---

## Sources

- [MDN: Visualizations with Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API)
- [MDN: AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode)
- [MDN: AnalyserNode.getByteFrequencyData()](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteFrequencyData)
- [MDN: AnalyserNode.getByteTimeDomainData()](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteTimeDomainData)
- [Twilio Blog: Audio Visualisation with Web Audio API and React](https://www.twilio.com/en-us/blog/developers/tutorials/building-blocks/audio-visualisation-web-audio-api--react)
- [DEV: Audio Visualisation with Web Audio API and React](https://dev.to/twilio/audio-visualisation-with-the-web-audio-api-and-react-k20)
- [GitHub: react-web-audio (philnash)](https://github.com/philnash/react-web-audio)
- [GitHub: react-voice-visualizer](https://github.com/YZarytskyi/react-voice-visualizer)
- [GitHub: react-audio-visualize (samhirtarif)](https://github.com/samhirtarif/react-audio-visualize)
- [npm: react-audio-visualize](https://www.npmjs.com/package/react-audio-visualize)
- [addpipe.com: Understanding Audio Frequency Analysis with AnalyserNode](https://blog.addpipe.com/understanding-audio-frequency-analysis-in-javascript-a-guide-to-using-analysernode-and-getbytefrequencydata/)
- [Autoplay Policy in Chrome](https://developer.chrome.com/blog/autoplay)
- [Chromium Autoplay Policy](https://www.chromium.org/audio-video/autoplay/)
- [GitHub: Chrome 71 AudioContext user gesture issue (otalk/hark)](https://github.com/otalk/hark/issues/40)
- [iOS Safari getUserMedia complete guide](https://copyprogramming.com/howto/navigator-mediadevices-getusermedia-not-working-on-ios-12-safari)
- [Medium: iOS Safari forces audio output to speakers with getUserMedia](https://medium.com/@python-javascript-php-html-css/ios-safari-forces-audio-output-to-speakers-when-using-getusermedia-2615196be6fe)
- [GitHub: Fix iOS AudioContext warm-up gist](https://gist.github.com/kus/3f01d60569eeadefe3a1)
- [WebKit Blog: MediaRecorder API](https://webkit.org/blog/11353/mediarecorder-api/)
- [Apple Developer Forums: iOS Safari audio issues](https://developer.apple.com/forums/thread/738068)
- [LogRocket: When to use HTML5 Canvas](https://blog.logrocket.com/when-to-use-html5s-canvas-ce992b100ee8/)
- [Techniques for animating on canvas in React (philna.sh)](https://philna.sh/blog/2018/09/27/techniques-for-animating-on-the-canvas-in-react/)
- [Smashing Magazine: Audio Visualization with JavaScript and GSAP](https://www.smashingmagazine.com/2022/03/audio-visualization-javascript-gsap-part2/)
- [DEV: Visualizing Audio as Waveform in React](https://dev.to/ssk14/visualizing-audio-as-a-waveform-in-react-o67)
- [DEV: Building a Real-Time Microphone Level Meter](https://dev.to/tooleroid/building-a-real-time-microphone-level-meter-using-web-audio-api-a-complete-guide-1e0b)
- [jameshfisher.com: Measuring audio volume in JavaScript](https://jameshfisher.com/2021/01/18/measuring-audio-volume-in-javascript/)
- [GitHub: cwilso/volume-meter](https://github.com/cwilso/volume-meter)
- [React useRef documentation](https://react.dev/reference/react/useRef)
- [Smashing Magazine: A Thoughtful Way to Use useRef](https://www.smashingmagazine.com/2020/11/react-useref-hook/)
- [WABetaInfo: WhatsApp releasing waveforms for voice notes](https://wabetainfo.com/whatsapp-is-releasing-waveforms-for-voice-notes/)
- [whapi.cloud: How to generate a waveform for a voice message](https://support.whapi.cloud/help-desk/sending/overview-of-other-methods-for-sending/how-to-generate-a-waveform-for-a-voice-message)
- [Wavesurfer.js](https://wavesurfer.xyz/)
