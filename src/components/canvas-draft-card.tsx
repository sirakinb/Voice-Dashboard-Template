"use client";

import { useCanvas, CanvasDraft } from "@/lib/canvas-context";

type Props = {
  draft: CanvasDraft;
};

const typeIcons = {
  summary: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  report: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  analysis: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  list: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
};

const typeLabels = {
  summary: "Summary",
  report: "Report",
  analysis: "Analysis",
  list: "List",
};

export function CanvasDraftCard({ draft }: Props) {
  const { removeItem } = useCanvas();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(draft.content);
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="glass-panel flex h-10 w-10 items-center justify-center rounded-xl text-jackson-green">
            {typeIcons[draft.type]}
          </div>
          <div>
            <h3 className="font-semibold text-jackson-charcoal">{draft.title}</h3>
            <div className="flex items-center gap-2">
              <span className="glass-chip rounded px-1.5 py-0.5 text-[10px] font-medium uppercase text-jackson-green">
                {typeLabels[draft.type]}
              </span>
              <span className="text-xs text-jackson-text-muted">
                {draft.createdAt.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={copyToClipboard}
            className="rounded-lg p-1.5 text-jackson-text-muted transition hover:bg-jackson-white/10 hover:text-jackson-charcoal"
            title="Copy to clipboard"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => removeItem(draft.id)}
            className="rounded-lg p-1.5 text-jackson-text-muted transition hover:bg-jackson-white/10 hover:text-jackson-charcoal"
            title="Remove"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="prose prose-sm max-w-none text-jackson-charcoal">
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {draft.content}
        </div>
      </div>
    </div>
  );
}
