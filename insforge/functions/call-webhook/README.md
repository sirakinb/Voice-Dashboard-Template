# call-webhook

Generic InsForge edge-function scaffold for ingesting post-call data into `public.call_events`.

## What This Function Does

It:

1. accepts a `POST` webhook
2. validates a shared secret
3. normalizes a generic call payload
4. uses the reserved InsForge `API_KEY` for backend database access
5. inserts or updates a row in `public.call_events`

This scaffold is intentionally generic. It works immediately with a normalized payload shape, and adopters can customize the normalization logic for their provider.

## Required Secrets

Set these in InsForge before deploying:

```bash
npx @insforge/cli secrets add CALL_WEBHOOK_SECRET <shared-secret>
```

This scaffold uses the reserved InsForge function secrets that already exist in the linked project:

- `INSFORGE_BASE_URL`
- `API_KEY`

Optional:

```bash
npx @insforge/cli secrets add CALL_WEBHOOK_DEFAULT_USER_ID <auth-user-id>
```

Use `CALL_WEBHOOK_DEFAULT_USER_ID` if all incoming calls should be attached to one dashboard owner. Otherwise, send `userId` in the payload.

## Deploy

```bash
npx @insforge/cli functions deploy call-webhook
```

## Smoke Test

After deploy, test the function directly with `curl`:

```bash
curl -X POST "https://<your-project>.insforge.app/functions/call-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "replace-with-your-shared-secret",
    "userId": "replace-with-an-auth-users-id",
    "externalCallId": "call_123",
    "createdTime": "2026-03-23T18:00:00Z",
    "callerName": "Jane Smith",
    "callerPhone": "+15551234567",
    "category": "Leasing",
    "status": "completed",
    "durationSeconds": 214,
    "couldAiAnswer": true,
    "callbackRequested": false,
    "afterHours": false,
    "transcriptPreview": "Caller asked about availability...",
    "callSummary": "Answered pricing and scheduled follow-up."
  }'
```

Expected response:

```json
{
  "success": true,
  "action": "inserted",
  "callEventId": "..."
}
```

## Normalized Payload Shape

This scaffold works out of the box with either top-level fields or a nested `call` object:

```json
{
  "secret": "replace-with-your-shared-secret",
  "userId": "00000000-0000-0000-0000-000000000000",
  "externalCallId": "call_123",
  "createdTime": "2026-03-23T18:00:00Z",
  "callerName": "Jane Smith",
  "callerPhone": "+15551234567",
  "category": "Leasing",
  "status": "completed",
  "durationSeconds": 214,
  "couldAiAnswer": true,
  "callbackRequested": false,
  "afterHours": false,
  "transcriptPreview": "Caller asked about availability...",
  "callSummary": "Answered pricing and scheduled follow-up.",
  "metadata": {
    "provider": "custom"
  }
}
```

You can also send:

```json
{
  "provider": "retell",
  "secret": "replace-with-your-shared-secret",
  "call": {
    "userId": "00000000-0000-0000-0000-000000000000",
    "externalCallId": "call_123",
    "createdTime": "2026-03-23T18:00:00Z"
  },
  "payload": {
    "your": "raw provider payload"
  }
}
```

## What Adopters Usually Customize

- the payload normalization logic in `index.ts`
- how `userId` is resolved
- whether the project stays user-scoped or moves to `workspace_id`
- which fields get copied into `metadata`
