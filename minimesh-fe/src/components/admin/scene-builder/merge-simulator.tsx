"use client";

import type { ObjectTemplateRecord } from "@/lib/admin/object-template-types";

interface MergeSimulatorProps {
  templates: ObjectTemplateRecord[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSimulate: () => void;
}

export function MergeSimulator({
  templates,
  selectedIds,
  onToggle,
  onSimulate,
}: MergeSimulatorProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
        Scene merge simulator
      </p>
      <p className="mt-1 text-[11px] text-zinc-500">
        Combine fragments (e.g. bird + tree + bench) before publishing a pack.
      </p>
      <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto">
        {templates.slice(0, 12).map((template) => {
          const checked = selectedIds.includes(template.id);
          return (
            <li key={template.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(template.id)}
                  className="rounded border-white/20"
                />
                <span className={checked ? "text-cyan-200" : "text-zinc-400"}>
                  {template.name}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        disabled={selectedIds.length === 0}
        onClick={onSimulate}
        className="mt-3 w-full rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-40"
      >
        Simulate merge ({selectedIds.length})
      </button>
    </div>
  );
}
