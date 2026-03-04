# Voice Recording — Transcribing State UI/UX Research

**Date:** March 3, 2026
**Context:** Dark-themed Next.js mobile web app (max-width 512px). React 19, Tailwind CSS v4, shadcn/ui. No animation library installed. Voice input cycles through: idle → recording → **transcribing** → idle. The transcribing state (upload + Whisper API, ~1-3 seconds) currently shows a boring spinner + "Transcribing…" text. Goal: replace it with something visually compelling.

**Current code (chat.tsx, lines 311-313):**
```tsx
<div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent border-muted-foreground animate-spin" />
<span className="text-sm text-muted-foreground">Transcribing…</span>
```

**Current globals.css already has:** `shimmer`, `dot-bounce` (typing dots), `msg-in`, `fade-in`, `ring-fill` keyframes — and imports `tw-animate-css`.

---

## 1. CSS-Only Animation Options

### 1A. Animated Sound Wave Bars (scaleY keyframes)

The gold standard for "I heard you, processing your words" feedback. Used by Spotify, Apple Music, and countless voice UIs. Five to seven thin vertical bars animate up and down with staggered timing, creating the illusion of a decaying audio signal.

**How it looks:** Vertical bars of varying heights bouncing at different rhythms. The outer bars are shorter, center bars taller — mimicking a natural frequency distribution. On a dark background with a blue/white color, it reads immediately as "audio."

**Core technique:**
```css
@keyframes voice-bar {
  0%, 100% { transform: scaleY(0.25); }
  50%       { transform: scaleY(1.0);  }
}

.voice-bar {
  transform-origin: bottom center;
  will-change: transform;
}
```

Each bar gets a different `animation-duration` (ranging ~0.7s–1.2s) and `animation-delay` to desynchronize them. Using `scaleY` instead of animating `height` directly is critical for 60fps mobile performance — it keeps all work at the GPU compositing stage.

**Full implementation (pure CSS, no library):**

In `globals.css`, add one keyframe (the project already has the pattern for this):
```css
@keyframes voice-bar {
  0%, 100% { transform: scaleY(0.2); opacity: 0.6; }
  50%       { transform: scaleY(1.0); opacity: 1;   }
}
```

In `chat.tsx`, replace the spinner:
```tsx
{isTranscribing && (
  <div className="flex items-center gap-2">
    <div
      className="flex items-end gap-[3px]"
      style={{ height: "18px" }}
      aria-label="Transcribing"
      aria-live="polite"
    >
      {[0.75, 1.1, 0.85, 1.2, 0.9, 1.05, 0.8].map((duration, i) => (
        <div
          key={i}
          className="w-[3px] h-full rounded-full bg-primary"
          style={{
            transformOrigin: "bottom center",
            animation: `voice-bar ${duration}s ease-in-out infinite`,
            animationDelay: `${i * 0.07}s`,
          }}
        />
      ))}
    </div>
    <span className="text-sm text-muted-foreground">Transcribing…</span>
  </div>
)}
```

The seven bars with the given durations and delays produce a convincingly organic waveform without any randomness logic.

