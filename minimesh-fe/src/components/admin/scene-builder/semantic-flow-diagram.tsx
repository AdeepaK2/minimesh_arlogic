"use client";

import { PIPELINE_EXAMPLE } from "@/lib/admin/scene-builder-helpers";

const STEPS = [
  "Prompt",
  "Keywords",
  "Embed",
  "Search",
  "Assemble",
  "Generate",
];

export function SemanticFlowDiagram() {
  return (
    <div className="sb-pipeline px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-landing-subtle">
          Pipeline
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {STEPS.map((step, index) => (
            <span key={step} className="flex items-center gap-1">
              <span className="rounded-md border border-landing bg-landing-surface px-1.5 py-0.5 text-[10px] font-medium text-landing-muted">
                {step}
              </span>
              {index < STEPS.length - 1 ? (
                <span className="text-[10px] text-landing-subtle">›</span>
              ) : null}
            </span>
          ))}
        </div>
        <div className="hidden items-center gap-1.5 sm:flex">
          <span className="max-w-[140px] truncate text-[10px] text-landing-subtle">
            e.g. {PIPELINE_EXAMPLE.prompt}
          </span>
          {PIPELINE_EXAMPLE.matches.slice(0, 2).map((match) => (
            <span
              key={match}
              className="rounded-full border border-landing bg-landing-hover px-1.5 py-0.5 text-[9px] text-landing-muted"
            >
              {match}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
