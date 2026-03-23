type DashboardHeaderProps = {
  title: string;
  subtitle?: string;
  connectionLabel?: string;
};

export function DashboardHeader({
  title,
  subtitle,
  connectionLabel,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-jackson-charcoal">{title}</h1>
        {subtitle ? (
          <p className="text-sm text-jackson-text-muted">{subtitle}</p>
        ) : null}
      </div>
      {connectionLabel ? (
        <div className="glass-chip flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-jackson-green">
          <span className="h-2 w-2 rounded-full bg-jackson-green" aria-hidden />
          {connectionLabel}
        </div>
      ) : null}
    </header>
  );
}
