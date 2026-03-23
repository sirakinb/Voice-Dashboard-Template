"use client";

import { useEffect, useMemo, useState } from "react";
import { CallVolumeChart } from "@/components/call-volume-chart";
import type { CallVolumeDatum } from "@/lib/mockData";
import { templateConfig } from "@/lib/template-config";

type Timeframe = "Hourly" | "Daily" | "Weekly" | "Monthly";

type CallVolumePanelProps = {
  dailyData: CallVolumeDatum[];
  hourlyData: CallVolumeDatum[];
};

export function CallVolumePanel({
  dailyData,
  hourlyData,
}: CallVolumePanelProps) {
  const hasHourlyData = hourlyData.length > 0;
  const [timeframe, setTimeframe] = useState<Timeframe>(
    hasHourlyData ? "Hourly" : "Daily"
  );

  const groupedData = useMemo(
    () => buildTimeframes({ dailyData, hourlyData }),
    [dailyData, hourlyData]
  );

  useEffect(() => {
    if (!hasHourlyData && timeframe === "Hourly") {
      setTimeframe("Daily");
    }
  }, [hasHourlyData, timeframe]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-jackson-charcoal">
            Call Volume Over Time
          </h2>
          <p className="text-sm text-jackson-text-muted">
            {templateConfig.dashboard.volumeSubtitle}
          </p>
        </div>
        <div className="glass-panel flex items-center gap-1 rounded-full p-1 text-sm font-medium text-jackson-text-muted">
          {(["Hourly", "Daily", "Weekly", "Monthly"] as const).map((item) => (
            <button
              key={item}
              className={`rounded-full px-3 py-1.5 transition-all ${item === timeframe
                  ? "bg-jackson-green/80 text-white shadow-lg"
                  : "hover:text-jackson-charcoal"
                }`}
              type="button"
              onClick={() => setTimeframe(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <CallVolumeChart data={groupedData[timeframe]} className="h-[26rem]" />
    </div>
  );
}

type TimeframeData = Record<Timeframe, CallVolumeDatum[]>;

function buildTimeframes({
  dailyData,
  hourlyData,
}: {
  dailyData: CallVolumeDatum[];
  hourlyData: CallVolumeDatum[];
}): TimeframeData {
  const safeDaily = [...dailyData].sort((a, b) =>
    a.isoDate.localeCompare(b.isoDate)
  );
  const safeHourly = [...hourlyData].sort((a, b) =>
    a.isoDate.localeCompare(b.isoDate)
  );

  const weekly = aggregateByKey(safeDaily, (date) => {
    const weekStart = getWeekStart(date);
    return {
      key: getWeekLabel(weekStart),
      iso: weekStart.toISOString(),
    };
  });
  const monthly = aggregateByKey(safeDaily, (date) => {
    const startOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    return {
      key: date.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
      iso: startOfMonth.toISOString(),
    };
  });

  return {
    Hourly: safeHourly,
    Daily: safeDaily,
    Weekly: weekly,
    Monthly: monthly,
  };
}

function aggregateByKey(
  data: CallVolumeDatum[],
  keyFn: (date: Date) => { key: string; iso: string }
) {
  const map = new Map<string, CallVolumeDatum>();
  for (const point of data) {
    const date = new Date(point.isoDate);
    const { key, iso } = keyFn(date);
    const targetIso = iso || point.isoDate;
    const existing = map.get(key);
    if (existing) {
      existing.totalCalls += point.totalCalls;
      existing.aiHandled += point.aiHandled;
    } else {
      map.set(key, {
        day: key,
        isoDate: targetIso,
        totalCalls: point.totalCalls,
        aiHandled: point.aiHandled,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.isoDate.localeCompare(b.isoDate));
}

// Get the start of the week (Sunday) for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
}

// Format week label as "Week of Mon DD"
function getWeekLabel(weekStart: Date): string {
  const month = weekStart.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const day = weekStart.getUTCDate();
  return `Week of ${month} ${day}`;
}
