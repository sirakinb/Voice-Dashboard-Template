import {
  createInsforgeServerClient,
  getServerSession,
  hasInsforgeConfig,
} from "@/lib/insforge/server";
import {
  dailyCallVolume as fallbackDailyCallVolume,
  hourlyCallVolume as fallbackHourlyCallVolume,
  type CallVolumeDatum,
  type StatCard,
} from "@/lib/mockData";

type DailyMetricsRow = {
  day_date: string;
  day_label: string;
  total_calls: number;
  ai_calls: number;
  callbacks: number;
};

type CallEventRow = {
  could_ai_answer: boolean | string | null;
  callback_requested: boolean | string | null;
};

type MetricSummary = {
  totalCalls: number;
  aiHandled: number;
  callbacks: number;
};

export type DashboardData = {
  statCards: StatCard[];
  dailyCallVolume: CallVolumeDatum[];
  hourlyCallVolume: CallVolumeDatum[];
  isLive: boolean;
};

const buildStatCards = (
  current: MetricSummary,
  previous: MetricSummary
): StatCard[] => {
  const currentAiRatio = ratio(current.aiHandled, current.totalCalls);
  const previousAiRatio = ratio(previous.aiHandled, previous.totalCalls);

  const currentCallbackRatio = ratio(current.callbacks, current.totalCalls);
  const previousCallbackRatio = ratio(previous.callbacks, previous.totalCalls);

  return [
    {
      label: "Total Daily Calls",
      value: current.totalCalls.toString(),
      change: percentDifference(current.totalCalls, previous.totalCalls),
    },
    {
      label: "% of Calls AI Could Handle",
      value: formatPercent(currentAiRatio),
      change: percentPointDifference(currentAiRatio, previousAiRatio),
    },
    {
      label: "Callbacks Required",
      value: formatPercent(currentCallbackRatio),
      change: percentPointDifference(currentCallbackRatio, previousCallbackRatio),
    },
  ];
};

const transformDailyVolume = (rows: DailyMetricsRow[]): CallVolumeDatum[] =>
  rows.map((row) => ({
    day: row.day_label,
    isoDate: row.day_date,
    totalCalls: row.total_calls,
    aiHandled: row.ai_calls,
  }));

export async function getDashboardData(): Promise<DashboardData> {
  if (!hasInsforgeConfig()) {
    return getFallbackDashboardData();
  }

  const { accessToken } = await getServerSession();

  if (!accessToken) {
    return getFallbackDashboardData();
  }

  try {
    const client = createInsforgeServerClient(accessToken);
    const now = new Date();
    const currentStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const previousStart = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);

    const [dailyRes, hourlyRes, currentWindowRes, previousWindowRes] =
      await Promise.all([
        client.database.from("daily_call_metrics").select("*"),
        client.database.from("hourly_call_metrics").select("*"),
        client.database
          .from("call_events")
          .select("could_ai_answer, callback_requested")
          .gte("created_time", currentStart.toISOString())
          .lt("created_time", now.toISOString()),
        client.database
          .from("call_events")
          .select("could_ai_answer, callback_requested")
          .gte("created_time", previousStart.toISOString())
          .lt("created_time", currentStart.toISOString()),
      ]);

    if (
      dailyRes.error ||
      hourlyRes.error ||
      currentWindowRes.error ||
      previousWindowRes.error
    ) {
      return getFallbackDashboardData();
    }

    const currentSummary = summarizeWindow(
      (currentWindowRes.data as CallEventRow[] | null) ?? []
    );
    const previousSummary = summarizeWindow(
      (previousWindowRes.data as CallEventRow[] | null) ?? []
    );

    return {
      statCards: buildStatCards(currentSummary, previousSummary),
      dailyCallVolume: transformDailyVolume(
        (dailyRes.data as DailyMetricsRow[] | null) ?? []
      ),
      hourlyCallVolume:
        ((hourlyRes.data as
          | Array<{
              hour_ts: string;
              hour_label: string;
              total_calls: number;
              ai_calls: number;
            }>
          | null) ?? []
        ).map((row) => ({
          day: row.hour_label,
          isoDate: row.hour_ts,
          totalCalls: row.total_calls,
          aiHandled: row.ai_calls,
        })),
      isLive: true,
    };
  } catch {
    return getFallbackDashboardData();
  }
}

function getFallbackDashboardData(): DashboardData {
  const fallbackCurrentSummary: MetricSummary = {
    totalCalls: 182,
    aiHandled: Math.round(0.72 * 182),
    callbacks: Math.round(0.18 * 182),
  };
  const fallbackPreviousSummary: MetricSummary = {
    totalCalls: 160,
    aiHandled: Math.round(0.64 * 160),
    callbacks: Math.round(0.22 * 160),
  };

  return {
    statCards: buildStatCards(fallbackCurrentSummary, fallbackPreviousSummary),
    dailyCallVolume: fallbackDailyCallVolume,
    hourlyCallVolume: fallbackHourlyCallVolume,
    isLive: false,
  };
}

const summarizeWindow = (rows: CallEventRow[]): MetricSummary => {
  return rows.reduce<MetricSummary>(
    (acc, row) => {
      acc.totalCalls += 1;
      if (isAiHandled(row.could_ai_answer)) {
        acc.aiHandled += 1;
      }
      if (isTruthy(row.callback_requested)) {
        acc.callbacks += 1;
      }
      return acc;
    },
    { totalCalls: 0, aiHandled: 0, callbacks: 0 }
  );
};

const isAiHandled = (value: boolean | string | null): boolean => {
  if (typeof value === "boolean") return value;
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "yes" ||
    normalized === "true" ||
    normalized === "1" ||
    normalized.includes("handled the call independently")
  );
};

const isTruthy = (value: boolean | string | null): boolean => {
  if (typeof value === "boolean") return value;
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "yes" || normalized === "true" || normalized === "1";
};

const ratio = (part: number, whole: number): number =>
  whole === 0 ? 0 : part / whole;

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

const percentDifference = (current: number, previous: number): number => {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

const percentPointDifference = (current: number, previous: number): number =>
  Math.round((current - previous) * 1000) / 10;
