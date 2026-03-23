import type { CallVolumeDatum } from "@/lib/mockData";

type CallVolumeChartProps = {
  data: CallVolumeDatum[];
  className?: string;
};

// Convert 24-hour time to 12-hour format
function formatTimeLabel(label: string): string {
  // Check if it's an hourly format like "00:00", "13:00", etc.
  const hourMatch = label.match(/^(\d{1,2}):00$/);
  if (hourMatch) {
    const hour = parseInt(hourMatch[1], 10);
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  }

  // Check for HH:MM format (e.g., "14:30")
  const timeMatch = label.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1], 10);
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${timeMatch[2]} ${suffix}`;
  }

  return label;
}

export function CallVolumeChart({ data, className }: CallVolumeChartProps) {
  if (data.length === 0) {
    return (
      <div className="glass-panel flex h-56 items-center justify-center rounded-xl border border-dashed border-jackson-green/20 text-sm text-jackson-text-muted">
        No call activity for this timeframe yet.
      </div>
    );
  }

  // Chart dimensions with padding for axes
  const padding = { top: 20, right: 30, bottom: 70, left: 55 };
  const totalWidth = 780;
  const totalHeight = 400;
  const chartWidth = totalWidth - padding.left - padding.right;
  const chartHeight = totalHeight - padding.top - padding.bottom;

  const maxDataValue = Math.max(...data.map((item) => item.totalCalls), 0);
  // Round up to a nice number for the Y-axis
  const niceMax = Math.max(Math.ceil(maxDataValue / 5) * 5, 5);
  const step = data.length > 1 ? chartWidth / (data.length - 1) : (data.length === 1 ? chartWidth / 2 : chartWidth);

  // Generate Y-axis tick values
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) =>
    Math.round((niceMax / yTickCount) * i)
  );

  // Determine optimal number of labels based on data length
  const getOptimalLabelCount = (dataLen: number) => {
    if (dataLen <= 7) return dataLen; // Show all for weekly
    if (dataLen <= 12) return dataLen; // Show all for monthly
    if (dataLen <= 24) return 8; // Hourly: show every 3 hours
    return 7; // Daily: show ~7 labels
  };

  const maxLabels = getOptimalLabelCount(data.length);
  const labelSkip = Math.max(1, Math.ceil(data.length / maxLabels));

  // Determine if we need rotated labels (when many data points)
  const needsRotation = data.length > 12;

  const getX = (index: number) => padding.left + index * step;
  const getY = (value: number) => padding.top + chartHeight - (value / niceMax) * chartHeight;

  const buildLine = (key: keyof CallVolumeDatum) => {
    if (data.length === 0) return "";
    return data
      .map((item, index) => {
        const x = getX(index);
        const value = (item[key] as number) || 0;
        const y = getY(value);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(" ");
  };

  const areaPoints = data.length > 0 ? [
    `${padding.left},${padding.top + chartHeight}`,
    ...data.map((item, index) => {
      const x = getX(index);
      const y = getY(item.totalCalls);
      return `${x},${y}`;
    }),
    `${getX(data.length - 1)},${padding.top + chartHeight}`,
  ].join(" ") : "";

  const linePoints = buildLine("aiHandled");

  const containerHeight = className ?? "h-56";

  return (
    <div className={`${containerHeight} relative overflow-x-auto`}>
      <div className="pointer-events-none absolute right-4 top-4 flex gap-4 text-xs font-medium text-jackson-charcoal">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "#b387ff" }}
          />
          Total Calls
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "#7c3aed" }}
          />
          Resolved by AI
        </span>
      </div>
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="h-full min-h-[400px] w-full min-w-[700px]"
        role="img"
        aria-label="Call volume comparison between total calls and AI-handled calls."
      >
        <defs>
          <linearGradient
            id="total-call-gradient"
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#b387ff" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#31204f" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {yTicks.map((tick) => (
          <line
            key={`grid-${tick}`}
            x1={padding.left}
            x2={totalWidth - padding.right}
            y1={getY(tick)}
            y2={getY(tick)}
            stroke="rgb(255 255 255 / 0.14)"
            strokeWidth={1}
            strokeDasharray={tick === 0 ? "0" : "4,4"}
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick) => (
          <text
            key={`y-label-${tick}`}
            x={padding.left - 12}
            y={getY(tick)}
            textAnchor="end"
            dominantBaseline="middle"
            fill="#b7a5da"
            fontSize="12"
            fontWeight="500"
          >
            {tick}
          </text>
        ))}

        {/* Y-axis title */}
        <text
          x={16}
          y={totalHeight / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#b7a5da"
          fontSize="11"
          fontWeight="500"
          transform={`rotate(-90, 16, ${totalHeight / 2})`}
        >
          Number of Calls
        </text>

        {/* Area fill for total calls */}
        {areaPoints && (
          <polygon
            points={areaPoints}
            fill="url(#total-call-gradient)"
            stroke="none"
          />
        )}

        {/* Total calls line */}
        <polyline
          points={buildLine("totalCalls")}
          fill="none"
          stroke="#b387ff"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* AI handled line */}
        <polyline
          points={linePoints}
          fill="none"
          stroke="#7c3aed"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points and X-axis labels */}
        {data.map((item, index) => {
          const x = getX(index);
          const totalY = getY(item.totalCalls);
          const aiY = getY(item.aiHandled);
          const showLabel = index % labelSkip === 0 || index === data.length - 1;

          return (
            <g key={`${item.isoDate}-${item.day}-${index}`}>
              {/* Vertical grid line (subtle) */}
              {showLabel && (
                <line
                  x1={x}
                  x2={x}
                  y1={padding.top}
                  y2={padding.top + chartHeight}
                  stroke="rgb(255 255 255 / 0.1)"
                  strokeWidth={1}
                />
              )}
              {/* Total calls dot */}
              <circle
                cx={x}
                cy={totalY}
                r={4}
                fill="#b387ff"
                stroke="#FFFFFF"
                strokeWidth={2}
              />
              {/* AI handled dot */}
              <circle
                cx={x}
                cy={aiY}
                r={4}
                fill="#7c3aed"
                stroke="#FFFFFF"
                strokeWidth={2}
              />
              {/* X-axis label - only show every nth label to avoid overlap */}
              {showLabel && (
                <text
                  x={x}
                  y={padding.top + chartHeight + 20}
                  textAnchor={needsRotation ? "end" : "middle"}
                  fill="#6B7280"
                  fontSize="11"
                  fontWeight="500"
                  transform={needsRotation ? `rotate(-45, ${x}, ${padding.top + chartHeight + 20})` : undefined}
                >
                  {formatTimeLabel(item.day)}
                </text>
              )}
            </g>
          );
        })}

        {/* X-axis baseline */}
        <line
          x1={padding.left}
          x2={totalWidth - padding.right}
          y1={padding.top + chartHeight}
          y2={padding.top + chartHeight}
          stroke="#0F8571"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}
