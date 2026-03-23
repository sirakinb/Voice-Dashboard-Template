"use client";

import { useEffect, useMemo, useState } from "react";
import { useDemoMode } from "@/lib/demo-context";
import { demoAIInsights, demoReportData } from "@/lib/demo-data";
import type { ReportData, WeekOption } from "@/lib/dashboard-types";
import {
  generateReportInsightsAction,
  getAvailableReportWeeksAction,
  getWeeklyReportAction,
  type ReportInsights,
} from "@/lib/insforge/actions";
import { templateConfig } from "@/lib/template-config";

function createDemoWeek(): WeekOption {
  return {
    weekStart: demoReportData.periodStart,
    weekEnd: demoReportData.periodEnd,
    label: `${formatDate(demoReportData.periodStart)} - ${formatDate(
      demoReportData.periodEnd
    )}`,
  };
}

export function PerformanceReport() {
  const { isDemoMode } = useDemoMode();
  const [availableWeeks, setAvailableWeeks] = useState<WeekOption[]>([]);
  const [selectedWeekStart, setSelectedWeekStart] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [aiInsights, setAiInsights] = useState<ReportInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authConfigured = Boolean(
    process.env.NEXT_PUBLIC_INSFORGE_URL &&
      process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
  );

  const selectedWeek = useMemo(
    () =>
      availableWeeks.find((week) => week.weekStart === selectedWeekStart) ??
      availableWeeks[0] ??
      null,
    [availableWeeks, selectedWeekStart]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadWeeks() {
      setLoading(true);
      setError(null);

      if (isDemoMode) {
        const demoWeek = createDemoWeek();
        if (cancelled) return;

        setAvailableWeeks([demoWeek]);
        setSelectedWeekStart(demoWeek.weekStart);
        setReport(demoReportData);
        setAiInsights(demoAIInsights);
        setLoading(false);
        return;
      }

      const weeks = await getAvailableReportWeeksAction();
      if (cancelled) return;

      setAvailableWeeks(weeks);
      setSelectedWeekStart((current) => current || weeks[0]?.weekStart || "");
      setLoading(false);

      if (weeks.length === 0) {
        setReport(null);
      }
    }

    loadWeeks();

    return () => {
      cancelled = true;
    };
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode || !selectedWeek) {
      return;
    }

    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      setAiInsights(null);

      const liveReport = await getWeeklyReportAction(
        selectedWeek.weekStart,
        selectedWeek.weekEnd
      );

      if (cancelled) return;

      if (!liveReport) {
        setReport(null);
        setAiLoading(false);
        setLoading(false);
        setError(
          authConfigured
            ? "No live report data is available yet for this workspace."
            : "InsForge is not configured locally yet."
        );
        return;
      }

      setReport(liveReport);
      setLoading(false);
      setAiLoading(true);

      const insights = await generateReportInsightsAction(liveReport);
      if (cancelled) return;

      setAiInsights(insights);
      setAiLoading(false);
    }

    loadReport();

    return () => {
      cancelled = true;
    };
  }, [authConfigured, isDemoMode, selectedWeek]);

  if (loading && !report) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-jackson-charcoal-muted">Loading report...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
        <p className="text-amber-200">{error}</p>
        <p className="mt-2 text-sm text-amber-100/80">
          Import the InsForge schema and call-event data to populate reports.
        </p>
      </div>
    );
  }

  if (!report || availableWeeks.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="text-jackson-charcoal-muted">
          No call data is available yet. Reports will appear once call events are
          stored in InsForge.
        </p>
      </div>
    );
  }

  const maxDayTotal = Math.max(
    ...report.dayOfWeekBreakdown.map((day) => day.total),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <label
            htmlFor="week-select"
            className="text-sm font-medium text-jackson-charcoal"
          >
            {templateConfig.reports.selectorLabel}:
          </label>
          <select
            id="week-select"
            value={selectedWeek?.weekStart || ""}
            onChange={(event) => setSelectedWeekStart(event.target.value)}
            className="glass-input rounded-lg px-4 py-2 text-sm font-medium text-jackson-charcoal focus:border-jackson-green focus:outline-none focus:ring-1 focus:ring-jackson-green"
          >
            {availableWeeks.map((week) => (
              <option key={week.weekStart} value={week.weekStart}>
                {week.label}
              </option>
            ))}
          </select>
        </div>
        {aiLoading && (
          <div className="flex items-center gap-2 text-sm text-jackson-green">
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
            Generating AI insights...
          </div>
        )}
      </div>

      <section className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-jackson-charcoal">
          At-A-Glance Performance
        </h2>
        <p className="mt-1 text-sm text-jackson-charcoal-muted">
          {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <MetricCard
            label="Total Calls"
            value={report.totalCalls.toLocaleString()}
            subtitle="during the selected period"
          />
          <MetricCard
            label="Daily Average"
            value={report.avgDailyCalls.toFixed(1)}
            subtitle="calls per day"
          />
          <MetricCard
            label="Peak Day"
            value={report.peakDay?.calls?.toLocaleString() || "0"}
            subtitle={
              report.peakDay?.date ? formatDate(report.peakDay.date) : "No peak yet"
            }
          />
          <MetricCard
            label="After-Hours"
            value={report.afterHoursCalls.toLocaleString()}
            subtitle={`${report.afterHoursPercentage}% of volume`}
          />
          <MetricCard
            label="Total Days"
            value={report.totalDays.toLocaleString()}
            subtitle="covered by this report"
          />
        </div>
      </section>

      <section className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-jackson-charcoal">
            Executive Summary
          </h2>
          <span className="glass-chip rounded-full px-2 py-0.5 text-xs font-medium text-jackson-green">
            {templateConfig.assistant.badgeLabel}
          </span>
        </div>
        {aiLoading ? (
          <div className="glass-panel mt-4 h-16 animate-pulse rounded-lg" />
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-jackson-charcoal">
            {aiInsights?.executiveSummary ||
              `The voice agent handled ${report.totalCalls.toLocaleString()} calls in the selected period.`}
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-jackson-charcoal">
            Call Categories
          </h2>
          <p className="mt-1 text-sm text-jackson-charcoal-muted">
            What callers are asking about most often
          </p>

          <div className="mt-4 space-y-3">
            {report.categoryBreakdown.map((category) => (
              <div key={category.category}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-jackson-charcoal">
                    {category.category}
                  </span>
                  <span className="text-jackson-charcoal-muted">
                    {category.count} ({category.percentage}%)
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-jackson-white/10">
                  <div
                    className="h-full rounded-full bg-jackson-green"
                    style={{ width: `${Math.min(category.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-jackson-charcoal">
            Call Volume by Day
          </h2>
          <p className="mt-1 text-sm text-jackson-charcoal-muted">
            Which weekdays are carrying the most demand
          </p>

          <div className="mt-4 space-y-3">
            {report.dayOfWeekBreakdown.map((day) => {
              const width = maxDayTotal > 0 ? (day.total / maxDayTotal) * 100 : 0;

              return (
                <div key={day.day}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-jackson-charcoal">
                      {day.day}
                    </span>
                    <span className="text-jackson-charcoal-muted">
                      {day.total} calls
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-jackson-white/10">
                    <div
                      className="h-full rounded-full bg-jackson-green"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-jackson-charcoal">
            Key Insights
          </h2>
          <span className="glass-chip rounded-full px-2 py-0.5 text-xs font-medium text-jackson-green">
            {templateConfig.assistant.badgeLabel}
          </span>
        </div>
        {aiLoading ? (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="glass-panel h-8 animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {(aiInsights?.keyInsights || []).map((insight, index) => (
              <li key={`${insight}-${index}`} className="flex items-start gap-3">
                <span className="glass-chip mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium text-jackson-green">
                  {index + 1}
                </span>
                <span className="text-sm text-jackson-charcoal">{insight}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-jackson-charcoal-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-jackson-charcoal">{value}</p>
      <p className="mt-0.5 text-xs text-jackson-charcoal-muted">{subtitle}</p>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
