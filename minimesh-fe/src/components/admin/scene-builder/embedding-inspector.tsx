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
    <div className="admin-inspector-panel rounded-xl border p-4">
      <p className="minimesh-eyebrow">Embedding inspector</p>
      <div className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-3">
        <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
          <p className="text-zinc-500">Dimensions</p>
          <p className="mt-0.5 font-mono text-white">{dimensions}</p>
        </div>
        <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
          <p className="text-zinc-500">Query</p>
          <p className="mt-0.5 truncate font-mono text-cyan-200">{query || "—"}</p>
        </div>
        <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
          <p className="text-zinc-500">Engine</p>
          <p className="mt-0.5 font-mono text-white">pgvector · cosine</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-zinc-500">Nearest neighbors</p>
      <ul className="mt-2 space-y-1.5">
        {nearest.length === 0 ? (
          <li className="text-[11px] text-zinc-600">Run a library search to inspect matches.</li>
        ) : (
          nearest.slice(0, 5).map((hit) => (
            <li
              key={hit.id}
              className="flex items-center justify-between rounded-lg border border-white/5 px-2 py-1.5 text-[11px]"
            >
              <span className="truncate text-zinc-300">{hit.name}</span>
              <span className="font-mono text-cyan-400">
                {(hit.score * 100).toFixed(0)}%
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
