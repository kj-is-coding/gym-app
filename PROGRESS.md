# Progress

## Phase 1: Foundation

### 1.1 Bootstrap Project ✅
- Next.js 16.1.6 w/ TS, ESLint, Tailwind, App Router
- Runs at localhost:3000

### 1.2 Supabase Setup ✅
- Project created: `wqdvcrrhlpxxjvbhhmlk`
- Tables: `messages`, `day_logs`, `user_goals`
- RLS enabled + policies
- Email auth w/ autoconfirm (no verification)
- Env vars in `.env.local`
- DB client: `src/lib/db.ts`

### 1.3 Auth + Protected Routes ✅
- Login page at `/login` (magic link)
- Auth callback at `/auth/callback`
- Middleware protects `/app/*` routes
- Email allowlist: `src/lib/allowlist.ts`
- Protected chat page at `/app/chat`

### 1.4 Playwright Tests ✅
- Root `/` → redirects to `/login`
- Login page renders (email input + magic link button)
- Allowlist blocks non-allowed emails (shows error)
- Protected `/app/chat` → redirects to `/login`

---

## Phase 2: Core Loop

### 2.1 Chat UI ✅
- `/src/components/chat.tsx` - Chat component with `useChat` hook
- Uses AI SDK v6 with `DefaultChatTransport`
- Auto-scroll, loading states, error handling
- Dark theme with Tailwind

### 2.2 Chat API ✅
- `/src/app/api/chat/route.ts` - Streaming chat endpoint
- Auth check via `getUser()`
- z.ai integration (OpenAI-compatible, model: `glm-4.6`)
- Message persistence to Supabase (`messages` table)
- `day_key` tracking for daily logs
- **Fixed:** Uses `convertToModelMessages()` for AI SDK v6 UIMessage compatibility

### 2.3 Playwright Tests ✅
- Login page renders correctly
- Protected routes redirect to `/login`
- Form validation works
- API returns 401 for unauthenticated requests

### Dependencies Added
- `@ai-sdk/react@3.0.107`

---

## Phase 3: Structured Data

### 3.1 Context Loading ✅
- `/src/lib/context.ts` - `loadChatContext()` fetches past 7 days of day_logs + user goals
- `/src/lib/prompts.ts` - `buildSystemPrompt()` formats context for LLM
- Modified `/src/app/api/chat/route.ts` - injects system prompt with context
- Graceful degradation on context loading failures
- Parallel queries for efficiency

### 3.2 Finish Day Processor ✅
- `/src/lib/schemas.ts` - Zod schemas for DayLog validation (sessions, exercises, sets, nutrition, weigh_ins)
- `/src/app/api/process-day/route.ts` - POST endpoint
  - Fetches all messages for the day
  - Calls LLM with extraction prompt
  - Validates JSON against Zod schema
  - Upserts to `day_logs` table
  - Error handling with failed attempt storage
- Added to `/src/lib/prompts.ts` - process-day prompts

### 3.3 Today View ✅
- `/src/types/index.ts` - Type definitions for DayLog, Session, Exercise, etc.
- `/src/app/app/today/page.tsx` - Server component with auth + data fetching
- `/src/components/today-view.tsx` - Container with empty/loading/error states
- `/src/components/workout-section.tsx` - Sessions/exercises display
- `/src/components/nutrition-section.tsx` - Macros with progress bars
- `/src/components/remaining-section.tsx` - "Remaining to goal" calculations
- Added navigation link in chat page header

### Dependencies Added
- `zod` - Schema validation

---

## Phase 4: Polish

### 4.1 Finish Day Button ✅
- `/src/components/finish-day-button.tsx` (NEW) - Client component with loading/error states
- Modified `/src/app/app/chat/page.tsx` - Added button to header
- Calls `/api/process-day`, redirects to Today view on success

### 4.2 Voice Recording ✅
- `/src/app/api/transcribe/route.ts` (NEW) - OpenAI Whisper transcription endpoint
- Modified `/src/components/chat.tsx` - Added mic button with MediaRecorder
- 4 UI states: idle, recording (red pulse), transcribing, error
- Native browser APIs only (no new dependencies)

