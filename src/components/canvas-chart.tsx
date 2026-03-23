"use client";

import { useCanvas, CanvasChart as CanvasChartType } from "@/lib/canvas-context";

type Props = {
  chart: CanvasChartType;
};

export function CanvasChart({ chart }: Props) {
  const { removeItem } = useCanvas();

  const maxValue = Math.max(...chart.data.map((d) => d.value));
  const colors = [
    "#b387ff",
    "#d8b4fe",
    "#8b5cf6",
    "#6366f1",
    "#ec4899",
    "#b387ff88",
  ];

  return (
    <div className="glass-card rounded-2xl p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-jackson-charcoal">{chart.title}</h3>
          <p className="text-xs text-jackson-text-muted">
            {chart.createdAt.toLocaleString()}
          </p>
        </div>
        <button
          onClick={() => removeItem(chart.id)}
          className="rounded-lg p-1.5 text-jackson-text-muted transition hover:bg-jackson-white/10 hover:text-jackson-charcoal"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Chart */}
      {chart.type === "bar" && (
        <div className="space-y-3">
          {chart.data.map((item, index) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-jackson-charcoal">{item.label}</span>
                <span className="font-medium text-jackson-charcoal">{item.value}</span>
              </div>
              <div className="h-6 overflow-hidden rounded-full bg-jackson-white/10">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: item.color || colors[index % colors.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {chart.type === "pie" && (
        <div className="flex items-center gap-6">
          <div className="relative h-40 w-40 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              {(() => {
                const total = chart.data.reduce((sum, d) => sum + d.value, 0);
                let currentAngle = 0;
                return chart.data.map((item, index) => {
                  const percentage = (item.value / total) * 100;
                  const angle = (percentage / 100) * 360;
                  const startAngle = currentAngle;
                  currentAngle += angle;

                  const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                  const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                  const x2 = 50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180);
                  const y2 = 50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180);
                  const largeArc = angle > 180 ? 1 : 0;

                  return (
                    <path
                      key={item.label}
                      d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={item.color || colors[index % colors.length]}
                    />
                  );
                });
              })()}
            </svg>
          </div>
          <div className="space-y-2">
            {chart.data.map((item, index) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color || colors[index % colors.length] }}
                />
                <span className="text-jackson-charcoal">{item.label}</span>
                <span className="font-medium text-jackson-charcoal">({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(chart.type === "line" || chart.type === "area") && (
        <div className="h-48">
          <svg viewBox="0 0 400 150" className="h-full w-full" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={i}
                x1="40"
                y1={30 + i * 25}
                x2="390"
                y2={30 + i * 25}
                  stroke="rgb(255 255 255 / 0.16)"
                strokeWidth="1"
              />
            ))}

            {/* Area fill */}
            {chart.type === "area" && chart.data.length > 0 && (
              <path
                d={`
                  M 40 130
                  ${chart.data.map((item, index) => {
                  const divisor = Math.max(chart.data.length - 1, 1);
                  const x = 40 + (index / divisor) * 350;
                  const y = maxValue > 0 ? 130 - (item.value / maxValue) * 100 : 130;
                  return `L ${x} ${y}`;
                }).join(" ")}
                  L 390 130
                  Z
                `}
                fill="url(#areaGradient)"
              />
            )}

            {/* Line */}
            {chart.data.length > 0 && (
              <path
                d={chart.data.map((item, index) => {
                  const divisor = Math.max(chart.data.length - 1, 1);
                  const x = 40 + (index / divisor) * 350;
                  const y = maxValue > 0 ? 130 - (item.value / maxValue) * 100 : 130;
                  return `${index === 0 ? "M" : "L"} ${x} ${y}`;
                }).join(" ")}
                fill="none"
                stroke="#b387ff"
                strokeWidth="2"
              />
            )}

            {/* Points */}
            {chart.data.map((item, index) => {
              const divisor = Math.max(chart.data.length - 1, 1);
              const x = 40 + (index / divisor) * 350;
              const y = maxValue > 0 ? 130 - (item.value / maxValue) * 100 : 130;
              return (
                <g key={item.label}>
                  <circle cx={x} cy={y} r="4" fill="#b387ff" />
                  <text
                    x={x}
                    y="145"
                    textAnchor="middle"
                    className="fill-jackson-text-muted text-[8px]"
                  >
                    {item.label}
                  </text>
                </g>
              );
            })}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b387ff" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#b387ff" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}
    </div>
  );
}
