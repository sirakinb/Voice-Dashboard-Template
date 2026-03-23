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

## Prompts You Can Give Codex

Adopters do not need to know the schema names, RLS details, or the exact backend steps ahead of time.

They can simply ask for the outcome they want. The agent should inspect this repo, use [insforge/schema.sql](insforge/schema.sql), and determine the required backend and frontend changes.

### Prompt: Connect this app to my InsForge project

```text
Connect this Voice-Dashboard-Template repo to my InsForge project. Set up auth, import the required schema, verify the dashboard can run locally, and tell me what env vars I still need to fill in.
```

What the agent should infer:

- link the repo to the correct InsForge project
- import `insforge/schema.sql`
- verify auth config and local env vars
- run the app locally and confirm the routes load

### Prompt: Create the webhook ingest function

```text
I want post-call data from my voice platform to populate this dashboard. Create an InsForge edge function that accepts the provider webhook, validates it, maps the payload into the dashboard schema, and writes rows into the database so the app fills with real data.
```

What the agent should infer:

- inspect `public.call_events` in `insforge/schema.sql`
- determine the required payload mapping
- create an InsForge edge function
- normalize provider fields into the existing call schema
- insert or upsert rows into `public.call_events`
- explain how to configure the provider webhook URL and secret

### Prompt: Adapt this for my provider

```text
I use <provider-name>. Update this template so the webhook payload from that provider maps correctly into the dashboard database and the app shows the right metrics.
```

What the agent should infer:

- inspect the provider payload format
- adjust the edge function mapping
- extend the schema only if needed
- keep the app querying from the same dashboard/report objects where possible

### Prompt: Rebrand the dashboard

```text
Rebrand this dashboard for my company. Change the logo, favicon, product name, colors, app copy, and login screen so it matches my brand.
```

What the agent should infer:

- update `src/lib/template-config.ts`
- update `public/` assets
- update `src/app/globals.css`
- preserve the working backend/auth flows

### Prompt: Add fields to the data model

```text
I need this dashboard to track additional call fields: <list the fields>. Update the database schema, ingestion path, and UI so those fields are stored and used correctly.
```

What the agent should infer:

- modify `insforge/schema.sql`
- update the ingest edge function
- update any report/dashboard code that should display or aggregate the new fields

### Prompt: Make this multi-tenant

```text
Convert this template from a single-user data model to a multi-tenant workspace model. I want multiple users in one organization to see the same dashboard data.
```

What the agent should infer:

- replace the current user-scoped model with `workspace_id` or `organization_id`
- update RLS policies
- update views and report functions
- update ingestion so calls are assigned to the correct tenant

### Prompt: Deploy the full stack

```text
Deploy this app and any required InsForge backend pieces for production. Make sure auth works, the app has the right env vars, and the webhook ingestion path is ready.
```

What the agent should infer:

- confirm production env vars
- deploy the frontend
- deploy any edge functions
- verify auth and database connectivity
- verify the webhook path end to end

### Prompt: Audit what is still missing

```text
Review this repo and tell me exactly what is still missing before a customer can use it with their own InsForge account and voice provider.
```

What the agent should infer:

- check auth
- check schema
- check ingestion
- check deployment readiness
- identify any missing secrets, functions, multi-tenant changes, or provider mappings

### Best Way For Adopters To Ask

Good prompts focus on the business outcome, for example:

- "Connect this app to my InsForge project."
- "Make Retell post-call webhooks populate the dashboard."
- "Turn this into a multi-tenant dashboard."
- "Rebrand this for my company."

The adopter does not need to say:

- which SQL objects to create
- which views or RPCs are required
- which files to edit
- how the data assistant is wired

The agent should inspect the repo and infer those implementation details.

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
