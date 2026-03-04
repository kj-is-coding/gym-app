# Gym Workout & Nutrition Tracking App - V1 Specification

## Overview

A voice-first, low-friction web application for tracking gym workouts and nutrition. The app enables users to log workouts and meals via natural conversation (text or voice), stores raw chat messages during the day, and processes them into structured data for workout planning, nutrition tracking, and progressive overload guidance.

### Core Philosophy

- **Zero/near-zero friction**: One tap to record, speak naturally, data is logged automatically
- **Progressive overload made easy**: Never rely on memory for weights/reps from previous sessions
- **Lean bulk support**: Track calories/macros with minimal effort; get "what's left today" guidance
- **Simple context**: LLM always sees past week of workouts + nutrition + user goals in prompt

### User Experience Model

From the user's perspective: **one single AI chat** they keep talking to throughout the day. That's it.

Behind the scenes:
- Every message is saved to the DB
- The LLM prompt always includes: past week of structured data + user goals
- At end of day, user clicks "Finish Day" → structured DayLog is generated

### Key Differentiator from POC

The POC was a single unstructured chat. This app stores **structured data** via user-triggered processing, enabling reliable context retrieval without depending on long chat history.

---

## Core User Workflows

### 1. Start of Workout: "Plan my workout"

**User says**: "I'm doing arms + chest today. Give me the workout."

**LLM already sees in prompt**:
- Past week of workouts (so it knows last arms+chest session)
- User goals (lean bulk targets, etc.)

**App outputs**:
- Exercise list with sets/rep ranges
- Progression conditions ("if you hit 12 reps, add 5 lbs next time")
- Relevant technique cues (optional)

### 2. During Workout: "Log sets via voice"

**User taps record** and says:
- "60 pounds for 9 reps, probably 1 rep from failure"
- "Next set 60 for 7, hit failure, then drop set 40 for 11 to failure"

**App behavior**:
- Appends sets to current session
- Groups by exercise in chronological order
- Optionally replies with updated log snippet + next target (1-2 lines)

**Supported input nuance**:
- Warm-up vs working sets (inferred if not explicit)
- RIR / "near failure" / "to failure"
- Drop sets (linked to parent set)
- Partial ROM tags + notes
- Uncertainty: "14-15 reps", "probably 8" stored as ranges

### 3. Food Logging: "Log meals via voice"

**User logs** immediately after eating or as a single end-of-day recap:
- "Started eating at noon: 5 eggs, yogurt bowl, chicken thighs..."