### 4.3 Deployment Config ✅
- Added `maxDuration = 60` to `/api/chat/route.ts` and `/api/process-day/route.ts`
- Fixed Suspense boundary in `/src/app/login/page.tsx`
- Production build verified (`pnpm build` succeeds)
- Ready for Vercel deployment

### 4.4 Bug Fixes & AI SDK v6 Compatibility ✅

#### Chat API Fix
- **Issue:** Chat UI showed "Something went wrong" despite API returning valid streaming data
- **Root Cause:** AI SDK v6 `useChat` sends `UIMessage` format (with `parts` array), but `streamText()` expects `CoreMessage` format (with `content` field)
- **Fix:** Added `convertToModelMessages()` from `ai` package to properly convert message formats
- **File:** `/src/app/api/chat/route.ts`

#### Process Day Fix
- **Issue:** Finish Day returned 500 "Failed to generate valid DayLog"
- **Root Causes:**
  1. Zod schema rejected `notes: null` (only allowed absent key, not null value)
  2. Zod schema rejected `unit: "lbs"` (only accepted "lb" singular)
- **Fixes in `/src/lib/schemas.ts`:**
  - Changed `notes: z.string().optional()` to `notes: z.string().nullish()`
  - Changed `unit: z.enum(["lb", "kg"])` to accept "lb"/"lbs"/"kg"/"kgs" with normalization
- **Fix in `/src/app/api/process-day/route.ts`:**
  - Added `onConflict: 'user_id,day_key'` to upsert for proper conflict handling

#### Today View NaN Fix
- **Issue:** Weight values displayed as "NaN-NaN lb" instead of actual numbers
- **Root Cause:** `Math.min()`/`Math.max()` received `null`/`undefined` values from nullable weight fields
- **Fix:** Added type guard filters in display components to ensure only numbers passed to math functions
- **Files:** `/src/components/workout-section.tsx`, `/src/components/today-view.tsx`

### 4.5 End-to-End Testing ✅
- All features tested and working via Playwright automation:
  - ✅ Chat sends messages and receives AI responses
  - ✅ Workout logging (exercises, sets, reps, weight)
  - ✅ Weigh-in logging
  - ✅ Nutrition logging
  - ✅ Finish Day processes and stores data
  - ✅ Today View displays all logged data correctly
  - ✅ Voice recording button visual feedback
  - ✅ No console errors or NaN displays

---

## Phase 5: UI Redesign

### 5.1 Design System & Foundation ✅
- Full CSS custom property token system in `globals.css`
  - Dark surfaces: `--surface-0` through `--surface-3`
  - Semantic: `--text-primary/secondary/tertiary`, `--brand` (blue), `--success/warning/error`
  - Macro colors: `--cal`, `--protein`, `--carbs`, `--fat`
- Mobile-first viewport config in root `layout.tsx` (safe-area-inset, no-scale, PWA meta)
- Shared app shell: `src/app/app/layout.tsx` (max-w-lg, bottom nav padding)

### 5.2 Navigation ✅
- `BottomTabBar` component: Chat | Today | More tabs, active state w/ accent color + filled icon
- `AppHeader` component: sticky 56px header with left/title/right slots
- Removed per-page header duplication (was copy-pasted in each page)

### 5.3 Chat Page Redesign ✅
- Auto-expanding textarea (4-line max), Enter to send
- Mic button (left) + send button (right, only appears when text entered)
- Animated typing dots instead of "Thinking…" text
- Lightweight markdown renderer: `**bold**`, `*italic*`, `` `code` ``
- `SuggestionChips` component: quick-send or populate-and-focus chips
- `BottomSheet` component: slide-up confirmation for Finish Day
- `FinishDayButton` redesigned as outlined pill button

### 5.4 Today Page Redesign ✅
- `CircularProgress` component: SVG rings for Cal/Protein/Carbs/Fat
- `NutritionSection`: macro rings card + collapsible meal rows w/ uncertainty dots
- `WorkoutSection`: collapsible session cards with exercise rows
- `WeighInCard`: icon + large weight value
- `TodayView`: empty/pending/failed states with CTAs
- Deleted `remaining-section.tsx` (merged into nutrition rings card)

