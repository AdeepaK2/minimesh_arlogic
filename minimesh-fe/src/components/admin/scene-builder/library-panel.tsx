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
    <div className="sb-panel h-full min-h-0">
      <div className="sb-panel-header">
        <p className="text-xs font-semibold text-landing-heading">Vector library</p>
        <div className="relative mt-2">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search objects…"
            className="sb-input"
          />
          {isSearching ? (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-landing-subtle">
              …
            </span>
          ) : null}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {[
            { label: "Hit rate", value: "68%" },
            { label: "Reuse", value: "4.2×" },
            { label: "Saved", value: "31%" },
          ].map((stat) => (
            <div key={stat.label} className="sb-stat-pill">
              <span className="text-[8px] uppercase text-landing-subtle">{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="sb-panel-body !py-2">
        <ul className="space-y-1.5">
          {ranked.map(({ template, score }) => (
            <li key={template.id}>
              <article
                className="sb-library-card overflow-hidden"
                data-selected={selectedId === template.id}
              >
                <button
                  type="button"
                  onClick={() => onPreview(template)}
                  className="flex w-full gap-2 p-2 text-left"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-landing bg-landing-surface text-[9px] font-bold text-landing-muted">
                    {template.category.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-1">
                      <span className="truncate text-[11px] font-semibold text-landing-heading">
                        {template.name}
                      </span>
                      {searchQuery && score > 0 ? (
                        <span className="shrink-0 font-mono text-[9px] text-landing-heading">
                          {(score * 100).toFixed(0)}%
                        </span>
                      ) : template.hasEmbedding ? (
                        <span className="shrink-0 text-[8px] uppercase text-landing-subtle">
                          vec
                        </span>
                      ) : null}
                    </span>
                    <span className="text-[9px] uppercase tracking-wide text-landing-subtle">
                      {template.category}
                    </span>
                    <span className="mt-0.5 line-clamp-1 text-[10px] text-landing-subtle">
                      {template.description}
                    </span>
                  </span>
                </button>
                <div className="flex gap-1 border-t border-landing px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => onEdit(template)}
                    className="flex-1 rounded-md border border-landing py-1 text-[9px] font-medium text-landing-muted hover:bg-landing-hover"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(template)}
                    className="rounded-md border border-landing px-2 py-1 text-[9px] font-medium text-rose-400 hover:bg-rose-500/10"
                  >
                    Del
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>

      <div className="sb-panel-footer !py-2">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-landing-subtle">
          Most reused
        </p>
        <ul className="mt-1 space-y-0.5">
          {topReused.map((item) => (
            <li
              key={item.name}
              className="flex justify-between gap-2 text-[10px] text-landing-muted"
            >
              <span className="truncate">{item.name}</span>
              <span className="shrink-0 font-mono">{item.count}×</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
