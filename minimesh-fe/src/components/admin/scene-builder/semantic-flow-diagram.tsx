"use client";

import { PIPELINE_EXAMPLE } from "@/lib/admin/scene-builder-helpers";

const STEPS = [
  "User Prompt",
  "NLP Keyword Extraction",
  "Embedding Search",
  "Vector Similarity",
  "Scene Assembly",
  "Final Generation",
];

export function SemanticFlowDiagram() {
  return (
    <div className="rounded-xl border border-cyan-500/15 bg-gradient-to-br from-cyan-500/[0.06] via-transparent to-violet-500/[0.06] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/90">
        Semantic retrieval pipeline
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {STEPS.map((step, index) => (
          <div key={step} className="flex items-center gap-1.5">
            <span className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-zinc-300">
              {step}
            </span>
            {index < STEPS.length - 1 ? (
              <span className="text-cyan-500/60">→</span>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-3">
        <p className="text-xs text-zinc-400">
          Example:{" "}
          <span className="font-medium text-cyan-200">
            &quot;{PIPELINE_EXAMPLE.prompt}&quot;
          </span>
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {PIPELINE_EXAMPLE.matches.map((match) => (
            <li
              key={match}
              className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300"
            >
              {match}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
