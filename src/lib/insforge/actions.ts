"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  clearAuthCookies,
  createInsforgeServerClient,
  getServerSession,
  hasInsforgeConfig,
  setAuthCookies,
} from "@/lib/insforge/server";
import { generateGeminiText, hasGeminiConfig } from "@/lib/gemini";
import type { DataAssistantContext, ReportData, WeekOption } from "@/lib/dashboard-types";
import { templateConfig } from "@/lib/template-config";

export type AuthResult = {
  success: boolean;
  error?: string;
  requiresVerification?: boolean;
};

export type ReportInsights = {
  executiveSummary: string;
  keyInsights: string[];
  recommendations: string[];
};

export type DataAssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type DataAssistantResult =
  | {
      kind: "chart";
      chart: {
        title: string;
        data: Array<{ label: string; value: number }>;
      };
    }
  | {
      kind: "draft";
      draft: {
        title: string;
        content: string;
      };
    }
  | {
      kind: "answer";
      answer: string;
    }
  | {
      kind: "error";
      message: string;
    };

async function getAuthenticatedServerClient() {
  const session = await getServerSession({ persist: true });

  if (!session.user || !session.accessToken) {
    return { client: null, user: null };
  }

  return {
    client: createInsforgeServerClient(session.accessToken),
    user: session.user,
  };
}

function extractJsonPayload(content: string) {
  const stripped = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");

  if (start !== -1 && end !== -1 && end >= start) {
    return stripped.slice(start, end + 1);
  }

  return stripped;
}

function parseJsonPayload<T>(content: string) {
  return JSON.parse(extractJsonPayload(content)) as T;
}

function buildFallbackInsights(reportData: ReportData): ReportInsights {
  const topCategory = reportData.categoryBreakdown[0];

  return {
    executiveSummary:
      `The voice agent handled ${reportData.totalCalls.toLocaleString()} calls ` +
      `from ${reportData.periodStart} to ${reportData.periodEnd}, averaging ` +
      `${reportData.avgDailyCalls.toFixed(1)} calls per day.`,
    keyInsights: [
      topCategory
        ? `${topCategory.category} was the largest category at ${topCategory.percentage}% of calls.`
        : "Category data is not available yet.",
      `${reportData.afterHoursPercentage}% of calls arrived after hours.`,
      reportData.peakDay?.date
        ? `Peak activity occurred on ${reportData.peakDay.date} with ${reportData.peakDay.calls} calls.`
        : "Peak-day information is not available yet.",
    ],
    recommendations: [
      "Review the highest-volume call category for routing and script improvements.",
      "Monitor after-hours traffic to confirm the voice agent is capturing off-hours demand.",
      "Use weekly trends to tune escalation rules and staffing coverage.",
    ],
  };
}

function buildFallbackChart(context: DataAssistantContext): DataAssistantResult {
  const hasDailyPromptData = context.dayOfWeekBreakdown.length > 0;

  if (hasDailyPromptData) {
    return {
      kind: "chart",
      chart: {
        title: "Call Volume by Day",
        data: context.dayOfWeekBreakdown.map((item) => ({
          label: item.day,
          value: item.total,
        })),
      },
    };
  }

  return {
    kind: "chart",
    chart: {
      title: "Call Categories",
      data: context.categoryBreakdown.map((item) => ({
        label: item.category,
        value: item.count,
      })),
    },
  };
}

function buildFallbackDraft(
  context: DataAssistantContext,
  draftType?: "summary" | "report" | "analysis" | "list"
): DataAssistantResult {
  const topCategory = context.categoryBreakdown[0];
  const title =
    draftType === "report"
      ? "Weekly Performance Report"
      : draftType === "analysis"
        ? "Call Flow Analysis"
        : draftType === "list"
          ? "Operational Highlights"
          : "Weekly Summary";

  const content = [
    `Period: ${context.periodStart} to ${context.periodEnd}`,
    `Total Calls: ${context.totalCalls}`,
    `Daily Average: ${context.avgDailyCalls.toFixed(1)}`,
    `After-Hours Calls: ${context.afterHoursCalls} (${context.afterHoursPercentage}%)`,
    topCategory
      ? `Top Category: ${topCategory.category} (${topCategory.count} calls, ${topCategory.percentage}%)`
      : "Top Category: Not available",
  ].join("\n");

  return {
    kind: "draft",
    draft: {
      title,
      content,
    },
  };
}

function buildFallbackAnswer(context: DataAssistantContext): DataAssistantResult {
  const topCategory = context.categoryBreakdown[0];

  return {
    kind: "answer",
    answer:
      `The dashboard shows ${context.totalCalls.toLocaleString()} calls between ` +
      `${context.periodStart} and ${context.periodEnd}, averaging ` +
      `${context.avgDailyCalls.toFixed(1)} calls per day. ` +
      (topCategory
        ? `${topCategory.category} is the largest category at ${topCategory.percentage}% of call volume.`
        : "Category breakdown data is not available yet."),
  };
}

