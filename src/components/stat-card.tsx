import type { StatCard as StatCardData } from "@/lib/mockData";

export function StatCard({ label, value, change }: StatCardData) {
  const isPositive = change >= 0;

  return (
    <article className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-jackson-green">{label}</p>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <p className="text-3xl font-semibold text-jackson-charcoal">{value}</p>
        <p
          className={`text-xs font-medium ${isPositive ? "text-jackson-green" : "text-red-600"
            }`}
        >
          {isPositive ? "▲" : "▼"} {Math.abs(change)}%
        </p>
      </div>
      <p className="mt-2 text-xs text-jackson-text-muted">vs. previous period</p>
    </article>
  );
}
