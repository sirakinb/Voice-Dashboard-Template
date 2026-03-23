import { Sidebar } from "@/components/sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { PerformanceReport } from "@/components/performance-report";
import { templateConfig } from "@/lib/template-config";

export default function ReportsPage() {
  return (
    <div className="app-shell flex h-screen bg-jackson-cream">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <DashboardHeader
            title={templateConfig.reports.title}
            subtitle={templateConfig.reports.subtitle}
            connectionLabel={templateConfig.integrations.primaryLabel}
          />
          <div className="mt-8">
            <PerformanceReport />
          </div>
        </main>
        </div>
    </div>
  );
}
