"use client";

import type { ObjectTemplateSearchHit } from "@/lib/admin/object-template-types";

interface EmbeddingInspectorProps {
  query: string;
  nearest: ObjectTemplateSearchHit[];
  dimensions?: number;
}

export function EmbeddingInspector({
  query,
  nearest,
  dimensions = 384,
}: EmbeddingInspectorProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div className="sb-stat-pill">
          <span className="text-landing-subtle">Dims</span>
          <strong className="font-mono">{dimensions}</strong>
        </div>
        <div className="sb-stat-pill col-span-2">
          <span className="text-landing-subtle">Query</span>
          <strong className="truncate font-mono font-normal">{query || "—"}</strong>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-medium text-landing-subtle">Nearest neighbors</p>
        <ul className="mt-1.5 max-h-28 space-y-1 overflow-y-auto">
          {nearest.length === 0 ? (
            <li className="text-[10px] text-landing-subtle">
              Search the library to inspect vector matches.
            </li>
          ) : (
            nearest.slice(0, 5).map((hit) => (
              <li
                key={hit.id}
                className="flex items-center justify-between gap-2 rounded-md border border-landing bg-landing-surface px-2 py-1 text-[10px]"
              >
                <span className="truncate text-landing-muted">{hit.name}</span>
                <span className="shrink-0 font-mono text-landing-heading">
                  {(hit.score * 100).toFixed(0)}%
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
