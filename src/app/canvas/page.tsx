"use client";

import Image from "next/image";
import { useCanvas } from "@/lib/canvas-context";
import { CanvasChart } from "@/components/canvas-chart";
import { CanvasDraftCard } from "@/components/canvas-draft-card";
import { Sidebar } from "@/components/sidebar";
import { templateConfig } from "@/lib/template-config";

export default function CanvasPage() {
  const { items, clearCanvas } = useCanvas();

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

          <main className="flex-1 space-y-6 overflow-y-auto px-5 py-6 lg:px-10">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-jackson-charcoal">
                    {templateConfig.canvas.title}
                  </h1>
                  <p className="mt-1 text-sm text-jackson-text-muted">
                    {templateConfig.canvas.subtitle}
                  </p>
                </div>
                {items.length > 0 && (
                  <button
                    onClick={clearCanvas}
                    className="glass-button-secondary rounded-lg px-4 py-2 text-sm font-medium text-jackson-text-muted transition hover:text-jackson-charcoal"
                  >
                    Clear Canvas
                  </button>
                )}
              </div>

              {/* Canvas Content */}
              {items.length === 0 ? (
                <div className="glass-card flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed p-12">
                  <div className="glass-panel mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
                    <svg
                      className="h-10 w-10 text-jackson-green"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                      />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-jackson-charcoal">
                    {templateConfig.canvas.emptyStateTitle}
                  </h3>
                  <p className="mb-6 max-w-md text-center text-sm text-jackson-text-muted">
                    {templateConfig.canvas.emptyStateDescription}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {templateConfig.canvas.emptyStateExamples.map((example) => (
                      <span
                        key={example}
                        className="glass-chip rounded-full px-3 py-1.5 text-xs text-jackson-charcoal"
                      >
                        &quot;{example}&quot;
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                  {items.map((item) =>
                    item.kind === "chart" ? (
                      <CanvasChart key={item.item.id} chart={item.item} />
                    ) : (
                      <CanvasDraftCard key={item.item.id} draft={item.item} />
                    )
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