function buildFallbackAssistantResult(input: {
  mode: "chart" | "draft" | "answer";
  draftType?: "summary" | "report" | "analysis" | "list";
}): (context: DataAssistantContext) => DataAssistantResult {
  return (context) => {
    if (input.mode === "chart") {
      return buildFallbackChart(context);
    }

    if (input.mode === "draft") {
      return buildFallbackDraft(context, input.draftType);
    }

    return buildFallbackAnswer(context);
  };
}

async function createCompletion(prompt: string) {
  return generateGeminiText(prompt, templateConfig.ai.model);
}

export async function signInWithPasswordAction(
  email: string,
  password: string
): Promise<AuthResult> {
  if (!hasInsforgeConfig()) {
    return { success: false, error: "InsForge is not configured." };
  }

  const client = createInsforgeServerClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data?.accessToken) {
    const requiresVerification =
      error?.statusCode === 403 || /verify/i.test(error?.message ?? "");

    return {
      success: false,
      error:
        error?.message ??
        "Unable to sign in with the provided credentials.",
      requiresVerification,
    };
  }

  await setAuthCookies(data.accessToken, data.refreshToken);
  revalidatePath("/", "layout");

  return { success: true };
}

export async function signUpAction(
  name: string,
  email: string,
  password: string
): Promise<AuthResult> {
  if (!hasInsforgeConfig()) {
    return { success: false, error: "InsForge is not configured." };
  }

  const client = createInsforgeServerClient();
  const { data, error } = await client.auth.signUp({
    name: name.trim(),
    email: email.trim(),
    password,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  if (data?.requireEmailVerification) {
    return {
      success: true,
      requiresVerification: true,
    };
  }

  if (data?.accessToken) {
    await setAuthCookies(data.accessToken, data.refreshToken);
  }

  revalidatePath("/", "layout");

  return { success: true };
}

export async function verifyEmailAction(
  email: string,
  otp: string
): Promise<AuthResult> {
  if (!hasInsforgeConfig()) {
    return { success: false, error: "InsForge is not configured." };
  }

  const client = createInsforgeServerClient();
  const { data, error } = await client.auth.verifyEmail({
    email: email.trim(),
    otp: otp.trim(),
  });

  if (error || !data?.accessToken) {
    return {
      success: false,
      error: error?.message ?? "Unable to verify email.",
    };
  }

  await setAuthCookies(data.accessToken, data.refreshToken);
  revalidatePath("/", "layout");

  return { success: true };
}

export async function resendVerificationEmailAction(
  email: string
): Promise<AuthResult> {
  if (!hasInsforgeConfig()) {
    return { success: false, error: "InsForge is not configured." };
  }

  const client = createInsforgeServerClient();
  const { error } = await client.auth.resendVerificationEmail({
    email: email.trim(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function signOutAction() {
  await clearAuthCookies();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function getAvailableReportWeeksAction(): Promise<WeekOption[]> {
  const { client } = await getAuthenticatedServerClient();

  if (!client) {
    return [];
  }

  const { data, error } = await client.database.rpc("get_available_report_weeks");

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data as WeekOption[];
}

export async function getWeeklyReportAction(
  weekStart: string,
  weekEnd: string
): Promise<ReportData | null> {
  const { client } = await getAuthenticatedServerClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.database.rpc("get_weekly_report", {
    p_start_date: weekStart,
    p_end_date: weekEnd,
  });

  if (error || !data) {
    return null;
  }

  return data as ReportData;
}

export async function getDataAssistantContextAction(): Promise<DataAssistantContext | null> {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const report = await getWeeklyReportAction(start, end);

  if (!report) {
    return null;
  }

  return {
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    totalCalls: report.totalCalls,
    avgDailyCalls: report.avgDailyCalls,
    afterHoursCalls: report.afterHoursCalls,
    afterHoursPercentage: report.afterHoursPercentage,
    peakDay: report.peakDay,
    categoryBreakdown: report.categoryBreakdown,
    dayOfWeekBreakdown: report.dayOfWeekBreakdown,
  };
}

export async function generateReportInsightsAction(
  reportData: ReportData
): Promise<ReportInsights> {
  if (!hasGeminiConfig()) {
    return buildFallbackInsights(reportData);
  }

  try {
    const content = await createCompletion(
      `You are an AI analyst for a voice AI analytics dashboard.

Analyze this weekly call data and return ONLY valid JSON:
{
  "executiveSummary": "2-3 sentence summary",
  "keyInsights": ["insight 1", "insight 2", "insight 3", "insight 4", "insight 5"],
  "recommendations": ["action 1", "action 2", "action 3", "action 4"]
}

DATA:
- Period: ${reportData.periodStart} to ${reportData.periodEnd}
- Total Calls: ${reportData.totalCalls}
- Daily Average: ${reportData.avgDailyCalls}
- After-Hours Calls: ${reportData.afterHoursCalls} (${reportData.afterHoursPercentage}%)
- Peak Day: ${reportData.peakDay?.date || "N/A"} with ${reportData.peakDay?.calls || 0} calls

CATEGORIES:
${reportData.categoryBreakdown
  .map((item) => `- ${item.category}: ${item.count} (${item.percentage}%)`)
  .join("\n")}

DAY OF WEEK:
${reportData.dayOfWeekBreakdown
  .map((item) => `- ${item.day}: ${item.total} calls`)
  .join("\n")}`
    );
    const parsed = parseJsonPayload<ReportInsights>(content);

    return {
      executiveSummary: parsed.executiveSummary || "Report analysis unavailable.",
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : [],
    };
  } catch {
    return buildFallbackInsights(reportData);
  }
}

export async function runDataAssistantAction(input: {
  mode: "chart" | "draft" | "answer";
  prompt: string;
  chartType?: "bar" | "line" | "pie" | "area";
  draftType?: "summary" | "report" | "analysis" | "list";
  conversationHistory?: DataAssistantMessage[];
  contextOverride?: DataAssistantContext | null;
}): Promise<DataAssistantResult> {
  const context = input.contextOverride ?? (await getDataAssistantContextAction());

  if (!context) {
    return {
      kind: "error",
      message: "No report data is available for the assistant yet.",
    };
  }

  if (!hasGeminiConfig()) {
    return buildFallbackAssistantResult(input)(context);
  }

  try {
    const history = (input.conversationHistory ?? [])
      .slice(-6)
      .map(
        (message) =>
          `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`
      )
      .join("\n");

    let prompt = "";

    if (input.mode === "chart") {
      prompt = `You are a data analyst. Based on this voice-agent dashboard context, generate chart data for the user's request.

Return ONLY valid JSON:
{
  "title": "Short title",
  "data": [
    { "label": "Item", "value": 10 }
  ]
}

CONTEXT:
- Total Calls: ${context.totalCalls}
- Daily Average: ${context.avgDailyCalls}
- After-Hours Calls: ${context.afterHoursCalls} (${context.afterHoursPercentage}%)
- Peak Day: ${context.peakDay?.date || "N/A"} with ${context.peakDay?.calls || 0} calls

CATEGORIES:
${context.categoryBreakdown
  .map((item) => `- ${item.category}: ${item.count}`)
  .join("\n")}

DAY OF WEEK:
${context.dayOfWeekBreakdown
  .map((item) => `- ${item.day}: ${item.total}`)
  .join("\n")}

USER REQUEST: ${input.prompt}`;
    } else if (input.mode === "draft") {
      prompt = `You are a business analyst for a voice AI analytics dashboard.

Return ONLY valid JSON:
{
  "title": "Draft title",
  "content": "Full draft text with \\n line breaks"
}

Create a ${input.draftType} using this context:
- Period: ${context.periodStart} to ${context.periodEnd}
- Total Calls: ${context.totalCalls}
- Daily Average: ${context.avgDailyCalls}
- After-Hours Calls: ${context.afterHoursCalls} (${context.afterHoursPercentage}%)
- Peak Day: ${context.peakDay?.date || "N/A"} (${context.peakDay?.calls || 0} calls)

CATEGORIES:
${context.categoryBreakdown
  .map((item) => `- ${item.category}: ${item.count} (${item.percentage}%)`)
  .join("\n")}

DAY OF WEEK:
${context.dayOfWeekBreakdown
  .map((item) => `- ${item.day}: ${item.total} (avg ${item.avg})`)
  .join("\n")}

USER REQUEST: ${input.prompt}`;
    } else {
      prompt = `You are a concise data assistant for a voice AI analytics dashboard.

Answer in 2-3 sentences max.

CONTEXT:
- Period: ${context.periodStart} to ${context.periodEnd}
- Total Calls: ${context.totalCalls}
- Daily Average: ${context.avgDailyCalls}
- After-Hours Calls: ${context.afterHoursCalls} (${context.afterHoursPercentage}%)
- Peak Day: ${context.peakDay?.date || "N/A"} with ${context.peakDay?.calls || 0} calls

CATEGORIES:
${context.categoryBreakdown
  .map((item) => `- ${item.category}: ${item.count} (${item.percentage}%)`)
  .join("\n")}

DAY OF WEEK:
${context.dayOfWeekBreakdown
  .map((item) => `- ${item.day}: ${item.total} (avg ${item.avg})`)
  .join("\n")}

${history ? `CONVERSATION:\n${history}\n` : ""}
QUESTION: ${input.prompt}`;
    }

    const content = await createCompletion(prompt);

    if (input.mode === "chart") {
      const parsed = parseJsonPayload<{
        title?: string;
        data?: Array<{ label: string; value: number }>;
      }>(content);
      return {
        kind: "chart",
        chart: {
          title: parsed.title || "Chart",
          data: Array.isArray(parsed.data) ? parsed.data : [],
        },
      };
    }

    if (input.mode === "draft") {
      const parsed = parseJsonPayload<{
        title?: string;
        content?: string;
      }>(content);
      return {
        kind: "draft",
        draft: {
          title: parsed.title || "Draft",
          content: parsed.content || "",
        },
      };
    }

    return {
      kind: "answer",
      answer: content || "I couldn't generate a response.",
    };
  } catch {
    return buildFallbackAssistantResult(input)(context);
  }
}