**App behavior**:
- Estimates calories/macros with uncertainty bounds
- Tracks daily totals
- *(V1: No meal templates — model infers from past week's logged food)*

### 4. End of Day: "What's left to hit my goal?"

**User asks**: "I've logged everything. What more do I need to eat to be in lean bulk today?"

**LLM already sees in prompt**:
- Daily logged intake (from today's chat)
- User goals (target calories, protein, etc.)

**App outputs**:
- Remaining calories/macros to hit goal
- Suggested next actions

### 5. Corrections

**User says**: "actually that was 7.5 not 17.5" or "my weigh-in was 164 not 146"

**App behavior**:
- References most recent relevant event
- Applies correction to structured data on next "Finish Day" processing

---

## Data Architecture

### Processing Model (V1: Manual Trigger)

```
User chats normally (text + voice transcripts)
        |
        v
Every message saved to DB (raw Message with timestamp + day key)
        |
        v
User clicks "Finish Day" button at end of day
        |
        v
Daily Processor:
  - Pulls all messages for that user/day
  - Calls LLM to produce schema-valid DayLog JSON
  - Validates + stores in DB
```

**Why manual trigger for V1:** Simplifies infrastructure — no cron jobs, no scheduling, no overnight job management. User is already thinking about their day when they click it.

### Processing Model (Future: Automatic)

Later, we can add automatic overnight processing via cron jobs. But for V1, manual is simpler and sufficient.

### Database Tables (V0)

#### messages (raw truth)
```sql
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  day_key DATE NOT NULL,           -- user's local date
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX messages_user_day_idx ON messages (user_id, day_key, created_at);
```

#### day_logs (structured output)
```sql
CREATE TABLE day_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  day_key DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processor_version TEXT NOT NULL DEFAULT 'v0',
  source_message_max_id BIGINT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed','failed')),
  day_log JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT
);

CREATE UNIQUE INDEX day_logs_user_day_unique ON day_logs (user_id, day_key);
```

#### user_templates (meal templates + exercise aliases) — V2, NOT V1
```sql
-- DEFERRED TO V2: Meal templates and exercise aliases
-- For V1, the LLM infers from past week's data instead
-- CREATE TABLE user_templates (
--   id BIGSERIAL PRIMARY KEY,
--   user_id UUID NOT NULL,
--   type TEXT NOT NULL CHECK (type IN ('meal_template','exercise_alias')),
--   name TEXT NOT NULL,
--   data JSONB NOT NULL,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );
-- CREATE INDEX user_templates_user_idx ON user_templates (user_id, type);
```

#### user_goals
```sql
CREATE TABLE user_goals (
  user_id UUID PRIMARY KEY,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL  -- target_calories, target_protein, goal_type (bulk/lean_bulk/cut), etc.
);

-- V1 NOTE: Goals are manually configured (e.g., via env var or direct DB insert)
-- V2: Goals extracted via onboarding chat session
```

### DayLog JSON Schema (V0)

```json
{
  "date": "2026-03-01",
  "sessions": [
    {
      "label": "Gym",
      "start_time": "2026-03-01T14:10:00-04:00",
      "exercises": [
        {
          "name": "Dumbbell curl",
          "alias_used": "ab pulldowns",
          "sets": [
            {
              "weight": 60,
              "unit": "lb",
              "reps": 9,
              "rir": 1,
              "to_failure": false,
              "is_warmup": false,
              "drop_from_set_id": null,
              "notes": ""
            },
            {
              "weight": 60,
              "unit": "lb",
              "reps": 7,
              "rir": 0,
              "to_failure": true,
              "is_warmup": false,
              "drop_from_set_id": null,
              "notes": ""
            },
            {
              "weight": 40,
              "unit": "lb",
              "reps": 11,
              "rir": 0,
              "to_failure": true,
              "is_warmup": false,
              "drop_from_set_id": "<previous_set_id>",
              "notes": "drop set"
            }
          ]
        }
      ]
    }
  ],
  "nutrition": {
    "meals": [
      {
        "name": "5 eggs",
        "estimated_macros": {
          "cal": 350,
          "p": 30,
          "c": 2,
          "f": 25
        },
        "uncertainty": "low"
      },
      {
        "name": "yogurt bowl",
        "estimated_macros": {
          "cal": 450,
          "p": 25,
          "c": 55,
          "f": 12
        },
        "uncertainty": "low"
      }
    ],
    "totals": {
      "cal": 2200,
      "p": 160,
      "c": 210,
      "f": 70
    },
    "uncertainty": "medium"
  },
  "weigh_ins": [
    {
      "weight": 164,
      "unit": "lb",
      "context": "morning",
      "timestamp": "2026-03-01T07:30:00-04:00"
    }
  ]
}
```

---

## Features

### V1 Must-Have (MVP)

| Feature | Description |
|---------|-------------|
| Chat UI + voice record | One-tap audio capture, transcription, chat interface |
| Raw message persistence | All messages saved with day_key for processing |
| Simple context in prompt | Past week of workouts + nutrition + user goals always in LLM prompt |
| "Finish Day" button | Manual trigger to process day's chat into structured DayLog |
| Workout logging | Log sets via natural language (weight, reps, RIR, drop sets) |
| Meal logging | Natural language meal input with macro estimation |
| Weight log | Weigh-in tracking |
| "Today" view | Display structured sessions + nutrition + remaining to goal |
| Protected access | Auth required; invite list for testers |

### V1 Explicitly Out of Scope (Add Later)

| Feature | Description |
|---------|-------------|
| Onboarding session | Guided chat to extract user goals, schedule, current state |
| Meal templates | Save meals by name for quick logging |
| Exercise aliasing | "rope lat thing" maps to canonical exercise |
| Auto "new session?" | Prompt after time gap (e.g., 90 min) |
| Travel mode | Equipment constraints filter exercise suggestions |
| Injury notes | Pain logging + "avoid aggravators" suggestions |

### Future (Post-V1)

- Personalized volume landmarks per muscle/week
- Recovery scoring (sleep/soreness/pain)
- Auto-adjusting macro targets based on weight trend
- Photo-based portion estimation
- Restaurant builders (Chipotle/Qdoba/In-N-Out)
- Automatic overnight processing (cron jobs)

---

## Technical Architecture

### Recommended Stack

| Component | Technology | Why |
|-----------|------------|-----|
| Framework | Next.js (App Router) | Full-stack, deployable, TypeScript-native |
| Auth | Supabase Auth or Clerk | Magic link, invite-only support |
| Database | Postgres (Supabase or Neon) | JSONB support, RLS, managed |
| File Storage | Supabase Storage or S3 | Audio clips, nutrition label images |
| LLM Layer | Vercel AI SDK + OpenAI | Streaming chat + structured output |
| Speech-to-Text | OpenAI Whisper | Transcription quality |
| Deployment | Vercel | Easy deploy, edge functions |

### Vercel AI SDK Usage

#### Live Chat (streaming)
- Use `streamText` in `/app/api/chat/route.ts`
- Return `result.toUIMessageStreamResponse()` for streaming to client
- Use `useChat` hook on frontend for chat state management

#### "Finish Day" Processing (structured output)
- Use `generateText` with `Output.object({ schema })` for schema-validated DayLog JSON
- Zod schema validation before DB storage
- Use `useChat` hook on frontend for chat state management

#### "Finish Day" Processing (structured output)
- Use `generateText` with `Output.object({ schema })` for schema-validated DayLog JSON
- Zod schema validation before DB storage

### Key API Endpoints

#### POST /api/chat
1. Authenticate user
2. Insert user message into `messages` with `day_key = local date`
3. Load context: past 7 days of DayLogs + user goals + today's messages
4. Build prompt with context + user message
5. Call LLM via `streamText` for streaming response
6. Insert assistant reply into `messages`
7. Return streaming response

#### POST /api/process-day (triggered by "Finish Day" button)
1. Authenticate user
2. Load all messages for today (user's local date)
3. Call LLM: "turn this day transcript into DayLog JSON"
4. Validate JSON via Zod schema
5. Upsert `day_logs.day_log`, set `status=processed`
6. Return success + structured summary

---

## LLM Responsibilities

### What the Model Does
- Classify intent: log set vs log meal vs ask question vs correction vs "plan workout"
- Extract structured JSON for events (including ranges/uncertainty)
- Suggest workout plan + progression notes (using past week context in prompt)
- Provide "remaining today" nutrition guidance (using goals in prompt)
- Infer warmup vs working sets

### What Code Does (Deterministic)
- Validate/normalize events (lbs/kg, ranges, timestamps)
- Load context: past 7 days of DayLogs + user goals
- Persist messages and processed DayLogs
- Manage session state + time gaps
- Compute daily macro totals + rolling weight trends

---

## Session State Management

### State to Track
- Current day (user's local date)
- Current session (can be multiple per day)
- Current exercise

### Supported Patterns
- "Hybrid sessions": set -> work 10-15 min -> another set
- Manual "New session" action
- Optional auto "new session?" prompt after large time gap (>90 min)

---

## Progressive Overload Rules (V0)

Start with 3 rules that cover 80%:

1. **Double progression**: Rep range (e.g., 8-12). If top set hits 12 with <=1 RIR -> increase load next time.

2. **Missed target**: Keep load, aim +1 rep on first working set next session.

3. **Junk volume nudge**: If >2 failure sets + drop sets on same exercise -> suggest stopping/reducing.

### Coaching Output Format
Keep it tiny:
- "Next time: 90 lb -> aim 12, then 2x10 back-offs."
- "Shoulder: avoid deep stretch flys today; neutral grip press."

---

## Context / Prompt Strategy (V1)

### What's Always in the LLM Prompt

For every message the user sends, the LLM receives:

1. **User goals** (target calories, protein, bulk/cut goal, etc.)
   - Initially hardcoded/configured manually
   - Later: extracted via onboarding session

2. **Past week of structured data**
   - Last 7 days of DayLogs (workouts + nutrition)
   - This gives the LLM everything it needs for progression guidance and "what's left" questions

3. **Today's chat messages** (current day only)
   - For real-time logging context

### Why This is Simple

- No dynamic retrieval logic
- No semantic search
- No RAG complexity
- Just: stuff the prompt with structured context, let the LLM figure it out

### Token Considerations

A week of DayLogs is relatively compact (rough estimate: ~2-4K tokens). This fits comfortably in context. If it grows too large later, we can add summarization or truncation logic.

---

## Getting Started (Build Order)

### 1. Bootstrap Project
```bash
mkdir gym-app && cd gym-app
pnpm create next-app@latest . --ts --eslint --tailwind --app
```

Alternative: Start from Vercel Chatbot template (includes auth + DB + AI SDK wiring)

### 2. Setup Supabase
1. Create Supabase project
2. Grab env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Add to `.env.local` along with `OPENAI_API_KEY`

### 3. Create Database Tables
Run the SQL schema (see Database Tables section) in Supabase SQL editor

### 4. Enable RLS
- Enable RLS on all tables
- Policy: users can only read/write their own rows

### 5. Build Auth + Protected Routes
- `/login` page (magic link)
- Middleware requiring auth for `/app/*`
- `/app/chat` page with message list + input

### 6. Implement Chat API
- `/api/chat` route with message persistence + streaming response
- Context loading: past 7 days of DayLogs + user goals + today's messages

### 7. Implement "Finish Day" Processor
- `/api/process-day` route
- Zod schema for DayLog validation
- LLM prompt for chat-to-DayLog conversion

### 8. Add "Today" View
- `/app/today` reading `day_logs` and rendering:
  - Workout sessions summary
  - Nutrition totals + "remaining to goal"

### 9. Add Voice Recording
- Audio capture -> Whisper transcription -> chat input

### 10. Add "Finish Day" Button
- Button in UI that calls `/api/process-day`
- Shows confirmation + summary after processing

---

## File Structure (Suggested)

```
/app
  /chat
    page.tsx              # Chat UI with useChat
  /today
    page.tsx              # Structured day view
  /api
    /chat
      route.ts            # Chat endpoint with streaming
    /process-day
      route.ts            # "Finish Day" processor
/lib
  db.ts                   # Database client
  prompts.ts              # LLM prompts
  schemas.ts              # Zod schemas for DayLog
  context.ts              # Context loading (past week + goals)
/components
  chat.tsx                # Chat components
  session-summary.tsx     # Session summary display
  nutrition-totals.tsx    # Nutrition display
  finish-day-button.tsx   # "Finish Day" trigger
```

---

## Environment Variables

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

---

## Success Criteria for V1

1. User can chat naturally (text or voice) throughout the day in a single AI chat
2. All messages are persisted to database
3. User can click "Finish Day" and get valid DayLog JSON stored
4. User can view structured workout + nutrition summary on "Today" view
5. User can ask "what workout should I do today" and get progression-aware plan (LLM sees past week)
6. User can ask "what do I need to eat to hit my goal" and get actionable answer
7. App is deployed and accessible to invited testers

## Deferred to V2

These are explicitly out of scope for V1 but planned for next iteration:

- **Onboarding session**: Guided chat to extract user goals, schedule, current state, target macros
- **Meal templates**: Save frequently-used meals by name
- **Exercise aliasing**: Map shorthand ("rope lat thing") to canonical names
- **Automatic overnight processing**: Cron-based DayLog generation
