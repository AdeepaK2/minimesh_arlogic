"use client";

import type {
  ObjectTemplateRecord,
  ObjectTemplateSearchHit,
} from "@/lib/admin/object-template-types";
import { scoreTemplateRelevance } from "@/lib/admin/scene-builder-helpers";

interface LibraryPanelProps {
  templates: ObjectTemplateRecord[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  semanticHits: ObjectTemplateSearchHit[];
  isSearching: boolean;
  selectedId: string | null;
  onPreview: (template: ObjectTemplateRecord) => void;
  onEdit: (template: ObjectTemplateRecord) => void;
  onDelete: (template: ObjectTemplateRecord) => void;
}

export function LibraryPanel({
  templates,
  searchQuery,
  onSearchChange,
  semanticHits,
  isSearching,
  selectedId,
  onPreview,
  onEdit,
  onDelete,
}: LibraryPanelProps) {
  const ranked = searchQuery.trim()
    ? [...templates]
        .map((template) => {
          const hit = semanticHits.find((item) => item.id === template.id);
          return {
            template,
            score: hit?.score ?? scoreTemplateRelevance(template, searchQuery),
          };
        })
        .sort((a, b) => b.score - a.score)
    : templates.map((template) => ({ template, score: 0 }));

  const topReused = [...templates]
    .slice(0, 3)
    .map((t, i) => ({ name: t.name, count: 120 - i * 37 }));

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#06060a]/80 backdrop-blur-xl">
      <div className="border-b border-white/10 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
          Vector library
        </p>
        <div className="relative mt-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search reusable objects…"
            className="h-10 w-full rounded-xl border border-white/10 bg-black/40 pl-3 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/15"
          />
          {isSearching ? (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-cyan-400">
              …
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-b border-white/10 px-4 py-3">
        {[
          { label: "Cache hit", value: "68%" },
          { label: "Avg reuse", value: "4.2×" },
          { label: "Saved gens", value: "31%" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5 text-center"
          >
            <p className="text-[9px] uppercase text-zinc-500">{stat.label}</p>
            <p className="text-sm font-semibold text-cyan-300">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-2">
          {ranked.map(({ template, score }) => (
            <li key={template.id}>
              <div
                className={`rounded-xl border transition ${
                  selectedId === template.id
                    ? "admin-glow-border border-cyan-500/40 bg-cyan-500/10"
                    : "border-white/10 bg-white/[0.02] hover:border-cyan-500/25 hover:bg-white/[0.04]"
                }`}
              >
              <button
                type="button"
                onClick={() => onPreview(template)}
                className="w-full p-3 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-gradient-to-br from-cyan-500/20 to-violet-500/10 text-[10px] font-bold text-cyan-200">
                    {template.category.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {template.name}
                    </p>
                    <p className="text-[10px] uppercase text-zinc-500">
                      {template.category}
                    </p>
                  </div>
                  {searchQuery && score > 0 ? (
                    <span className="shrink-0 font-mono text-[10px] text-emerald-400">
                      {(score * 100).toFixed(0)}%
                    </span>
                  ) : template.hasEmbedding ? (
                    <span className="shrink-0 text-[10px] text-cyan-500/80">
                      vec
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 line-clamp-2 text-[11px] text-zinc-500">
                  {template.description}
                </p>
                {template.tags.length > 0 ? (
                  <p className="mt-1.5 truncate text-[10px] text-zinc-600">
                    {template.tags.slice(0, 5).join(" · ")}
                  </p>
                ) : null}
              </button>
              <div className="flex gap-2 border-t border-white/5 px-3 pb-3">
                <button
                  type="button"
                  onClick={() => onEdit(template)}
                  className="flex-1 rounded-lg border border-white/10 py-1.5 text-[10px] font-semibold text-cyan-300 hover:border-cyan-500/30"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(template)}
                  className="rounded-lg border border-rose-500/20 px-3 py-1.5 text-[10px] font-semibold text-rose-300 hover:border-rose-500/40"
                >
                  Delete
                </button>
              </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-white/10 p-3">
        <p className="text-[10px] font-semibold uppercase text-zinc-500">
          Most reused
        </p>
        <ul className="mt-2 space-y-1">
          {topReused.map((item) => (
            <li
              key={item.name}
              className="flex justify-between text-[11px] text-zinc-400"
            >
              <span className="truncate">{item.name}</span>
              <span className="text-cyan-500/80">{item.count}×</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
