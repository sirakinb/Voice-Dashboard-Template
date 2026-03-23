import { createClient } from "npm:@insforge/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Webhook-Secret",
};

type JsonRecord = Record<string, unknown>;

type CallEventInsert = {
  user_id: string;
  external_call_id: string | null;
  created_time: string;
  caller_name: string | null;
  caller_phone: string | null;
  category: string;
  status: "completed" | "missed" | "voicemail";
  duration_seconds: number;
  could_ai_answer: boolean;
  callback_requested: boolean;
  after_hours: boolean;
  transcript_preview: string | null;
  call_summary: string | null;
  metadata: JsonRecord;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`Missing required secret: ${name}`);
  }

  return value;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function asBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(lowered)) return true;
    if (["false", "0", "no", "n"].includes(lowered)) return false;
  }

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  return fallback;
}

function asObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asIsoTimestamp(value: unknown) {
  if (typeof value === "string" || value instanceof Date) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

function asStatus(value: unknown): CallEventInsert["status"] {
  const lowered = asString(value).toLowerCase();

  if (lowered === "missed" || lowered === "voicemail") {
    return lowered;
  }

  return "completed";
}

function getRequestSecret(request: Request, body: JsonRecord) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return (
    request.headers.get("x-webhook-secret")?.trim() ||
    asString(body.secret) ||
    ""
  );
}

function normalizeIncomingCall(
  body: JsonRecord,
  defaultUserId: string
): CallEventInsert {
  const call = asObject(body.call);
  const source = Object.keys(call).length > 0 ? call : body;
  const userId = asString(source.userId ?? source.user_id) || defaultUserId;

  if (!userId) {
    throw new Error(
      "Missing userId. Provide `userId` in the webhook payload or set CALL_WEBHOOK_DEFAULT_USER_ID."
    );
  }

  const provider = asString(body.provider ?? source.provider) || "custom";
  const rawPayload = body.payload ?? body.rawPayload ?? null;
  const metadata = {
    ...asObject(source.metadata),
    provider,
    source: "call-webhook",
    ...(rawPayload ? { rawPayload } : {}),
  };

  return {
    user_id: userId,
    external_call_id:
      asString(source.externalCallId ?? source.external_call_id) || null,
    created_time: asIsoTimestamp(
      source.createdTime ?? source.created_time ?? source.timestamp
    ),
    caller_name: asString(source.callerName ?? source.caller_name) || null,
    caller_phone:
      asString(source.callerPhone ?? source.caller_phone ?? source.phone) || null,
    category: asString(source.category) || "General",
    status: asStatus(source.status),
    duration_seconds: asNumber(
      source.durationSeconds ??
        source.duration_seconds ??
        source.duration ??
        source.call_duration,
      0
    ),
    could_ai_answer: asBoolean(
      source.couldAiAnswer ?? source.could_ai_answer,
      false
    ),
    callback_requested: asBoolean(
      source.callbackRequested ?? source.callback_requested,
      false
    ),
    after_hours: asBoolean(source.afterHours ?? source.after_hours, false),
    transcript_preview:
      asString(source.transcriptPreview ?? source.transcript_preview) || null,
    call_summary: asString(source.callSummary ?? source.call_summary) || null,
    metadata,
  };
}

export default async function callWebhook(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: JsonRecord;

  try {
    body = asObject(await request.json());
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  try {
    const expectedSecret = getRequiredEnv("CALL_WEBHOOK_SECRET");
    const baseUrl = getRequiredEnv("INSFORGE_BASE_URL");
    const adminApiKey = getRequiredEnv("API_KEY");
    const defaultUserId = Deno.env.get("CALL_WEBHOOK_DEFAULT_USER_ID")?.trim() || "";
    const providedSecret = getRequestSecret(request, body);

    if (!providedSecret || providedSecret !== expectedSecret) {
      return json({ error: "Unauthorized webhook request" }, 401);
    }

    const record = normalizeIncomingCall(body, defaultUserId);
    const adminClient = createClient({
      baseUrl,
      headers: {
        Authorization: `Bearer ${adminApiKey}`,
      },
    });

    let existingId: string | null = null;

    if (record.external_call_id) {
      const { data, error } = await adminClient.database
        .from("call_events")
        .select("id")
        .eq("user_id", record.user_id)
        .eq("external_call_id", record.external_call_id)
        .limit(1);

      if (error) {
        throw new Error(`Failed to look up existing call: ${error.message}`);
      }

      if (Array.isArray(data) && data[0]?.id) {
        existingId = String(data[0].id);
      }
    }

    if (existingId) {
      const { error } = await adminClient.database
        .from("call_events")
        .update(record)
        .eq("id", existingId);

      if (error) {
        throw new Error(`Failed to update call event: ${error.message}`);
      }

      return json({
        success: true,
        action: "updated",
        callEventId: existingId,
      });
    }

    const { data, error } = await adminClient.database
      .from("call_events")
      .insert([record])
      .select("id")
      .limit(1);

    if (error) {
      throw new Error(`Failed to insert call event: ${error.message}`);
    }

    return json({
      success: true,
      action: "inserted",
      callEventId: Array.isArray(data) && data[0]?.id ? String(data[0].id) : null,
    });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Webhook processing failed",
      },
      500
    );
  }
}