**References:**
- [Samuel Kraft — Animated Music Bars with CSS](https://samuelkraft.com/blog/animated-music-bars) — the canonical write-up on this exact technique in React
- [CodePen: Sound Wave Loading Animation (yomateo)](https://codepen.io/yomateo/pen/ypbNrJ) — quiet/normal/loud named keyframe variant
- [CodePen: 10-Bar Sound Animation (elalemanyo)](https://codepen.io/elalemanyo/pen/wvjGYa) — variable-duration per bar
- [CodePen: Voice Animation CSS3 (Alexee)](https://codepen.io/Alexee/pen/ZEWVQeK) — rounded wider bars
- [How to Fake Sound in UI (Medium / Design Bootcamp)](https://medium.com/design-bootcamp/how-to-fake-sound-in-ui-c89768a6d85) — React-specific implementation, why `transform-origin: bottom center` matters
- [DEV.to: CSS Funstuff Animated Waveforms](https://dev.to/rolandixor/css-funstuff-animated-waveforms-4cja) — CSS custom property `--wavefreq` per bar

**Dependencies:** None
**Bundle size impact:** 0 bytes
**Mobile performance:** Excellent. `transform: scaleY()` + `opacity` are the two properties that trigger only compositing — no layout, no paint. `will-change: transform` on each bar promotes it to its own GPU layer. On even low-end Android devices this runs at 60fps.
**Rating for this use case: 9/10** — This is the most directly meaningful animation. It reads as "audio waveform settling down" which is exactly the semantic you want. Zero dependencies, trivial to add.

---

### 1B. Shimmer/Gradient Sweep on the Status Row

A horizontal light sweep across the status bar area, similar to skeleton loaders. This project already has a `shimmer` keyframe in `globals.css` — it could be repurposed here.

**How it looks:** A shimmer of slightly lighter dark color sweeps left-to-right across the strip that says "Transcribing…". Feels like the text itself is glowing/processing.

**How to implement:** The existing `.skeleton` class uses:
```css
background: linear-gradient(90deg, var(--muted) 25%, var(--border) 50%, var(--muted) 75%);
background-size: 200% 100%;
animation: shimmer 1.5s infinite;
```
Apply this to the status row's background div. Alternatively, apply `background-clip: text` for a text-specific shimmer:
```css
@keyframes text-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.transcribing-text {
  background: linear-gradient(
    90deg,
    var(--muted-foreground) 25%,
    #ffffff 50%,
    var(--muted-foreground) 75%
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: text-shimmer 1.8s ease-in-out infinite;
}
```

**Reference:**
- [AI SDK Elements — Shimmer component](https://ai-sdk.dev/elements/components/shimmer)
- [ElevenLabs UI — ShimmeringText](https://ui.elevenlabs.io/docs/components/shimmering-text) — production example in an AI product
- [CodePen: Shimmer Dark Mode](https://codepen.io/arsh-shaikh/pen/JjEQYmW)
- [CodePen: CSS Shimmer Text Effect](https://codepen.io/joshuapekera/pen/xGjMMq)

**Dependencies:** None (shimmer keyframe already exists in globals.css)
**Bundle size impact:** 0 bytes
**Mobile performance:** Excellent. Animates `background-position` — GPU-composited.
**Rating for this use case: 6/10** — Clean and effortless (reuses existing CSS), but feels more like a generic loading pattern than something voice-specific. Works well as a complement to the bars, not as a standalone replacement.

---

### 1C. SVG Oscilloscope / Sine Wave Animation

An SVG path that animates like an oscilloscope line — a continuous sine wave scrolling horizontally. More visual drama than bars.

**How it looks:** A single smooth wave line, like a heartbeat monitor or EQ visualizer, moving continuously from left to right.

**How to implement:**
```tsx
<svg width="80" height="20" viewBox="0 0 80 20">
  <path
    d="M0,10 C10,0 20,20 30,10 C40,0 50,20 60,10 C70,0 80,20 90,10"
    fill="none"
    stroke="var(--primary)"
    strokeWidth="2"
    strokeLinecap="round"
    style={{ animation: "wave-scroll 1s linear infinite" }}
  />
</svg>
```
```css
@keyframes wave-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-30px); }
}
```
The SVG viewBox clips the path so the animation appears as infinite scroll.

**References:**
- [SVG Audio Wave Loader (CodePen — rachelmcgrane)](https://codepen.io/rachelmcgrane/pen/VexWdX)
- [CSS-Tricks: Making an Audio Waveform Visualizer with Vanilla JS](https://css-tricks.com/making-an-audio-waveform-visualizer-with-vanilla-javascript/)

**Dependencies:** None
**Bundle size impact:** 0 bytes
**Mobile performance:** Good. Uses `translateX` (composited). SVG rendering overhead is minimal at this size.
**Rating for this use case: 7/10** — Beautiful, unique. The engineering is slightly trickier to get the looping seamless. Less immediately recognizable as "voice bars" than option 1A.

---

### 1D. Pulsing Dots (Enhanced — Not Standard Bounce)

The project already has typing dots for the AI thinking state (`.typing-dot`). For transcribing, a variation where 3-5 dots pulse in sequence with an audio-equalizer feel — growing/shrinking horizontally rather than bouncing vertically.

**How it looks:** Three dots that grow tall and shrink back in a sequential wave, like a tiny 3-bar EQ. Different from the existing up-bounce typing indicator.

**Dependencies:** None
**Bundle size impact:** 0 bytes
**Mobile performance:** Excellent
**Rating for this use case: 5/10** — Too similar to the existing AI thinking dots in the same UI. Would confuse the two states.

---

## 2. React Animation Libraries

### 2A. Motion (formerly Framer Motion)

**What it is:** The leading React animation library. Rebranded from `framer-motion` to `motion` in 2024. Available at `npm install motion`.

**Import path (new):**
```ts
import { motion } from "motion/react"
```

**What it offers for this use case:**
- `motion.div` with `animate={{ scaleY: [0.2, 1, 0.2] }}` + `transition={{ repeat: Infinity, duration: 0.9 }}` for bars — declarative, easy to read
- `staggerChildren` variants for orchestrating multiple bars without manual delay math
- `AnimatePresence` for entering/exiting the transcribing state with a fade/slide
- Path morphing via `motion.path animate={{ d: "..." }}` for mic → waveform icon transitions

**Bundle size:**
- Full `motion` component: ~34KB minified (not gzipped)
- `useAnimate` mini: 2.3KB — uses Web Animations API exclusively, no spring physics
- `LazyMotion` with `domAnimation`: ~15KB (+4.6KB for `LazyMotion` wrapper)
- For just animating bars: could use `useAnimate` at 2.3KB

**Example with stagger (most elegant approach):**
```tsx
import { motion } from "motion/react";

const barVariants = {
  animate: (i: number) => ({
    scaleY: [0.2, 1, 0.2],
    transition: {
      repeat: Infinity,
      duration: 0.8 + i * 0.1,
      ease: "easeInOut",
      delay: i * 0.07,
    },
  }),
};

function TranscribingBars() {
  return (
    <div className="flex items-end gap-[3px]" style={{ height: "18px" }}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <motion.div
          key={i}
          className="w-[3px] h-full rounded-full bg-primary"
          style={{ transformOrigin: "bottom center" }}
          variants={barVariants}
          animate="animate"
          custom={i}
        />
      ))}
    </div>
  );
}
```

**References:**
- [Motion for React — Official Docs](https://motion.dev/docs/react)
- [Motion: Reduce Bundle Size (LazyMotion)](https://motion.dev/docs/react-reduce-bundle-size)
- [Simple Loading Animation with Framer Motion (Seth Corker)](https://blog.sethcorker.com/an-easy-loading-animation-with-framer-motion/)
- [Motion SVG Animation — path morphing](https://motion.dev/docs/react-svg-animation)
- [LogRocket — Best React Animation Libraries 2026](https://blog.logrocket.com/best-react-animation-libraries/)

**Mobile performance:** Hybrid engine — uses Web Animations API (GPU) where possible, falls back to JS spring physics only when needed. Generally 60fps on mobile.

**When to add it:** Motion would become worthwhile if you also want `AnimatePresence` for page/modal transitions, gesture-driven interactions (swipe to dismiss), or layout animations elsewhere in the app. Adding it just for this one state is hard to justify given that pure CSS does the job equally well.

**Rating for this use case: 7/10 (if already installed) / 4/10 (as a new dependency for this alone)**

---

### 2B. React Spring

**What it is:** Physics-based animation library. Uses spring dynamics (natural feel, overshooting, damping) rather than tween keyframes.

**Bundle size:** ~19KB gzipped — lighter than Motion but no hybrid WAAPI engine.

**Key hook:** `useSprings` — animate an array of values (perfect for bars):
```tsx
import { useSprings, animated } from "@react-spring/web";

function TranscribingBars() {
  const springs = useSprings(7, (i) => ({
    from: { scaleY: 0.2 },
    to: async (next) => {
      while (true) {
        await next({ scaleY: 1.0 });
        await next({ scaleY: 0.2 });
      }
    },
    delay: i * 70,
    config: { tension: 200, friction: 10 },
  }));

  return (
    <div className="flex items-end gap-[3px]" style={{ height: "18px" }}>
      {springs.map((style, i) => (
        <animated.div
          key={i}
          className="w-[3px] h-full rounded-full bg-primary"
          style={{ ...style, transformOrigin: "bottom center" }}
        />
      ))}
    </div>
  );
}
```

The spring physics make bars feel more "alive" than linear CSS keyframes.

**References:**
- [React Spring — Official Site](https://react-spring.dev/)
- [React Spring vs Framer Motion — DhiWise](https://www.dhiwise.com/post/react-spring-vs-framer-motion-a-detailed-guide-to-react)
- [Morphing SVG With react-spring — CSS-Tricks](https://css-tricks.com/morphing-svg-with-react-spring/)

**Rating for this use case: 5/10** — Spring physics are overkill for a 1-3 second loading indicator. The natural bounce of spring tension/friction is nice but not meaningfully better than well-tuned CSS `ease-in-out`. Adds 19KB for marginal UX gain here.

---

### 2C. AutoAnimate

A 3KB library for automatic enter/exit animations. Not relevant for this specific use case — it handles list item add/remove, not custom loading animations.

---

## 3. Lottie Animations

**What Lottie is:** Pre-built vector animations exported from After Effects as JSON files, played back by a runtime library.

**Available animations:** LottieFiles has several relevant free animations:
- [Voice Command Animations collection](https://lottiefiles.com/free-animations/voice) — mic ripples, sound waves, voice indicators
- [Voice Animation (ripple/mic) #630](https://lottiefiles.com/630-voice) — ripple, sound, talk, mic, record UI elements
- [Free Voice Animation by Johnkutty KM #15238](https://lottiefiles.com/15238-voice-animation) — looping voice animation
- [Voice by Jason Bates #80490](https://lottiefiles.com/80490-voice) — clean voice waveform
- [Tiom AI Voice Collection](https://lottiefiles.com/collections/voice-CwKRzwdLC0) — broad collection of voice-themed animations

**Integration packages:**
- `lottie-react` (official LottieFiles): 82KB gzipped. SSR issue in Next.js (`document is not defined`) requires lazy loading.
- `react-lottie` (Airbnb community): `lottie-web` core is 237.5KB minified / 60.5KB gzipped. Same SSR issues.
- `@dotlottie/react`: The newer format, smaller files, but still large runtime.

**Next.js integration pattern (lazy loading required):**
```tsx
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

// Then:
import voiceAnimation from "./voice-animation.json";

function TranscribingState() {
  return <Lottie animationData={voiceAnimation} loop style={{ width: 40, height: 40 }} />;
}
```

**References:**
- [lottie-react — npm](https://www.npmjs.com/package/lottie-react)
- [Lazy Load Lottie in React — Medium](https://medium.com/@alonmiz1234/lazy-load-lottie-animation-in-react-e58e67e2aa74)
- [Bundle Size: lottie-web is 237.5kB — GitHub Issue](https://github.com/airbnb/lottie-web/issues/1184)
- [lottie-react is huge — GitHub Issue](https://github.com/chenqingspring/react-lottie/issues/79)

**Problems for this use case:**
1. **Massive bundle cost** — 82KB gzipped for the runtime, plus the JSON file. A casual loading indicator does not warrant this.
2. **SSR friction** — Requires `dynamic()` with `ssr: false` workaround.
3. **Color theming** — Pre-built Lotties are often hardcoded to light backgrounds or specific brand colors. Getting it to match the dark theme (`#08080c` background, `#4d8eff` brand blue) may require editing the JSON or rebuilding.
4. **Overkill** — These are After Effects exports. CSS bars look just as good or better for this specific shape.

**Mobile performance:** Lottie itself is CPU-rendered via Canvas or SVG. Simpler animations run fine; complex ones can drop frames on lower-end devices.

**Rating for this use case: 3/10** — Beautiful production-ready animations exist on LottieFiles, but the bundle cost is unjustifiable when CSS achieves the same semantic effect at 0 bytes. Revisit if Lottie is already in the project for other features.

---

## 4. Web Animations API (WAAPI)

The native browser API for scripted animations. No library needed.

**What it offers:**
```ts
element.animate(
  [
    { transform: "scaleY(0.2)", opacity: 0.6 },
    { transform: "scaleY(1.0)", opacity: 1.0 },
    { transform: "scaleY(0.2)", opacity: 0.6 },
  ],
  {
    duration: 900,
    iterations: Infinity,
    easing: "ease-in-out",
    delay: barIndex * 70,
  }
);
```

**Why this matters:** WAAPI runs animations off the main thread via the browser's compositor — same GPU acceleration as CSS animations, but with JavaScript control. You can pause, resume, reverse, or change playback rate programmatically.

**Practical pattern in React:**
```tsx
import { useEffect, useRef } from "react";

function TranscribingBars({ active }: { active: boolean }) {
  const barsRef = useRef<HTMLDivElement[]>([]);
  const animationsRef = useRef<Animation[]>([]);

  useEffect(() => {
    if (active) {
      animationsRef.current = barsRef.current.map((bar, i) =>
        bar.animate(
          [{ transform: "scaleY(0.2)" }, { transform: "scaleY(1)" }, { transform: "scaleY(0.2)" }],
          { duration: 800 + i * 80, iterations: Infinity, easing: "ease-in-out", delay: i * 70 }
        )
      );
    } else {
      animationsRef.current.forEach((a) => a.cancel());
    }
    return () => animationsRef.current.forEach((a) => a.cancel());
  }, [active]);

  return (
    <div className="flex items-end gap-[3px]" style={{ height: "18px" }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { if (el) barsRef.current[i] = el; }}
          className="w-[3px] h-full rounded-full bg-primary"
          style={{ transformOrigin: "bottom center" }}
        />
      ))}
    </div>
  );
}
```

**References:**
- [MDN: Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)
- [use-web-animations — React hook](https://github.com/wellyshen/use-web-animations)
- [CSS-Tricks: How I Used WAAPI to Build an Animation Library](https://css-tricks.com/how-i-used-the-waapi-to-build-an-animation-library/)

**Browser support:** 96%+ globally as of 2025. Fully available on iOS Safari 13.4+, Chrome 84+.

**Bundle size impact:** 0 bytes — native browser API
**Mobile performance:** Excellent — runs off main thread, same as CSS.
**Rating for this use case: 7/10** — The extra power (pause/resume/reverse) is not needed for a simple loading indicator. Pure CSS keyframes achieve the same result with less code. Use WAAPI if you want the bar animation to slow down and "settle" when transcription completes (can animate `playbackRate` to 0.1 gracefully).

---

## 5. Real-World Examples: How Voice Apps Do This

### OpenAI Playground (Whisper)
The [Hugging Face Whisper Space](https://huggingface.co/spaces/openai/whisper) shows a basic spinner during processing — not sophisticated, focused on functionality.

### Otter.ai
Otter shows a pulsing waveform visualization during live transcription with real audio frequency data. During the processing-only phase (after recording stops), it transitions to a simpler "transcribing" indicator with animated dots and a progress bar.

### Claude.ai Voice Mode
Claude's voice mode displays a waveform animation while speaking and listening. Per the [Claude Voice Mode documentation](https://www.datastudios.org/post/claude-voice-mode-from-tap-to-talk-to-fully-duplex-ai-conversations), visual feedback centers on animated waveform bars that respond to audio state — active during speech, calmer during processing.

### ChatGPT Advanced Voice Mode
OpenAI's [Advanced Voice Mode](https://www.emarketer.com/content/faq-on-voice-ai--how-chatgpt-openai-eclipsing-siri-alexa) uses a dynamic sphere that morphs and pulses. Gorgeous but expensive to implement: radial gradient CSS + WebGL-adjacent techniques. Too heavy for a 1-3 second loading state in a text input bar.

### ElevenLabs
Uses animated `ShimmeringText` (from their own UI library) with Motion — a gradient sweep across the text label while generating audio. Referenced from [ElevenLabs UI docs](https://ui.elevenlabs.io/docs/components/shimmering-text).

### Siri
The iconic "Siri glow" — an animated gradient orb at the bottom of the screen. CSS radial gradient with animated `background-position`. Visually strong but designed for full-screen takeover, not an inline input bar.

**Key pattern across all of them:** During the transcribing/processing phase (after user stops speaking), successful voice UIs universally gravitate toward **animated bars that "calm down"** rather than generic spinners. The bars communicate "I'm still working with audio" rather than "I'm loading a network resource." That semantic distinction is why bars beat spinners for this specific state.

---

## 6. Performance Considerations for Mobile

### Properties That Are Safe (GPU-Composited)
- `transform: scaleY()` — composited, no layout or paint
- `transform: translateX()` — composited
- `opacity` — composited

### Properties to Avoid
- `height`, `width` — triggers layout recalculation (reflow)
- `top`, `left`, `margin` — triggers layout
- `background-color` changes — triggers paint
- `box-shadow` changes — triggers paint

### The `transform-origin` Rule
When animating `scaleY` on vertical bars, always set `transform-origin: bottom center` so bars grow upward from a fixed base, not from their center. Forgetting this makes bars appear to float.

### `will-change` — Use Sparingly
```css
.voice-bar {
  will-change: transform;
}
```
This promotes the element to its own GPU layer before animation starts, eliminating the compositor promotion cost mid-animation. Use it on the bars themselves, not on the container. Remove it once animation ends (or use only while `isTranscribing` is true).

In Tailwind you can apply it: `className="will-change-transform"` — this is a built-in Tailwind utility class.

### Animation Count
7 bars animating simultaneously is trivial. Even 20 bars would be fine. The CPU load is negligible since these are compositor-only animations.

### Duration Guidelines
- Too fast (< 400ms loop): Looks frantic, anxiety-inducing
- Good range (700ms–1200ms per bar): Feels organic, breathing
- Too slow (> 2s): Loses the energy that communicates "actively processing"

### `prefers-reduced-motion`
Always respect this accessibility setting. Wrap the animation in a media query or conditionally apply it:
```css
@media (prefers-reduced-motion: reduce) {
  .voice-bar {
    animation: none;
    transform: scaleY(0.6);
    opacity: 0.7;
  }
}
```

### References
- [web.dev: High-Performance CSS Animations](https://web.dev/articles/animations-guide)
- [SitePoint: 60fps Mobile Animations with CSS3](https://www.sitepoint.com/achieve-60-fps-mobile-animations-with-css3/)
- [PixelFree Studio: Optimize Motion Design for Mobile](https://blog.pixelfreestudio.com/how-to-optimize-motion-design-for-mobile-performance/)

---

## 7. Specific Idea Evaluations

| Idea | Rating | Notes |
|---|---|---|
| Animated sound wave bars (scaleY) | **9/10** | Best fit. Audio-semantic, zero cost, trivial to add. |
| Oscilloscope SVG sine wave | 7/10 | Beautiful, slightly more engineering. Looping SVG path needs care. |
| Text shimmer sweep | 6/10 | Works great as complement to bars, weak standalone. |
| Morphing mic → waveform icon | 5/10 | Cool concept, needs SVG path compatibility + Motion library. Not worth it for 1-3s state. |
| Pulsing dots (enhanced) | 4/10 | Too similar to existing AI typing dots. Confusing in this UI. |
| Radial gradient orb (Siri-style) | 3/10 | Designed for full-screen. Wrong scale for an input bar. |
| Bars that "settle" on completion | 8/10 | Great enhancement on top of option 1A — slow the animation rate as transcription completes. |
| Character-by-character text reveal | 4/10 | Transcription takes 1-3s. Not enough time to make it feel meaningful vs gimmicky. |

---

## Tailwind CSS v4 Keyframe Integration

The project uses Tailwind v4 (CSS-first config, `@import "tailwindcss"` in globals.css). Adding a new keyframe is done directly in globals.css — no `tailwind.config.js` modification needed:

```css
/* In globals.css, alongside the existing shimmer/dot-bounce/etc keyframes */
@keyframes voice-bar {
  0%, 100% { transform: scaleY(0.2); opacity: 0.5; }
  50%       { transform: scaleY(1.0); opacity: 1;   }
}
```

Then reference it inline in JSX using Tailwind's arbitrary animation syntax:
```tsx
style={{ animation: `voice-bar ${duration}s ease-in-out infinite` }}
```

Or define it as a `--animate-*` theme variable for a utility class:
```css
@theme {
  --animate-voice-bar: voice-bar 0.9s ease-in-out infinite;
}
/* Usage: className="animate-voice-bar" */
```

Reference: [Tailwind CSS Animations Guide (Refine)](https://refine.dev/blog/tailwind-animations/)

---

## Recommendation

### Option 1 (Implement First): Pure CSS Animated Sound Wave Bars

**Why:** Zero dependencies. Zero bundle cost. Works immediately with the existing Tailwind v4 and CSS keyframe setup. The visual is semantically correct — audio bars communicate "I just heard you and I'm processing your audio" better than any spinner or generic loading pattern. Matches what the best voice UIs (Claude, Spotify, Apple Music) all use. Implementation is 15 lines of code + 5 lines of CSS.

**Implementation steps:**
1. Add `@keyframes voice-bar` to `globals.css`
2. Replace the spinner `<div>` + "Transcribing…" text in `chat.tsx` with the 7-bar component shown above
3. Optionally add `will-change-transform` Tailwind class to bars
4. Add `@media (prefers-reduced-motion)` fallback

**The exact diff is small.** Only two things change: a keyframe added to globals.css, and lines 311-313 of chat.tsx swapped out.

**Color to use:** `bg-primary` (the `#4d8eff` brand blue) for bars — matches the brand, visible on dark backgrounds, and clearly distinct from the red recording dot.

**Total time to implement:** 20-30 minutes.

---

### Option 2 (Enhancement Layer): Shimmer on the Status Row Background

**Why:** The project's existing `shimmer` keyframe can be applied to the status row's background with ~3 extra lines of CSS. Applied as a subtle background shimmer on the `bg-card` strip while `isTranscribing`, it adds a second visual cue without competing with the bars. Together they feel polished.

```tsx
// Add to the status bar div when isTranscribing:
className={cn(
  "flex items-center justify-between px-4 py-2 border-b border-border",
  isTranscribing && "skeleton" // reuses existing .skeleton class
)}
```

This reuses the existing skeleton keyframe exactly as-is. Takes ~2 minutes.

---

### Option 3 (If Motion Gets Added for Other Reasons): Motion stagger variant

If the team adds `motion` (formerly framer-motion) for other features — page transitions, `AnimatePresence` for sheets, gesture handling — the stagger variant becomes the best implementation. The `staggerChildren` approach produces more polished orchestration and `AnimatePresence` lets the bar component fade in when entering the transcribing state.

Do not add Motion solely for this animation. The CSS version is equivalent.

---

### Final Priority Order

1. **Option 1 (CSS bars)** — implement now, no tradeoffs
2. **Option 2 (background shimmer)** — add on top of Option 1 for extra polish, takes 2 minutes
3. **Option 3 (Motion stagger)** — only if Motion joins the project for other features

The combination of Options 1 + 2 gives you an animated waveform bar cluster with a subtle background shimmer — visually distinct from the recording state (red pulsing dot), semantically meaningful, and built entirely on CSS with no new dependencies.
