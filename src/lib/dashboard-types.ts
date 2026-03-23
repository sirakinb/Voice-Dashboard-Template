export type CategoryBreakdown = {
  category: string;
  count: number;
  percentage: number;
};

export type DayOfWeekData = {
  day: string;
  dayNumber: number;
  total: number;
  avg: number;
};

export type WeekOption = {
  weekStart: string;
  weekEnd: string;
  label: string;
};

export type ReportData = {
  periodStart: string;
  periodEnd: string;
  totalDays: number;
  totalCalls: number;
  avgDailyCalls: number;
  afterHoursCalls: number;
  afterHoursPercentage: number;
  peakDay: {
    date: string;
    calls: number;
  };
  categoryBreakdown: CategoryBreakdown[];
  dayOfWeekBreakdown: DayOfWeekData[];
  dailyData?: Array<{
    date: string;
    dayLabel: string;
    dayName: string;
    totalCalls: number;
    aiHandled: number;
  }>;
};

export type DataAssistantContext = Pick<
  ReportData,
  | "periodStart"
  | "periodEnd"
  | "totalCalls"
  | "avgDailyCalls"
  | "afterHoursCalls"
  | "afterHoursPercentage"
  | "peakDay"
  | "categoryBreakdown"
  | "dayOfWeekBreakdown"
>;
