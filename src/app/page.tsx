import Image from "next/image";
import { Sidebar } from "@/components/sidebar";
import { getDashboardData } from "@/lib/dashboardData";
import { DashboardContent } from "@/components/dashboard-content";
import { templateConfig } from "@/lib/template-config";

export default async function Home() {
  const { dailyCallVolume, hourlyCallVolume, statCards, isLive } =
    await getDashboardData();

  return (
    <div className="app-shell h-screen overflow-hidden bg-jackson-cream text-jackson-charcoal">
      <div className="flex h-full">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="lg:hidden">
            <div className="glass-panel mx-4 mt-4 flex items-center justify-between rounded-2xl px-5 py-4">
              <Image
                src={templateConfig.brand.logoSrc}
                alt={templateConfig.brand.companyName}
                width={120}
                height={40}
                className="h-8 w-auto"
              />
              <div className="glass-chip flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-jackson-green">
                <span className="h-2 w-2 rounded-full bg-jackson-green" aria-hidden />
                {templateConfig.integrations.primaryLabel}
              </div>
            </div>
          </div>

          <DashboardContent
            statCards={statCards}
            dailyCallVolume={dailyCallVolume}
            hourlyCallVolume={hourlyCallVolume}
            isLive={isLive}
          />
        </div>
      </div>
    </div>
  );
}
