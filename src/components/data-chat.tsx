"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCanvas } from "@/lib/canvas-context";
import { useDemoMode } from "@/lib/demo-context";
import { demoReportData } from "@/lib/demo-data";
import type { DataAssistantContext } from "@/lib/dashboard-types";
import {
  runDataAssistantAction,
  type DataAssistantMessage,
} from "@/lib/insforge/actions";
import { templateConfig } from "@/lib/template-config";

type ChartRequest = {
  isChart: boolean;
  chartType: "bar" | "line" | "pie" | "area";
};

type DraftRequest = {
  isDraft: boolean;
  draftType: "summary" | "report" | "analysis" | "list";
};

const demoAssistantContext: DataAssistantContext = {
  periodStart: demoReportData.periodStart,
  periodEnd: demoReportData.periodEnd,
  totalCalls: demoReportData.totalCalls,
  avgDailyCalls: demoReportData.avgDailyCalls,
  afterHoursCalls: demoReportData.afterHoursCalls,
  afterHoursPercentage: demoReportData.afterHoursPercentage,
  peakDay: demoReportData.peakDay,
  categoryBreakdown: demoReportData.categoryBreakdown,
  dayOfWeekBreakdown: demoReportData.dayOfWeekBreakdown,
};

function detectChartRequest(message: string): ChartRequest {
  const lower = message.toLowerCase();
  const chartKeywords = ["chart", "graph", "visualize", "visualization", "plot"];
  const isChart = chartKeywords.some((keyword) => lower.includes(keyword));

  if (lower.includes("pie")) return { isChart: true, chartType: "pie" };
  if (lower.includes("line") || lower.includes("trend")) {
    return { isChart: true, chartType: "line" };
  }
  if (lower.includes("area")) return { isChart: true, chartType: "area" };

  return { isChart, chartType: "bar" };
}

function detectDraftRequest(message: string): DraftRequest {
  const lower = message.toLowerCase();

  if (lower.includes("summary") || lower.includes("summarize")) {
    return { isDraft: true, draftType: "summary" };
  }
  if (lower.includes("report")) return { isDraft: true, draftType: "report" };
  if (lower.includes("analysis") || lower.includes("analyze")) {
    return { isDraft: true, draftType: "analysis" };
  }
  if (lower.includes("list") || lower.includes("bullet")) {
    return { isDraft: true, draftType: "list" };
  }
  if (lower.includes("draft") || lower.includes("write")) {
    return { isDraft: true, draftType: "summary" };
  }

  return { isDraft: false, draftType: "summary" };
}

export function DataChat() {
  const [messages, setMessages] = useState<DataAssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { addChart, addDraft } = useCanvas();
  const { isDemoMode } = useDemoMode();
  const router = useRouter();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(event?: React.FormEvent | React.KeyboardEvent) {
    event?.preventDefault();
    const userMessage = inputRef.current?.value.trim() || "";

    if (!userMessage || isLoading) {
      return;
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setMessages((previous) => [...previous, { role: "user", content: userMessage }]);
    setIsExpanded(true);
    setIsLoading(true);

    try {
      const chartRequest = detectChartRequest(userMessage);
      const draftRequest = detectDraftRequest(userMessage);
      const mode = chartRequest.isChart
        ? "chart"
        : draftRequest.isDraft
          ? "draft"
          : "answer";

      const response = await runDataAssistantAction({
        mode,
        prompt: userMessage,
        chartType: chartRequest.chartType,
        draftType: draftRequest.draftType,
        conversationHistory: messages,
        contextOverride: isDemoMode ? demoAssistantContext : undefined,
      });

      if (response.kind === "chart") {
        addChart({
          type: chartRequest.chartType,
          title: response.chart.title,
          data: response.chart.data,
        });

        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            content: `Created a ${chartRequest.chartType} chart called "${response.chart.title}". Open the Data Canvas to review it.`,
          },
        ]);

        router.push("/canvas");
        return;
      }

      if (response.kind === "draft") {
        addDraft({
          type: draftRequest.draftType,
          title: response.draft.title,
          content: response.draft.content,
        });

        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            content: `Created a ${draftRequest.draftType} draft called "${response.draft.title}". Open the Data Canvas to review it.`,
          },
        ]);

        router.push("/canvas");
        return;
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            response.kind === "answer"
              ? response.answer
              : response.message,
        },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "The assistant request failed.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col">
      {(isExpanded || messages.length > 0) && (
        <div className="glass-card mb-3 max-h-[300px] overflow-y-auto rounded-xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-transparent px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-jackson-green" />
              <span className="text-xs font-medium text-jackson-charcoal">
                {templateConfig.assistant.title}
              </span>
              <span className="glass-chip rounded px-1.5 py-0.5 text-[10px] text-jackson-green">
                {templateConfig.assistant.badgeLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  className="text-[10px] text-jackson-charcoal-muted hover:text-jackson-charcoal"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-jackson-charcoal-muted hover:text-jackson-charcoal"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-3">
            {messages.length === 0 ? (
              <div className="space-y-2 py-2">
                <p className="text-center text-[11px] leading-snug text-jackson-charcoal-muted">
                  {templateConfig.assistant.emptyStateLabel}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {templateConfig.assistant.quickPrompts.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        if (inputRef.current) {
                          inputRef.current.value = suggestion;
                        }
                      }}
                      className="glass-button-secondary rounded-full px-2.5 py-1 text-[11px] text-jackson-charcoal transition hover:bg-jackson-green/70 hover:text-white"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        message.role === "user"
                          ? "bg-jackson-green text-white"
                          : "glass-panel text-jackson-charcoal"
                        }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="glass-panel rounded-xl px-3 py-2">
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-jackson-green" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-jackson-green [animation-delay:0.1s]" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-jackson-green [animation-delay:0.2s]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative">
        <div className="glass-panel flex items-end gap-2 rounded-xl p-2 transition-all focus-within:border-jackson-green focus-within:ring-1 focus-within:ring-jackson-green">
          <textarea
            ref={inputRef}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsExpanded(true)}
            placeholder={templateConfig.assistant.placeholder}
            disabled={isLoading}
            rows={1}
            className="max-h-[120px] min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-jackson-charcoal placeholder:text-[11px] placeholder:leading-tight placeholder:text-jackson-charcoal-muted focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="glass-button-primary flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white transition disabled:opacity-40"
          >
            {isLoading ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-jackson-charcoal-muted">
          {templateConfig.assistant.helperText}
        </p>
      </form>
    </div>
  );
}