### 5.5 New Pages ✅
- `/app/more` — menu: Goals, History, Sign Out
- `/app/goals` — `GoalsForm` with goal type selector + macro +/- steppers
- `/app/history` — `HistoryView` with calendar + day summary cards
- `/api/goals` — GET + POST endpoint (upserts to `user_goals` table)
- `/api/history` — GET by year/month returning processed day logs

### 5.6 Login Page Redesign ✅
- Barbell SVG logo mark
- Success state with checkmark
- Cleaner form layout

### 5.7 shadcn/ui Integration ✅
- Installed: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css`
- Added components: `Button`, `Card`/`CardContent`, `Badge`, `Input`, `Textarea`, `Separator`, `ScrollArea`
- Created `src/lib/utils.ts` with `cn()` helper
- CSS variable system migrated to OKLCH format for shadcn compatibility
  - `--surface-0` → `--background`, `--surface-1` → `--card`, etc.
  - Renamed `--accent` → `--brand` to avoid shadcn collision (shadcn uses `--accent` for hover states)
  - `--primary` = brand blue, `--muted` = elevated surface, `--border` = dividers
- Added `className="dark"` to `<html>` element
- Refactored all 12 components + all pages to use shadcn components + Tailwind classes (removed inline `style={{}}` props throughout)

### 5.8 Visual Bug Fixes ✅

#### Font Not Rendering (Times New Roman fallback)
- **Root Cause:** `--font-geist-sans` was set via className on `<body>`, but `globals.css` referenced it on `html { font-family: var(--font-geist-sans) }`. CSS variables don't inherit upward — `html` never got the variable, font-family declaration was invalid, browser fell back to system serif.
- **Fix:** Moved `geistSans.variable` and `geistMono.variable` className to `<html>` element in `layout.tsx`. Added `font-sans` class to `<body>`.

#### shadcn Card Default Padding Bloat
- **Root Cause:** shadcn `Card` defaults to `py-6 gap-6` (24px top/bottom padding + 24px gap between children). All list-style cards had this extra padding wrapping their content, making them visually bloated.
- **Fix:** Added `p-0 gap-0` to every Card used as a container (More page rows, Goals form inputs, Session cards, History calendar/day-summary, WeighIn card, Meals list).

#### AppHeader Glass Effect
- Added `backdrop-filter: blur(12px)` + `bg-card/80` to `AppHeader` — matches the bottom nav bar's glass style.

#### Suggestion Chips Contrast
- Changed from `bg-muted border-border` (low contrast) to `bg-secondary border-0` (solid, readable surface).

### Current Status
- Build: ✅ clean (`pnpm build` — 0 errors, 14 routes)
- Visual design: ✅ substantially improved — Geist font rendering, proper spacing, glass header

---

## Deployment Checklist

Before deploying to Vercel, ensure these env vars are configured:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ZAI_API_KEY`
- `ZAI_BASE_URL`
- `OPENAI_API_KEY`

---

## Development Notes

### BYPASS_AUTH for Local Testing
Set `BYPASS_AUTH=true` in `.env.local` to skip authentication during local development.
This creates a mock test user with email `test@local.dev`.

**WARNING:** Never enable this in production!

### z.ai API
- **Current model:** `glm-4.6` (using `.chat()` method for `/chat/completions` endpoint)
- Valid models on `api.z.ai/api/paas/v4/`: `glm-4.6`, `glm-4.7`, `glm-5`, `glm-4-plus`
- Requires account balance - returns "Insufficient balance" error if not funded
- If you get balance errors, check your z.ai dashboard to add credits

### AI SDK v6 Compatibility
- `useChat` hook sends `UIMessage` format with `parts: [{ type: "text", text: "..." }]`
- `streamText()` expects `CoreMessage` format with `content: "..."`
- **Solution:** Use `convertToModelMessages()` from `ai` package to convert formats
- **For z.ai:** Use `zai.chat("model")` instead of `zai("model")` for `/chat/completions` endpoint

### Playwright Testing
- Run `npx playwright test` to execute test suite
- Tests cover: login flow, protected routes, chat UI, auth bypass
- BYPASS_AUTH must be `true` for authenticated tests to work locally
