# Voice-Dashboard-Template

Template repo for an InsForge-backed voice analytics dashboard.

The running app is branded as `Analytics Dashboard for Voice AI`, but this repository is meant to be cloned and customized by each team that adopts it.

## What Ships In This Repo

- InsForge authentication wired into a Next.js 15 App Router app
- Dashboard, performance report, and data-canvas workflows
- Server-side Gemini integration for summaries, chart generation, and drafting
- Demo mode so the UI is usable before live call data exists
- An InsForge SQL schema for the dashboard’s expected analytics tables, views, and report RPCs

## Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- InsForge SDK
- Gemini via `@google/genai`

## Who This Template Is For

This repo is intended for teams that want to:

- clone a working voice analytics dashboard
- swap in their own branding, logo, and colors
- point the app at their own InsForge project
- authenticate their own users
- store and query their own call data
- connect their own voice provider webhook into InsForge

## High-Level Architecture

The app works like this:

1. Users authenticate with InsForge Auth.
2. The web app reads dashboard/report data from InsForge database objects.
3. Gemini runs server-side for AI insights and assistant responses.
4. Your voice platform sends post-call payloads to an InsForge edge function.
5. That edge function inserts normalized rows into `public.call_events`.
6. The dashboard fills automatically from `call_events`, the derived views, and the report RPCs.

In short: the app does not need direct provider integration in the frontend. It only needs `call_events` to be populated correctly.

## Quick Start

1. Clone the repo:

```bash
git clone https://github.com/<your-org>/Voice-Dashboard-Template.git
cd Voice-Dashboard-Template
```

2. Install dependencies:

```bash
npm install
```

3. Create a new InsForge project.

4. Link this directory to that project:

```bash
npx @insforge/cli link --project-id <your-project-id>
```

5. Import the dashboard schema:

```bash
npx @insforge/cli db import insforge/schema.sql
```

6. Copy the environment file:

```bash
cp .env.example .env.local
```

7. Fill in:

- `NEXT_PUBLIC_INSFORGE_URL`
- `NEXT_PUBLIC_INSFORGE_ANON_KEY`
- `GEMINI_API_KEY`

8. Start the app locally:

```bash
npm run dev -- --port 4000
```

9. Open:

```text
http://localhost:4000
```

## Environment Variables

See [.env.example](.env.example).

- `NEXT_PUBLIC_INSFORGE_URL`
  Public base URL for the adopter’s InsForge project.
- `NEXT_PUBLIC_INSFORGE_ANON_KEY`
  Public anon key for the adopter’s InsForge project.
- `NEXT_PUBLIC_DEMO_MODE`
  Optional. Set to `true` to force demo/sample data in the UI.
- `GEMINI_API_KEY`
  Server-only Gemini key used for report insights and the data assistant.

Important:

- Gemini is called only on the server in this repo.
- Do not move the Gemini key into client-side code.

## Database Objects This App Expects

The required backend objects are defined in [insforge/schema.sql](insforge/schema.sql):

- `public.call_events`
- `public.daily_call_metrics`
- `public.hourly_call_metrics`
- `public.get_available_report_weeks()`
- `public.get_weekly_report(start_date, end_date)`

Once `call_events` contains data, the rest of the dashboard can render from the derived views and functions already included in the schema.

## How The App Gets Its Data

This is the core template concept:

- `call_events` is the source of truth.
- The dashboard reads daily/hourly counts from the derived views.
- The report screen reads weekly aggregates from `get_weekly_report(...)`.
- The AI assistant uses that same report context for summaries and chart generation.

So if you want the app to fill with real data, your job is to insert good rows into `public.call_events`.

## Required Call Fields

The current schema supports these fields on `public.call_events`:

- `external_call_id`
- `created_time`
- `caller_name`
- `caller_phone`
- `category`
- `status`
- `duration_seconds`
- `could_ai_answer`
- `callback_requested`
- `after_hours`
- `transcript_preview`
- `call_summary`
- `metadata`

If your provider gives you more fields, store the extras in `metadata`.

## Edge Function / Webhook Ingestion

To make this work for each adopter, you will typically add one InsForge edge function per project.

Recommended flow:

1. Your voice provider posts a completed-call webhook to an InsForge edge function.
2. The edge function validates the webhook secret/signature.
3. It maps the provider payload into the `call_events` schema.
4. It resolves which InsForge user or workspace owns that call.
5. It inserts or upserts the row into `public.call_events`.

After that, the dashboard updates automatically because the app already reads from the database.

### Important Current Constraint

The current schema is user-scoped:

- `public.call_events.user_id` points to `auth.users(id)`
- the RLS policies are written around `auth.uid()`

That means the simplest adopter setup is:

- one authenticated owner per dataset, or
- one dashboard user per tenant with calls written under that user

If your adopters need a shared multi-user workspace, you should evolve the schema to use something like `workspace_id` or `organization_id` and then update the RLS policies, views, and report functions accordingly.

### What This Repo Does Not Yet Ship

This repository does not currently include a provider-specific ingest edge function because:

- webhook payloads vary across providers
- tenant resolution varies by product
- some teams will map by `user_id`, others by `workspace_id`

The dashboard app is ready. The missing project-specific piece is the webhook-to-database ingest layer.

## Suggested Adopter Checklist

For each new adopter:

1. Clone the repo.
2. Create a new InsForge project.
3. Import `insforge/schema.sql`.
4. Configure InsForge auth for that project.
5. Add the app env vars locally and in deployment.
6. Replace the logo and branding.
7. Build a provider-specific edge function that writes to `call_events`.
8. Send one or two test calls through the webhook.
9. Confirm rows appear in `call_events`.
10. Open the dashboard and verify the charts/reports populate.

## Customization Points

Most adopters will edit:

- `src/lib/template-config.ts`
  Shared brand copy, labels, titles, and assistant strings.
- `public/agentOS_logo.png`
  Main logo.
- `public/favicon.png`
  Browser/app icon.
- `src/app/globals.css`
  Colors and glassmorphism styling.
- `insforge/schema.sql`
  Database schema, views, and report functions.

## Useful Commands

Run locally:

```bash
npm run dev -- --port 4000
```

Lint:

```bash
npm run lint
```

Production build:

```bash
npm run build
```

Link to an InsForge project:

```bash
npx @insforge/cli link --project-id <your-project-id>
```

Import schema:

```bash
npx @insforge/cli db import insforge/schema.sql
```

Deploy an edge function after you add one:

```bash
npx @insforge/cli functions deploy <your-function-slug>
```

## Notes

- Live routes require authentication.
- Demo mode can be enabled with `NEXT_PUBLIC_DEMO_MODE=true`.
- The current app works well as a single-tenant starter. Multi-tenant teams should adjust the data model before broad rollout.
