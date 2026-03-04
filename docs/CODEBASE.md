# Gym App Codebase Reference

A mobile-first AI-powered fitness and nutrition tracker. Users chat with an AI assistant to log workouts and meals, then process each day into a structured summary that displays macro rings, workout details, and weigh-ins.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Environment Variables](#environment-variables)
4. [Database Schema](#database-schema)
5. [Authentication and Access Control](#authentication-and-access-control)
6. [Data Types and Schemas](#data-types-and-schemas)
7. [Library Modules](#library-modules)
8. [App Routes and Pages](#app-routes-and-pages)
9. [API Routes](#api-routes)
10. [Components](#components)
11. [Styling System](#styling-system)
12. [Testing](#testing)
13. [Configuration Files](#configuration-files)

---

## Tech Stack

| Layer | Library / Version |
|---|---|
| Framework | Next.js 16.1.6 (App Router) |
| UI Runtime | React 19.2.3 |
| Language | TypeScript ^5 (strict mode) |
| Styling | Tailwind CSS v4 + `tw-animate-css` |
| UI Components | shadcn/ui (new-york style, slate base) |
| Component Variants | `class-variance-authority` 0.7.1 |
| Class Utilities | `clsx` + `tailwind-merge` 3.5.0 |
| Radix Primitives | `radix-ui` 1.4.3 (Slot, Separator, ScrollArea) |
| Icons | lucide-react |
| Database + Auth | Supabase (`@supabase/supabase-js` 2.98.0, `@supabase/ssr` 0.8.0) |
| AI Chat Streaming | Vercel AI SDK (`ai` 6.0.105, `@ai-sdk/react` 3.0.107, `@ai-sdk/openai` 3.0.37) |
| LLM Provider | z.ai (OpenAI-compatible endpoint, model: `glm-4.6`) |
| Voice Transcription | OpenAI Whisper (`whisper-1` via direct REST call) |
| Validation | Zod 4.3.6 |
| Testing | Playwright 1.58.2 |
| Package Manager | pnpm (workspace) |

---

## Project Structure

```
gym-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx              Root layout (fonts, metadata, dark mode)
│   │   ├── page.tsx                Root redirect → /app/chat
│   │   ├── globals.css             All CSS variables, animations, utilities
│   │   ├── login/
│   │   │   └── page.tsx            Magic link login page (client component)
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts        OAuth callback: code → session exchange
│   │   ├── app/
│   │   │   ├── layout.tsx          App shell (max-w-lg, BottomTabBar)
│   │   │   ├── chat/page.tsx       Chat page (server, renders Chat + FinishDayButton)
│   │   │   ├── today/page.tsx      Today page (server, fetches day_log + goals)
│   │   │   ├── more/page.tsx       More menu (Goals link, History link, Sign out)
│   │   │   ├── goals/page.tsx      Goals page (server, fetches goals, renders GoalsForm)
│   │   │   └── history/page.tsx    History page (server, renders HistoryView)
│   │   └── api/
│   │       ├── chat/route.ts       POST: stream AI response, persist messages
│   │       ├── process-day/route.ts POST: LLM extraction, store day_log
│   │       ├── transcribe/route.ts POST: Whisper speech-to-text
│   │       ├── goals/route.ts      GET + POST: read/write user_goals
│   │       └── history/route.ts    GET: month's day_logs for calendar view
│   ├── components/
│   │   ├── chat.tsx                Main chat UI (messages, voice, input)
│   │   ├── app-header.tsx          Sticky blurred header bar
│   │   ├── bottom-tab-bar.tsx      Fixed 3-tab navigation
│   │   ├── bottom-sheet.tsx        Modal bottom sheet
│   │   ├── suggestion-chips.tsx    Quick-action chips shown in empty chat
│   │   ├── finish-day-button.tsx   "Finish Day" flow (button → sheet → process)
│   │   ├── today-view.tsx          Today summary (weigh-in + workout + nutrition)
│   │   ├── workout-section.tsx     Collapsible session + exercise cards
│   │   ├── nutrition-section.tsx   Macro rings + expandable meal rows
│   │   ├── circular-progress.tsx   SVG donut ring for macro display
│   │   ├── goals-form.tsx          Goal type selector + macro number steppers
│   │   ├── history-view.tsx        Month calendar + day summary list
│   │   └── ui/                     shadcn/ui primitives
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── badge.tsx
│   │       ├── input.tsx
│   │       ├── textarea.tsx
│   │       ├── separator.tsx
│   │       └── scroll-area.tsx
│   ├── lib/
│   │   ├── auth.ts                 Server auth helpers + middleware implementation
│   │   ├── auth-client.ts          Browser Supabase client
│   │   ├── db.ts                   Server DB clients (anon + service role)
│   │   ├── allowlist.ts            Email allowlist (Set of allowed addresses)
│   │   ├── context.ts              loadChatContext: past 7 days + goals
│   │   ├── prompts.ts              System prompt + extraction prompt builders
│   │   ├── schemas.ts              Zod schemas for DayLog structure
│   │   └── utils.ts                cn() utility (clsx + tailwind-merge)
│   ├── types/
│   │   └── index.ts                TypeScript interfaces (stricter than Zod types)
│   └── middleware.ts               Next.js middleware: runs updateSession on every request
├── supabase/
│   └── schema.sql                  Full database schema + RLS policies (no migrations/ folder)
├── tests/
│   ├── chat.spec.ts                Basic auth/load smoke tests
│   └── ui-e2e.spec.ts              Comprehensive E2E visual + interaction tests
├── docs/
│   └── CODEBASE.md                 This file
├── components.json                 shadcn/ui config
├── next.config.ts                  Next.js config (empty — no special options)
├── playwright.config.ts            Playwright config
├── tsconfig.json                   TypeScript config
└── package.json                    Dependencies and scripts
```

---

## Environment Variables

### Required in production

```
# Supabase — public, safe to expose to browser
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Supabase — server-only, never exposed to browser
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # bypasses RLS; used by supabaseAdmin in API routes

# LLM — z.ai OpenAI-compatible endpoint
ZAI_API_KEY=
ZAI_BASE_URL=

# OpenAI — used only for Whisper transcription
OPENAI_API_KEY=
```

### Development only (`.env.local`)

```
BYPASS_AUTH=true
# NODE_ENV=development is set automatically by next dev
```

Both `BYPASS_AUTH === "true"` AND `NODE_ENV === "development"` must be true for bypass to activate.

---

## Database Schema

The schema lives in a single file at `supabase/schema.sql`. There is no `migrations/` subdirectory.

### Table: `messages`

Raw truth — every chat message sent by the user or assistant.

```sql
CREATE TABLE IF NOT EXISTS messages (
  id         BIGSERIAL   PRIMARY KEY,
  user_id    UUID        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  day_key    DATE        NOT NULL,   -- user's local date (YYYY-MM-DD)
  role       TEXT        NOT NULL CHECK (role IN ('user','assistant','system')),
  content    TEXT        NOT NULL,
  meta       JSONB       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS messages_user_day_idx ON messages (user_id, day_key, created_at);
```

### Table: `day_logs`

One row per user per day. Created with `status = 'pending'`, then upserted to `'processed'` or `'failed'` after LLM extraction.

```sql
CREATE TABLE IF NOT EXISTS day_logs (
  id                    BIGSERIAL   PRIMARY KEY,
  user_id               UUID        NOT NULL,
  day_key               DATE        NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at          TIMESTAMPTZ,
  processor_version     TEXT        NOT NULL DEFAULT 'v0',
  source_message_max_id BIGINT,         -- max message id at time of processing
  status                TEXT        NOT NULL DEFAULT 'pending'
                                        CHECK (status IN ('pending','processed','failed')),
  day_log               JSONB       NOT NULL DEFAULT '{}'::jsonb,  -- structured DayLog
  error                 TEXT                -- populated on failed status
);

CREATE UNIQUE INDEX IF NOT EXISTS day_logs_user_day_unique ON day_logs (user_id, day_key);
```

### Table: `user_goals`

One row per user. Upserted on conflict.

```sql
CREATE TABLE IF NOT EXISTS user_goals (
  user_id    UUID        PRIMARY KEY,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data       JSONB       NOT NULL   -- goal_type, target_calories, target_protein, etc.
);
```

### Row Level Security

RLS is enabled on all three tables. All policies use `auth.uid() = user_id`. API routes bypass RLS via the service role key (`supabaseAdmin`).

| Table | Operation | Policy Name |
|---|---|---|
| messages | SELECT | Users can view own messages |
| messages | INSERT | Users can insert own messages |
| day_logs | SELECT | Users can view own day_logs |
| day_logs | INSERT | Users can insert own day_logs |
| day_logs | UPDATE | Users can update own day_logs |
| user_goals | SELECT | Users can view own goals |
| user_goals | INSERT | Users can insert own goals |
| user_goals | UPDATE | Users can update own goals |

---

## Authentication and Access Control

### Middleware (`src/middleware.ts`)

Every incoming request passes through `updateSession` (from `src/lib/auth.ts`).

```ts
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

The regex matches everything except `_next/static`, `_next/image`, `favicon.ico`, and files ending in `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, or `.webp`.

### `src/lib/auth.ts`

**`isBypassAuthEnabled()`**: returns `true` only when `process.env.BYPASS_AUTH === "true"` AND `process.env.NODE_ENV === "development"`.

**`createClient()`**: server-side Supabase client using `cookies()` from `next/headers`. Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The `setAll` cookie method silently swallows errors (expected when called from Server Components that cannot set response cookies).

**`getUser()`**: returns `TEST_USER` when bypass is enabled, otherwise calls `supabase.auth.getUser()` and returns `user` or `null`.

**TEST_USER** (used in BYPASS_AUTH mode):

```ts
const TEST_USER: User = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "test@local.dev",
  app_metadata: {},
  user_metadata: { name: "Test User" },
  created_at: "2024-01-01T00:00:00Z",
  aud: "authenticated",
  role: "authenticated",
  updated_at: "2024-01-01T00:00:00Z",
};
```

**`createMiddlewareClient(request)`**: builds a Supabase client that reads cookies from `NextRequest` and writes them back to both the request object and a new `NextResponse.next()`. Returns `{ supabase, response }`.

**`updateSession(request)`**: the main middleware function.

1. If bypass is enabled: returns `NextResponse.next({ request })` immediately.
2. Calls `createMiddlewareClient(request)`, then `supabase.auth.getUser()`.
3. If path starts with `/app` and no user: clones URL, sets pathname to `/login`, returns redirect.
4. If path starts with `/app` and user has email: lazy-imports `./allowlist` (dynamic import), calls `isEmailAllowed(user.email)`. If not allowed: clones URL, sets pathname to `/login`, sets `?error=not_allowed`, returns redirect.
5. Returns the middleware response (which carries refreshed session cookies).

### `src/lib/auth-client.ts`

Browser-only Supabase client. Marked `"use client"`. Uses `createBrowserClient` from `@supabase/ssr` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### `src/lib/allowlist.ts`

```ts
export const ALLOWED_EMAILS = new Set([
  "karlasgerjuhl@gmail.com",
]);

export function isEmailAllowed(email: string): boolean {
  return ALLOWED_EMAILS.has(email.toLowerCase());
}
```

Contains exactly one allowed email. Comparison is always lowercased.

### Auth Flow

1. User visits any URL → middleware runs `updateSession`.
2. Unauthenticated visit to `/app/*` → redirect to `/login`.
3. Login page: user enters email → `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: "${window.location.origin}/auth/callback" } })` → magic link email sent.
4. User clicks link → `GET /auth/callback?code=...` → `supabase.auth.exchangeCodeForSession(code)` → redirect to `/app/chat` (or `?next` param if present).
5. Callback failure → redirect to `/login?error=auth_callback_error`.
6. Authenticated visit to `/app/*`: middleware checks allowlist. Allowed → proceed. Not allowed → redirect to `/login?error=not_allowed`.
7. Sign out: POST form to `/auth/signout` (handled by Supabase built-in route, not a custom handler in the codebase).

---

## Data Types and Schemas

### `src/types/index.ts`

Strict TypeScript interfaces used throughout the UI components. More strict than the Zod schemas (required fields, literal union types for `unit`).

```ts
interface MacroTotals {
  cal: number;
  p: number;
  c: number;
  f: number;
}

// Note: named "Set" in the file (conflicts with built-in but works in module scope)
interface Set {
  weight?: number;
  unit: "lb" | "kg";
  reps?: number | [number, number];
  rir?: number;
  to_failure?: boolean;
  is_warmup?: boolean;
  drop_from_set_id?: string | null;
  notes?: string | null;
}

interface Exercise {
  name: string;
  alias_used?: string | null;
  sets: Set[];
}

interface Session {
  label: string;
  start_time: string;
  exercises: Exercise[];
}

interface Meal {
  name: string;
  estimated_macros: MacroTotals;
  uncertainty: "low" | "medium" | "high";
}

interface WeighIn {
  weight: number;
  unit: string;
  context?: string;
  timestamp: string;
}

interface Nutrition {
  meals: Meal[];
  totals: MacroTotals;
  uncertainty: "low" | "medium" | "high";
}

interface DayLog {
  date: string;
  sessions: Session[];
  nutrition: Nutrition;
  weigh_ins: WeighIn[];
}

interface UserGoals {
  target_calories?: number;
  target_protein?: number;
  target_carbs?: number;
  target_fat?: number;
  goal_type?: "bulk" | "lean_bulk" | "cut" | "maintain";
}

interface DayLogRow {
  day_log: DayLog | null;
  status: "pending" | "processed" | "failed";
  processed_at: string | null;
}

interface UserGoalsRow {
  data: UserGoals | null;
}
```

### `src/lib/schemas.ts`

Zod schemas used exclusively in `POST /api/process-day` to validate the LLM-generated JSON. More permissive than the TypeScript interfaces: most fields are optional or nullable, `unit` accepts any string.

```ts
const ExerciseSetSchema = z.object({
  weight:           z.number().nullable().optional(),
  unit:             z.string().nullable().optional().default("lb"),
  reps:             z.union([z.number(), z.tuple([z.number(), z.number()])]).optional(),
  rir:              z.number().nullable().optional(),
  to_failure:       z.boolean().default(false).optional(),
  is_warmup:        z.boolean().default(false).optional(),
  drop_from_set_id: z.string().nullable().optional(),
  notes:            z.string().nullish(),
});

const ExerciseSchema = z.object({
  name:       z.string().optional(),
  alias_used: z.string().nullable().optional(),
  sets:       z.array(ExerciseSetSchema),
});

const SessionSchema = z.object({
  label:      z.string().optional(),       // e.g., "Gym", "Home workout"
  start_time: z.string().nullable().optional(),  // ISO timestamp
  exercises:  z.array(ExerciseSchema),
});

const MacrosSchema = z.object({
  cal: z.number(),  // calories
  p:   z.number(),  // protein (g)
  c:   z.number(),  // carbs (g)
  f:   z.number(),  // fat (g)
});

const MealSchema = z.object({
  name:             z.string().optional(),
  estimated_macros: MacrosSchema.optional(),
  uncertainty:      z.enum(["low", "medium", "high"]).optional(),
  timestamp:        z.string().optional(),
});

const NutritionSchema = z.object({
  meals:       z.array(MealSchema),
  totals:      MacrosSchema,
  uncertainty: z.enum(["low", "medium", "high"]),
});

const WeighInSchema = z.object({
  weight:    z.number().optional(),
  unit:      z.string().optional().default("lb"),
  context:   z.enum(["morning", "evening", "post_workout", "other"]).optional(),
  timestamp: z.string().nullable().optional(),
});

const DayLogSchema = z.object({
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),  // YYYY-MM-DD
  sessions:  z.array(SessionSchema),
  nutrition: NutritionSchema,
  weigh_ins: z.array(WeighInSchema),
});
```

All schemas export inferred types via `z.infer<>`: `DayLog`, `ExerciseSet`, `Exercise`, `Session`, `Nutrition`, `Meal`, `WeighIn`, `Macros`.

---

## Library Modules

### `src/lib/utils.ts`

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

`clsx` handles conditional class logic; `twMerge` deduplicates conflicting Tailwind classes (e.g., `bg-red-500 bg-blue-500` collapses to `bg-blue-500`).

### `src/lib/db.ts`

Two Supabase clients. Both use server-only env vars (no `NEXT_PUBLIC_` prefix — never leaked to the browser).

```ts
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

`supabaseAdmin` uses the service role key, which bypasses Row Level Security. It is used in all API routes and server pages so that server-side code always has full DB access regardless of which user is logged in.

### `src/lib/context.ts`

Interfaces and data loader for the chat system prompt context.

```ts
interface DayLogSummary {
  day_key: string;
  day_log: Record<string, unknown>;
}

interface UserGoals {
  target_calories?: number;
  target_protein?: number;
  target_carbs?: number;
  target_fat?: number;
  goal_type?: "bulk" | "lean_bulk" | "cut" | "maintain";
  [key: string]: unknown;   // index signature for JSONB flexibility
}

interface ChatContext {
  dayLogs: DayLogSummary[];    // all 7-day logs (may include today)
  goals: UserGoals | null;
  todayDayLog: DayLogSummary | null;  // today's log if it exists
}
```

**`loadChatContext(userId, currentDayKey)`**: runs two parallel `supabaseAdmin` queries:

1. `day_logs` WHERE `user_id = userId AND status = 'processed' AND day_key >= sevenDaysAgo AND day_key <= currentDayKey` ORDER BY `day_key DESC`. Date subtraction: `new Date(currentDayKey)`, `sevenDaysAgo.setDate(getDate() - 7)`, `toISOString().split("T")[0]`.

2. `user_goals` WHERE `user_id = userId` `.single()`.

Then finds `todayDayLog` by `dayLogs.find(log => log.day_key === currentDayKey)`.

Returns `{ dayLogs, goals, todayDayLog }`.

### `src/lib/prompts.ts`

#### `SYSTEM_PROMPT_BASE`

Literal string:

```
You are a fitness and nutrition tracking assistant. Help users log workouts, meals, and track their progress toward their goals.

Your capabilities:
- Log workout sets (weight, reps, RIR, drop sets, notes)
- Log meals and estimate macros
- Track weigh-ins
- Plan workouts based on past sessions (progressive overload)
- Calculate remaining macros for the day
- Provide coaching suggestions

Guidelines:
- Be concise and action-oriented
- For workout logging, confirm what was logged briefly
- For workout planning, reference the user's last session for that muscle group
- For nutrition questions, reference their goals and today's intake
```

#### `formatDayLogSummary(dayLog)`

Input: `{ day_key: string, day_log: Record<string, unknown> }`. Output:

```
### YYYY-MM-DD
Workouts:
- Label: exercise1, exercise2
Nutrition: X cal, Xg protein, Xg carbs, Xg fat
```

Sessions section only appears if `sessions.length > 0`. Nutrition section only appears if `totals` is non-empty. Exercises listed as comma-separated names per session.

#### `formatGoals(goals)`

If `goals` is null: produces `\n## User Goals\n(No goals set yet - ask user to configure goals)\n`.

Otherwise produces `\n## User Goals\n` followed by non-falsy lines for `goal_type`, `target_calories`, `target_protein`, `target_carbs`, `target_fat`.

#### `buildSystemPrompt(context)`

Concatenates:

1. `SYSTEM_PROMPT_BASE`
2. `formatGoals(context.goals)`
3. If `context.dayLogs.length > 0`: `\n## Past Week (Workout & Nutrition History)\nUse this to inform workout planning and progression:\n` + `formatDayLogSummary` for each log. Otherwise: `\n## Past Week\n(No processed day logs yet - this may be a new user)\n`.
4. If `context.todayDayLog` exists: `\n## Today's Summary (so far)\n` + `formatDayLogSummary(context.todayDayLog)`.

#### `buildProcessDayPrompt(messages, dayKey)`

Returns a complete extraction prompt string. Full content:

```
You are a fitness data processor. Your task is to convert a day's worth of chat messages into a structured JSON log.

## Input
- Date: {dayKey}
- Chat transcript (user and assistant messages from today):

[USER]: {content}

[ASSISTANT]: {content}
... (all messages joined by \n\n)

## Your Task
Extract all workout, nutrition, and weigh-in data from this conversation and output valid JSON matching the DayLog schema.

## Extraction Rules

### Sessions & Exercises
- Group exercises into sessions (gym sessions, home workouts, etc.)
- Infer session start times from message timestamps when possible
- Each exercise should have a canonical name (use common names like "Dumbbell curl", "Bench press")
- Capture alias_used if user used non-standard terminology
- Sets should be ordered chronologically
- Mark warmup sets if clearly indicated
- Link drop sets to their parent using drop_from_set_id (use incrementing IDs like "set-1", "set-2")
- Parse RIR (reps in reserve) and to_failure indicators
- Handle rep ranges like "8-10 reps" as tuples [8, 10]

### Nutrition
- Each distinct food/meal mentioned becomes a meal entry
- Estimate macros based on typical portion sizes
- Set uncertainty based on how specific the user was:
  - low: exact portions, specific foods
  - medium: some estimation needed
  - high: vague descriptions, unknown portions
- Calculate totals as sum of all meals
- Set overall nutrition uncertainty to the highest meal uncertainty

### Weigh-Ins
- Extract any weight measurements
- Infer context (morning, evening, etc.) from conversation
- Include timestamp if mentioned or infer from message order

### Handling Corrections
- If user corrects earlier data ("actually that was 7.5 not 17.5"), use the CORRECTED value
- Apply corrections to the relevant entry

### Missing Data
- If no workouts were logged, sessions should be an empty array
- If no nutrition was logged, use zero totals with high uncertainty
- If no weigh-ins, weigh_ins should be an empty array

## Output Format
Output ONLY valid JSON matching this structure. No markdown code blocks, no explanation.

Example output:
{
  "date": "{dayKey}",
  "sessions": [...],
  "nutrition": {
    "meals": [...],
    "totals": {"cal": 0, "p": 0, "c": 0, "f": 0},
    "uncertainty": "high"
  },
  "weigh_ins": [...]
}
```

#### `PROCESS_DAY_SYSTEM_PROMPT`

Literal string: `"You are a precise data extraction assistant. You output only valid JSON with no additional text or markdown formatting."`

---

## App Routes and Pages

### Root (`src/app/page.tsx`)

```ts
export default function Home() {
  redirect("/app/chat");
}
```

Immediately redirects. No rendering.

### Root Layout (`src/app/layout.tsx`)

```ts
export const metadata: Metadata = {
  title: "Gym App",
  description: "Track workouts and nutrition with AI",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gym App",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",      // enables env(safe-area-inset-*) on iOS
  themeColor: "#0c0c0e",
};
```

Renders `<html lang="en" className="dark {geistSans.variable} {geistMono.variable}">`. Always dark mode — no light mode support anywhere in the app.

Fonts: `Geist` (sans, variable `--font-geist-sans`) and `Geist_Mono` (mono, variable `--font-geist-mono`) loaded from `next/font/google` with `subsets: ["latin"]`.

### App Shell Layout (`src/app/app/layout.tsx`)

Wraps all `/app/*` pages:

```tsx
<div className="min-h-dvh bg-background text-foreground">
  <div className="max-w-lg mx-auto mb-bottom-nav">
    {children}
  </div>
  <BottomTabBar />
</div>
```

`mb-bottom-nav` = `margin-bottom: calc(64px + env(safe-area-inset-bottom))` — ensures page content never hides behind the fixed tab bar.

### Chat Page (`src/app/app/chat/page.tsx`)

Server component. Calls `getUser()`, redirects to `/login` if null.

Header title uses short date format: `new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })` — e.g., `"Mon, Jan 6"`.

Renders `<AppHeader title={label} right={<FinishDayButton />} />` and `<Chat />`.

### Today Page (`src/app/app/today/page.tsx`)

Server component. Calls `getUser()`, redirects to `/login` if null.

Computes `todayKey` using local time (not UTC) to avoid date boundary issues:

```ts
function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
```

Runs two parallel queries with `supabaseAdmin`:

1. `day_logs` SELECT `day_log, status, processed_at` WHERE `user_id = user.id AND day_key = todayKey` `.single()`
2. `user_goals` SELECT `data` WHERE `user_id = user.id` `.single()`

Both are run via `Promise.all`. Results passed as props to `<TodayView>`.

Header uses long date: `new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })` — e.g., `"Monday, January 6"`.

### More Page (`src/app/app/more/page.tsx`)

Server component. Single card with two nav items (Goals → `/app/goals`, History → `/app/history`) separated by a `<Separator>`. Second card has a POST form to `/auth/signout`. Footer paragraph shows `user.email`.

### Goals Page (`src/app/app/goals/page.tsx`)

Server component. Fetches `user_goals` via `supabaseAdmin .from("user_goals").select("data").eq("user_id", user.id).single()`. Renders `<AppHeader title="Goals" left={backButton}>` and `<GoalsForm currentGoals={...}>`. Back button is `<Button asChild variant="ghost" size="sm">` linking to `/app/more`.

### History Page (`src/app/app/history/page.tsx`)

Server component. No data fetched server-side — `<HistoryView>` handles its own client-side data fetching. Renders header with back button linking to `/app/more`.

### Login Page (`src/app/login/page.tsx`)

Client component (`"use client"`). Wraps `LoginForm` in `<Suspense>` (required for `useSearchParams()`). Fallback renders two skeleton `div`s (input + button shapes).

`LoginForm` states: `"idle" | "loading" | "sent" | "error"`.

On `?error=not_allowed` in search params: shows destructive banner "This email isn't on the access list."

On form submit: calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: \`${window.location.origin}/auth/callback\` } })`.

On success: transitions to `"sent"` state — shows green checkmark icon, "Check your email" heading, confirms the email address, and a "Use a different email" button that resets to `"idle"`.

On error: sets `status = "error"`, displays `error.message`.

### Auth Callback (`src/app/auth/callback/route.ts`)

GET handler. Extracts `code` and `next` (default `/app/chat`) from URL search params. Calls `supabase.auth.exchangeCodeForSession(code)`. On success: `NextResponse.redirect(${origin}${next})`. On any failure: `NextResponse.redirect(${origin}/login?error=auth_callback_error)`.

---

## API Routes

All routes auth-check first via `getUser()` and return `{ error: "Unauthorized" }` with status 401 if unauthenticated. All DB access uses `supabaseAdmin`.

### `POST /api/chat`

`export const maxDuration = 60` (Vercel function timeout).

Full request/response flow:

1. Auth check.
2. Parse `{ messages: UIMessage[], dayKey: string }` from JSON body.
3. Validate: `messages` must be an array, `dayKey` must be present. 400 on failure.
4. Call `loadChatContext(user.id, dayKey)`. On failure, gracefully falls back to `{ dayLogs: [], goals: null, todayDayLog: null }`.
5. Call `buildSystemPrompt(context)`.
6. Initialize z.ai client: `createOpenAI({ apiKey: process.env.ZAI_API_KEY, baseURL: process.env.ZAI_BASE_URL })`.
7. Extract text content from last `UIMessage` by filtering `parts` to `part.type === "text"`, joining text. Insert user message to `messages` table. Non-fatal on DB error.
8. Call `streamText({ model: zai.chat("glm-4.6"), system: systemPrompt, messages: await convertToModelMessages(messages) })`.
   - `zai.chat()` uses the legacy `/chat/completions` endpoint because z.ai does not support the Responses API.
   - `convertToModelMessages()` converts `UIMessage[]` to `ModelMessage[]` format.
9. `onFinish` callback: if `finishReason === "stop"` and `text` is non-empty, insert assistant message to `messages` table. Non-fatal on DB error.
10. Return `result.toUIMessageStreamResponse()`.

### `POST /api/process-day`

`export const maxDuration = 60`.

Full flow:

1. Auth check.
2. Parse JSON body, extract `dayKey`. Return 400 on parse error or missing `dayKey`.
3. Validate `dayKey` format with `/^\d{4}-\d{2}-\d{2}$/`. Return 400 on mismatch.
4. Fetch all messages for `user_id + day_key` from `messages` table, ordered by `created_at ASC`. Return 500 on DB error. Return 400 if no messages found (`"No messages found for this day"`).
5. Fetch max message `id` (for `source_message_max_id` tracking) via separate query.
6. Initialize z.ai client (same as chat route).
7. Call `buildProcessDayPrompt(messages, dayKey)`.
8. Call `generateText({ model: zai.chat("glm-4.6"), system: PROCESS_DAY_SYSTEM_PROMPT, prompt, maxOutputTokens: 4000 })`.
9. `JSON.parse(text)` then `DayLogSchema.parse(parsed)`. On parse or Zod validation failure: upsert `day_logs` row with `status: "failed"`, `error: "Parse/validation error: ..."`, `day_log: { raw: text }`. Return 500.
10. Upsert `day_logs` with `status: "processed"`, `day_log: dayLog`, `processed_at: new Date().toISOString()`, `onConflict: 'user_id,day_key'`. Return 500 on DB error.
11. Return `{ success: true, dayLog, summary: { sessionsCount, exercisesCount, totalCalories, totalProtein, weighInsCount } }`.

### `POST /api/transcribe`

1. Auth check.
2. Parse FormData, get `audio` field. Return 400 if missing or not a `File` instance.
3. Build new FormData with `file` = audioFile and `model` = `"whisper-1"`.
4. POST to `https://api.openai.com/v1/audio/transcriptions` with `Authorization: Bearer ${OPENAI_API_KEY}`.
5. On non-OK response: log error text, return 500 `{ error: "Transcription failed" }`.
6. Return `{ text: data.text }`.

### `GET /api/goals`

Returns `{ goals: data?.data ?? null }` from `user_goals` for authenticated user.

### `POST /api/goals`

Validates body against:

```ts
const GoalsSchema = z.object({
  goal_type:       z.enum(["bulk", "lean_bulk", "cut", "maintain"]).optional(),
  target_calories: z.number().int().positive().optional(),
  target_protein:  z.number().int().positive().optional(),
  target_carbs:    z.number().int().positive().optional(),
  target_fat:      z.number().int().positive().optional(),
});
```

Uses `safeParse`. Returns 400 `{ error: "Invalid goals data" }` on failure. Upserts `user_goals` with `onConflict: "user_id"`. Returns `{ success: true }` or 500 on DB error.

### `GET /api/history`

Query params: `year` (default: current year), `month` (default: current month, 1-indexed).

Builds date range:
- `startDate = "${year}-${paddedMonth}-01"`
- `endDate`: computed via `new Date(year, month, 0).getDate()` (day 0 of next month = last day of current month)

Queries `day_logs` WHERE `user_id = user.id AND status = 'processed' AND day_key >= startDate AND day_key <= endDate` ORDER BY `day_key DESC`.

Returns `{ logs: data ?? [] }`. Each log includes `day_key`, `status`, `day_log`.

---

## Components

### `Chat` (`src/components/chat.tsx`)

The main chat interface. Client component.

**State:**
- `input: string` — controlled textarea value
- `recordingState: "idle" | "recording" | "transcribing" | "error"`
- `recordingError: string | null`
- `recordingSeconds: number` — elapsed recording seconds shown as `"M:SS"`

**Refs:**
- `mediaRecorderRef` — active `MediaRecorder` instance
- `audioChunksRef` — `Blob[]` accumulated during recording
- `timerRef` — `setInterval` handle for the recording timer
- `textareaRef` — for programmatic focus and height resizing
- `messagesEndRef` — for auto-scroll to bottom

**Chat hook:**

```ts
const { messages, sendMessage, status, error } = useChat({
  transport: new DefaultChatTransport({
    api: "/api/chat",
    body: { dayKey: getLocalDate() },
  }),
});
const isLoading = status === "submitted" || status === "streaming";
```

`dayKey` is computed at component init time using local date (not UTC).

**Auto-scroll:** `useEffect` on `[messages, isLoading]` → `messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })`.

**Textarea auto-resize logic:**

```ts
const resizeTextarea = useCallback(() => {
  const el = textareaRef.current;
  if (!el) return;
  el.style.height = "auto";
  const maxHeight = 4 * 24 + 16;  // 112px: 4 lines × 24px line-height + 16px padding
  el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
}, []);

useEffect(() => { resizeTextarea(); }, [input, resizeTextarea]);
```

Runs on every `input` change. Overrides the native `field-sizing-content` behavior from the base `Textarea` component with a JavaScript-enforced max height.

**Message submission:**
- Form `onSubmit`: prevents default, calls `sendMessage({ text: input.trim() })`, clears input.
- Textarea `onKeyDown`: Enter (without Shift) submits. Shift+Enter inserts newline.

**`renderMarkdown(text)` — lightweight inline markdown:**

Splits text by `\n`. For each line, splits by regex `/(\\*\\*[^*]+\\*\\*|\\*[^*]+\\*|`[^`]+`)/g` to find inline markup. Renders:
- `**text**` → `<strong>text</strong>`
- `*text*` → `<em>text</em>`
- `` `text` `` → `<code className="bg-secondary rounded px-1 py-0.5 text-[0.9em] font-mono">text</code>`
- Plain text → rendered as-is
- Non-empty lines separated by `<br />` (empty lines produce no `<br>`)

User messages rendered as plain text. Assistant messages run through `renderMarkdown`.

**Suggestion chips:**

```ts
const SUGGESTION_CHIPS = [
  { label: "Plan my workout",  message: "Plan my workout for today" },
  { label: "Log a meal",       message: "I just ate " },   // trailing space → sets input
  { label: "How am I doing?",  message: "How am I doing today with nutrition and training?" },
];
```

`handleChipSelect(message)`: if message ends with `" "` → sets `input` to message and focuses textarea (so user can complete it). Otherwise → calls `sendMessage({ text: message })` directly.

**Voice recording state machine:**

States: `"idle"` → `"recording"` → `"transcribing"` → `"idle"` (success) or `"error"` (failure). Also: `"idle"` → `"recording"` → `"idle"` (cancel).

`startRecording()`:
1. Clears error, resets `audioChunksRef`, resets seconds counter.
2. Calls `navigator.mediaDevices.getUserMedia({ audio: true })`.
3. Creates `MediaRecorder(stream, { mimeType: "audio/webm" })`.
4. Sets `ondataavailable` to push non-empty chunks to `audioChunksRef.current`.
5. Sets `onstop` to the full transcription handler (see below).
6. Stores instance in `mediaRecorderRef.current`, calls `.start()`.
7. Sets state to `"recording"`.
8. Starts `setInterval(() => setRecordingSeconds(s => s + 1), 1000)`, stores in `timerRef`.

`onstop` handler (normal stop path):
1. Stops all stream tracks via `stream.getTracks().forEach(t => t.stop())`.
2. Clears `timerRef` interval.
3. Creates `Blob(audioChunksRef.current, { type: "audio/webm" })` → `File([blob], "recording.webm", { type: "audio/webm" })`.
4. Sets state to `"transcribing"`.
5. POSTs `FormData` with `audio` field to `/api/transcribe`.
6. On success: appends transcription text to `input` (`prev ? "${prev} ${data.text}" : data.text`), sets state to `"idle"`.
7. On fetch or API error: sets `recordingError`, sets state to `"error"`.

`stopRecording()`:
- If `mediaRecorder.state === "recording"`, calls `.stop()` (triggers `onstop`).
- Clears `timerRef`.

`cancelRecording()`:
- Overrides `onstop` to only stop stream tracks (no transcription logic).
- Calls `.stop()` if recording.
- Clears `timerRef`.
- Sets state to `"idle"`, resets seconds to 0.

`getUserMedia` error handling:
- `DOMException` with `name === "NotAllowedError"` → `"Microphone access denied. Enable it in browser settings."`
- `DOMException` with `name === "NotFoundError"` → `"No microphone detected."`
- Other `DOMException` → `"Could not access microphone."`
- Non-DOMException → `"Failed to start recording."`

**Layout:** `height: calc(100dvh - 56px - 64px - env(safe-area-inset-bottom))`. Viewport height minus header height (56px) minus bottom tab bar height (64px) minus iOS home bar.

**Mic button:** `variant="destructive"` + stop-square SVG icon when `isRecording`; `variant="secondary"` + mic SVG icon when idle. Disabled when `isTranscribing` or `isLoading`.

**Send button:** Only renders when `input.trim().length > 0`. Always primary color.

**Recording state bar** (shown above input when recording or transcribing):
- Recording: pulsing red dot + `formatTime(recordingSeconds)` + Cancel button (calls `cancelRecording`).
- Transcribing: spinning circle + `"Transcribing…"` text. No cancel.
- Background: `bg-destructive/5` when recording, `bg-card` when transcribing.

**Recording error bar** (shown when `recordingState === "error"`): error text in destructive color + Dismiss button that clears the error and resets to `"idle"`.

**Loading indicator:** Three `.typing-dot` spans — `w-1.5 h-1.5 rounded-full bg-muted-foreground`.

**Error display (chat SDK error):** `<p className="text-[13px] text-destructive">Something went wrong. Please try again.</p>` centered below messages.

**Message bubbles:**
- User: right-aligned, `background: var(--brand)`, `color: #fff`, `borderRadius: "18px 18px 4px 18px"`.
- Assistant: left-aligned, `background: var(--muted)`, `color: var(--foreground)`, `borderRadius: "18px 18px 18px 4px"`.
- Both: `maxWidth: "82%"`, `padding: "10px 14px"`, `.msg-in` animation class.

### `AppHeader` (`src/components/app-header.tsx`)

```ts
interface AppHeaderProps {
  title: string;
  right?: React.ReactNode;
  left?: React.ReactNode;
}
```

Sticky, `z-40`, `h-14`, `bg-card/80`, `backdropFilter: blur(12px)`, `paddingTop: env(safe-area-inset-top)`. Three-column flex layout: left slot | centered title | right slot. All slots are optional.

### `BottomTabBar` (`src/components/bottom-tab-bar.tsx`)

Client component. Uses `usePathname()` from `next/navigation`.

Three tabs defined inline:
```ts
[
  { href: "/app/chat",    label: "Chat" },
  { href: "/app/today",   label: "Today" },
  { href: "/app/more",    label: "More" },
]
```

Active detection: `pathname === tab.href || pathname.startsWith(tab.href + "/")`.

Active tab: `text-primary font-semibold`. Inactive: `text-muted-foreground font-normal`.

Fixed bottom, `z-50`, `max-w-lg mx-auto`, `backdropFilter: blur(12px)`. Each tab min-height 56px. Custom inline SVG icons for each tab with distinct filled/outline variants for active/inactive states.

### `BottomSheet` (`src/components/bottom-sheet.tsx`)

```ts
interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}
```

Returns `null` when `!open`.

When open:
- `useEffect` adds `keydown` listener for `Escape` → calls `onClose`.
- `useEffect` sets `document.body.style.overflow = "hidden"` to lock background scroll; restores on cleanup.
- Backdrop: full-screen `bg-black/60` div; click calls `onClose`.
- Sheet panel: `rounded-t-2xl`, positioned at bottom, `paddingBottom: max(env(safe-area-inset-bottom), 24px)`.
- Drag handle visual: `9×4px` `rounded-full bg-border` div at top center.

### `SuggestionChips` (`src/components/suggestion-chips.tsx`)

```ts
interface SuggestionChip {
  label: string;
  message: string;
}

interface SuggestionChipsProps {
  chips: SuggestionChip[];
  onSelect: (message: string) => void;
}
```

Renders `<Button variant="outline" size="sm" className="rounded-full">` for each chip. Passes `chip.message` to `onSelect` on click.

### `FinishDayButton` (`src/components/finish-day-button.tsx`)

Client component. State: `sheetOpen: boolean`, `isLoading: boolean`, `error: string`.

**Four distinct states:**

1. **Idle** (`!sheetOpen && !isLoading`): shows "Finish Day" outline button with primary text/border color.

2. **Sheet open** (`sheetOpen && !isLoading`): renders `<BottomSheet>` containing confirmation copy, Cancel button (calls `onClose`), and "Process Day" button (calls `handleFinishDay`). If `error` is set, shows it in a destructive-styled box inside the sheet.

3. **Loading** (`isLoading`): sheet is hidden (the `sheetOpen && !isLoading` condition is false). Shows a `fixed inset-0 bg-black/90 z-50` overlay with a centered spinner and `"Processing today's log…"` text.

4. **Error** (state after failed process): stays in state 2 (sheet open) with the error message displayed.

`handleFinishDay()`:
1. Sets `isLoading = true`, clears `error`.
2. POSTs `{ dayKey: getLocalDate() }` to `/api/process-day`.
3. On success: `window.location.href = "/app/today"` (full navigation to force server re-fetch).
4. On non-OK response: reads `data.error`. If it includes `"No messages found"`, shows `"Nothing logged yet — start chatting first!"`. Otherwise shows `data.error`.
5. Sets `isLoading = false`.

`openSheet()`: clears error, sets `sheetOpen = true`.

`getLocalDate()`: same local-time YYYY-MM-DD construction as other components.

### `TodayView` (`src/components/today-view.tsx`)

```ts
interface TodayViewProps {
  dayLogRow: DayLogRow | null;
  goals: UserGoals | null;
}
```

Status branching:
- `dayLogRow === null` → `<EmptyState type="no_data">`: 🏋️ emoji at 52px, "Nothing logged yet" heading, instructional copy, "Start logging" button → `/app/chat`.
- `dayLogRow.status === "pending"` → `<EmptyState type="pending">`: animated spinning ring (styled with `var(--brand)` for border color), "Processing today's data…" text.
- `dayLogRow.status === "failed"` → `<EmptyState type="failed">`: ⚠️ emoji, "Failed to process today's data.", "Try again" button → `/app/chat`.
- `dayLogRow.status === "processed"` → `<WeighInCard weighIns={dayLog.weigh_ins} />` + `<WorkoutSection sessions={dayLog.sessions} />` + `<NutritionSection nutrition={dayLog.nutrition} goals={goals} />`.

`WeighInCard`: returns `null` if `!weighIns?.length` or `latest.weight` is `undefined` or `null`. Shows a scale icon, optional context label (e.g., `"Weigh-in · morning"`), and large weight display with unit in smaller secondary text.

### `WorkoutSection` (`src/components/workout-section.tsx`)

```ts
function WorkoutSection({ sessions }: { sessions: Session[] })
```

If `sessions.length === 0`: card with `"No workouts logged yet"`.

Otherwise: renders a labeled section header (`text-[11px] font-bold uppercase tracking-[0.06em]`) and a `SessionCard` for each session. `defaultOpen` passed as `true` only when `sessions.length === 1`.

**`SessionCard`**: collapsible (`useState(defaultOpen)`). Header: session label, start time via `formatTime(isoString)` (`toLocaleTimeString` in `h:mm a` format), exercise count, animated chevron. Clicking toggles open state. Body: `ExerciseRow` for each exercise.

**`ExerciseRow`**: left side has exercise `name`, optional `alias_used` ("aka ..."), warmup count ("+N warmup"). Right side has the set summary and weight range.

**`getSetSummary(sets)`**:
1. Filters to working sets (non-warmup).
2. If no working sets → `"warmup only"`.
3. Collects reps: `number` → push directly; `[number, number]` tuple → push both values.
4. If no reps values → `"N sets"`.
5. `minReps === maxReps` → `"N×R"`. Otherwise `"N×min-max"`.

**Weight display**: collects `weight` from working sets (only `typeof w === "number"`). Gets unit from first working set. `minW === maxW` → `"W unit"`. Otherwise `"minW–maxW unit"` (en-dash `–`).

### `NutritionSection` (`src/components/nutrition-section.tsx`)

```ts
interface NutritionSectionProps {
  nutrition: Nutrition;
  goals?: UserGoals | null;
}
```

**Uncertainty dot colors:**

```ts
const UNCERTAINTY_COLORS: Record<string, string> = {
  low:    "var(--success)",   // #34d399 green
  medium: "var(--warning)",  // #fbbf24 amber
  high:   "var(--error)",    // #f87171 red
};
```

**Remaining calories**: `goals?.target_calories ? Math.max(0, goals.target_calories - totals.cal) : null`. If not null, shown as `"X cal left"` (right-aligned in the Macros card header).

**Four `CircularProgress` components** (all `size={76}`):
- Cal: `current={totals.cal}`, `target={goals?.target_calories}`, `unit="kcal"`, `color="var(--cal)"`
- Protein: `current={totals.p}`, `target={goals?.target_protein}`, `unit="g"`, `color="var(--protein)"`
- Carbs: `current={totals.c}`, `target={goals?.target_carbs}`, `unit="g"`, `color="var(--carbs)"`
- Fat: `current={totals.f}`, `target={goals?.target_fat}`, `unit="g"`, `color="var(--fat)"`

**`MealRow`**: expandable via `useState(false)`. Row is a `<button type="button">` spanning full width. Shows: colored uncertainty dot, meal name (truncated), calorie count, animated chevron. When expanded: shows protein/carbs/fat in a `flex gap-5` row with their respective `var(--protein)`, `var(--carbs)`, `var(--fat)` colors.

### `CircularProgress` (`src/components/circular-progress.tsx`)

```ts
interface CircularProgressProps {
  label: string;
  current: number;
  target?: number;
  unit: string;
  color: string;
  size?: number;   // default 80
}
```

**Math:**

```ts
const strokeWidth = 6;
const radius = (size - strokeWidth) / 2;
const circumference = 2 * Math.PI * radius;
const progress = target && target > 0 ? Math.min(1, current / target) : 0;
const offset = circumference * (1 - progress);
```

SVG rotated `-90deg` so 0% starts at 12 o'clock (top).

Two circles: background track (stroke `var(--border)`, no fill) and progress arc (stroke = `color` prop, `strokeLinecap="round"`, `strokeDasharray={circumference}`, `strokeDashoffset={offset}`, `transition: "stroke-dashoffset 0.6s ease-out"`).

**Center display** (absolutely positioned over SVG):
- Value: `current >= 1000 ? "${(current/1000).toFixed(1)}k" : "${Math.round(current)}"`.
- Font size: `size >= 90 ? "16px" : "13px"`. Font weight 700. Color `var(--text-primary)`.
- Unit: 10px, `var(--text-tertiary)`, 2px margin-top.

**Below SVG**: label in 12px `var(--text-secondary)`. If `target` is truthy: `"/ {target}{unit}"` in 11px `var(--text-tertiary)`.

### `GoalsForm` (`src/components/goals-form.tsx`)

```ts
interface GoalsFormProps {
  currentGoals: UserGoals | null;
}
```

**Default values** when no current goals:

```ts
goalType = "lean_bulk"
calories = "2500"
protein  = "180"
carbs    = "250"
fat      = "80"
```

**Goal types** (2×2 grid of `Button` components):

```ts
const GOAL_TYPES = [
  { value: "bulk",      label: "Bulk" },
  { value: "lean_bulk", label: "Lean Bulk" },
  { value: "cut",       label: "Cut" },
  { value: "maintain",  label: "Maintain" },
];
```

Selected: `variant="default"`. Unselected: `variant="outline"`.

**`NumberInput` component** (internal to file): renders a Card with `−` button, number input, `+` button. Step size: `50` for calories unit, `5` for grams unit. Minimum: `Math.max(0, numVal - step)` — cannot go below 0. Value displayed via `<input type="number">` with inline `color` style for the macro color. The `+` button has no upper limit.

**Save status states**: `"idle" | "saving" | "saved" | "error"`.
- Button text: idle → `"Save Goals"`, saving → `"Saving…"`, saved → `"Saved!"`.
- Saved state: button receives `className` `"bg-[var(--success)] hover:bg-[var(--success)]"`.
- Saved state duration: 2000ms, then resets to `"idle"` via `setTimeout`.
- Error state: shows error text in destructive box above the button.

POSTs to `/api/goals`:

```json
{
  "goal_type": "lean_bulk",
  "target_calories": 2500,
  "target_protein": 180,
  "target_carbs": 250,
  "target_fat": 80
}
```

Uses `parseInt(value) || undefined` — zero or NaN becomes `undefined` (field omitted from body).

### `HistoryView` (`src/components/history-view.tsx`)

Client component. All data fetched client-side.

**State**: `year: number`, `month: number` (1-indexed, initialized to current month), `logs: DayLogSummary[]`, `loading: boolean`.

**Data fetching**: `useEffect` on `[year, month]` — fetches `/api/history?year=${year}&month=${month}`, sets `logs` from `data.logs ?? []`, sets `loading = false`. On error: sets `loading = false` (fails silently, shows empty state).

**Month navigation**:
- `prevMonth()`: if January → decrement year, set month 12. Otherwise decrement month.
- `nextMonth()`: if December → increment year, set month 1. Otherwise increment month.
- Next button disabled when `isCurrentMonth` (`year === today.getFullYear() && month === today.getMonth() + 1`).

**Calendar grid**: 7-column CSS grid. Empty leading cells: `Array.from({ length: firstDow })` where `firstDow = new Date(year, month-1, 1).getDay()`. Day cells: `aspectRatio: "1"`.

- Today: `text-primary font-bold`.
- Logged day (has a `day_logs` entry): `text-foreground` + `w-1 h-1 rounded-full bg-primary` dot below.
- Other day: `text-muted-foreground`.

**Loading skeleton**: three `rounded-2xl skeleton h-24` divs (shimmer animation).

**Empty month**: Card with `"No logs for {MONTH_NAME} {year}"`.

**`DaySummaryCard`**: date parsed as `new Date(day_key + "T12:00:00")` (explicit noon to avoid UTC timezone shift). Shows:
- Date header: `weekday: "long", month: "long", day: "numeric"`.
- Macro totals: cal/P/C/F inline with their `var(--cal)`, `var(--protein)`, `var(--carbs)`, `var(--fat)` colors.
- Sessions: `🏋️ Label · N exercise(s)` per session, multiple sessions joined by double space `"  "`.
- Weigh-in: `⚖️ weight unit` (first weigh-in only).

---

## Styling System

### CSS Variables (`src/app/globals.css`)

All variables live in `:root`. The app is permanently dark — there is no light mode and no `@media (prefers-color-scheme)` override.

**shadcn semantic variables** (oklch color space):

| Variable | Value | Purpose |
|---|---|---|
| `--radius` | `0.75rem` | Base border radius |
| `--background` | `oklch(0.09 0.008 264)` | Page background |
| `--foreground` | `oklch(0.96 0.004 264)` | Primary text |
| `--card` | `oklch(0.14 0.01 264)` | Card surface |
| `--card-foreground` | `oklch(0.96 0.004 264)` | Card text |
| `--popover` | `oklch(0.17 0.01 264)` | Popover/dropdown surface |
| `--primary` | `oklch(0.65 0.18 255)` | Primary action (blue) |
| `--primary-foreground` | `oklch(1 0 0)` | Text on primary |
| `--secondary` | `oklch(0.28 0.01 264)` | Secondary surface |
| `--secondary-foreground` | `oklch(0.96 0.004 264)` | Text on secondary |
| `--muted` | `oklch(0.17 0.01 264)` | Muted surface |
| `--muted-foreground` | `oklch(0.6 0.01 264)` | Secondary text |
| `--accent` | `oklch(0.22 0.01 264)` | Hover state background |
| `--accent-foreground` | `oklch(0.96 0.004 264)` | Text on accent |
| `--destructive` | `oklch(0.7 0.18 20)` | Error/danger (red) |
| `--destructive-foreground` | `oklch(1 0 0)` | Text on destructive |
| `--border` | `oklch(0.28 0.01 264)` | All borders |
| `--input` | `oklch(0.17 0.01 264)` | Input backgrounds |
| `--ring` | `oklch(0.65 0.18 255)` | Focus ring |

**Custom app variables:**

| Variable | Value | Purpose |
|---|---|---|
| `--surface-0` through `--surface-3` | `#08080c` → `#30303f` | Layered surfaces |
| `--text-primary` | `#f2f2f4` | Primary text (raw hex) |
| `--text-secondary` | `#8888a0` | Secondary text |
| `--text-tertiary` | `#55556a` | Tertiary/hint text |
| `--brand` | `#4d8eff` | Brand blue (renamed from `--accent` to avoid shadcn conflict) |
| `--brand-hover` | `#6ba3ff` | Brand blue hover state |
| `--brand-soft` | `rgba(77,142,255,0.1)` | Soft brand tint |
| `--success` | `#34d399` | Success green |
| `--warning` | `#fbbf24` | Warning amber |
| `--error` | `#f87171` | Error red |
| `--cal` | `#34d399` | Calorie macro color (green) |
| `--protein` | `#60a5fa` | Protein macro color (blue) |
| `--carbs` | `#fbbf24` | Carbs macro color (amber) |
| `--fat` | `#c084fc` | Fat macro color (purple) |
| `--radius-sm` through `--radius-full` | `8px` → `9999px` | Radius scale |

**`@theme inline` block**: maps all CSS variables to Tailwind's design token system (`--color-*`, `--font-*`, `--radius-*`) so classes like `bg-primary`, `text-muted-foreground`, `rounded-lg` resolve to the CSS variable values.

### Global Utility Classes

```css
.pb-safe       { padding-bottom: max(env(safe-area-inset-bottom), 16px); }
.pt-safe       { padding-top: env(safe-area-inset-top); }
.h-bottom-nav  { height: calc(64px + env(safe-area-inset-bottom)); }
.mb-bottom-nav { margin-bottom: calc(64px + env(safe-area-inset-bottom)); }
```

**Mobile iOS fixes:**
- `*` selector: `-webkit-tap-highlight-color: transparent` (removes tap highlight).
- `input[type="text"], input[type="email"], input[type="number"], textarea`: `font-size: 16px` (prevents iOS zoom on focus).
- `html`: `-webkit-text-size-adjust: 100%`.

**Custom scrollbar**: width 4px, transparent track, `var(--border)` thumb with `border-radius: 2px`.

### CSS Animations

| Keyframe | Class | Behavior |
|---|---|---|
| `shimmer` | `.skeleton` | Gradient sweep left-to-right over `background-size: 200% 100%`, 1.5s infinite. Used for loading skeletons. |
| `dot-bounce` | `.typing-dot` | `translateY(0) opacity(0.4)` → `translateY(-4px) opacity(1)` → back. 1.2s ease-in-out infinite. `.typing-dot:nth-child(2)` delayed 0.2s, `:nth-child(3)` delayed 0.4s. |
| `msg-in` | `.msg-in` | `opacity: 0; translateY(8px)` → `opacity: 1; translateY(0)`. 0.2s ease-out, `forwards`. Applied to every chat bubble on render. |
| `fade-in` | `.fade-in` | `opacity: 0` → `opacity: 1`. 0.15s ease, `forwards`. |
| `ring-fill` | SVG `animation` property | `stroke-dashoffset` from `var(--circumference)` to `var(--offset)`. CSS variable driven. |

Button press: `button:active:not(:disabled) { transform: scale(0.97); transition: transform 0.1s ease; }` — applies to all buttons globally.

### shadcn/ui Component Variants

**`Button` (`src/components/ui/button.tsx`):**

Built with CVA. Uses Radix `Slot.Root` when `asChild=true`. Adds `data-slot="button"`, `data-variant={variant}`, `data-size={size}` for styling hooks.

| `variant` | Description |
|---|---|
| `default` | Filled primary blue |
| `destructive` | Filled destructive red |
| `outline` | Border only, transparent background |
| `secondary` | Secondary surface background |
| `ghost` | Transparent, accent background on hover |
| `link` | Underlined text, no background |

| `size` | Computed classes |
|---|---|
| `default` | `h-9 px-4 py-2` |
| `xs` | `h-6 px-2 text-xs` |
| `sm` | `h-8 px-3 text-xs` |
| `lg` | `h-10 px-6` |
| `icon` | `size-9` (square) |
| `icon-xs` | `size-6` |
| `icon-sm` | `size-8` |
| `icon-lg` | `size-10` |

**`Card` (`src/components/ui/card.tsx`):**

Base: `flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm`. Sub-components: `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent` (adds `px-6`), `CardFooter`. All use `data-slot` attributes.

**`Badge` (`src/components/ui/badge.tsx`):**

Base: `inline-flex w-fit shrink-0 rounded-full border-transparent px-2 py-0.5 text-xs font-medium`. Variants: `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`.

**`Input` (`src/components/ui/input.tsx`):**

Base: `h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs`. Focus ring: `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50`.

**`Textarea` (`src/components/ui/textarea.tsx`):**

Base: `flex field-sizing-content min-h-16 w-full rounded-md border border-input`. CSS `field-sizing-content` enables native auto-resize. `Chat` overrides this with JavaScript for a 4-line max height.

**`Separator` (`src/components/ui/separator.tsx`):**

Wraps Radix UI Separator. `decorative=true` by default. Horizontal: `h-px w-full`. Vertical: `h-full w-px`.

**`ScrollArea` (`src/components/ui/scroll-area.tsx`):**

Wraps Radix UI ScrollArea with a custom `ScrollBar` component. Vertical scrollbar: `w-2.5 border-l border-l-transparent`.

---

## Testing

### `tests/chat.spec.ts`

Basic smoke tests. `BASE_URL` comes from env or defaults to `"http://localhost:3002"`.

Active tests:
- Login page loads and shows title
- Root path redirects (to login or chat depending on auth)
- Chat page accessible when BYPASS_AUTH is enabled
- Login form elements are present (email input, submit button)
- Login form can be submitted (checks for status transition)

Two skipped tests (`test.skip`):
- "Chat page renders correctly after auth"
- "Chat can send messages"

These are skipped because they require a real authenticated session.

### `tests/ui-e2e.spec.ts`

Comprehensive E2E tests at four viewport sizes:
- Mobile: 375×812
- Tablet: 768×1024
- Desktop: 1280×720
- Landscape: 812×375

Test suites: Login page, Protected route redirects, Mobile layout, Visual design, Accessibility, Error states, Performance, App UI (Chat + Today), Smooth transitions, Responsive design, Visual polish.

Screenshots numbered `01` through `45`, saved to `test-screenshots/e2e-ui-test/`. Each screenshot is taken at a specific step.

BYPASS_AUTH awareness: tests check if they were redirected to login (indicating bypass is off) and skip gracefully rather than failing.

### Playwright Config (`playwright.config.ts`)

```ts
testDir: "./tests"
fullyParallel: true
baseURL: "http://localhost:3002"
trace: "on-first-retry"
screenshot: "only-on-failure"
```

Single browser project: Chromium only.

`webServer` block: `PORT=3002 pnpm dev`, `reuseExistingServer: !process.env.CI`. In CI a fresh server is always started; locally an existing dev server is reused.

---

## Configuration Files

### `tsconfig.json`

Key settings:
```json
{
  "target": "ES2017",
  "strict": true,
  "moduleResolution": "bundler",
  "jsx": "react-jsx"
}
```

Path alias: `"@/*": ["./src/*"]` — used everywhere for imports (`@/components/...`, `@/lib/...`, `@/types`).

Also includes `.next/types/**/*.ts` and `.next/dev/types/**/*.ts` for Next.js type augmentation.

### `components.json` (shadcn/ui)

```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

### `next.config.ts`

```ts
const nextConfig: NextConfig = {};
export default nextConfig;
```

Completely empty — no custom webpack, no image domains, no rewrites, no redirects.

### `package.json` scripts

```json
{
  "dev":   "next dev",
  "build": "next build",
  "start": "next start",
  "lint":  "next lint"
}
```

### `postcss.config.mjs`

Uses `@tailwindcss/postcss` for Tailwind CSS v4 processing.

### `pnpm-workspace.yaml`

Single-package workspace. No monorepo subpackages.
