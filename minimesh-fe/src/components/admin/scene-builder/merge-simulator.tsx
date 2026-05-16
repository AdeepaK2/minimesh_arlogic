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
    <div className="space-y-2">
      <p className="text-[10px] text-landing-subtle">
        Select fragments to preview a merged scene in the viewport.
      </p>
      <ul className="max-h-24 space-y-0.5 overflow-y-auto rounded-md border border-landing bg-landing-surface p-1">
        {templates.slice(0, 12).map((template) => {
          const checked = selectedIds.includes(template.id);
          return (
            <li key={template.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[10px] hover:bg-landing-hover">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(template.id)}
                  className="rounded border-landing"
                />
                <span className={checked ? "text-landing-heading" : "text-landing-muted"}>
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
        className="admin-btn-primary w-full rounded-md py-1.5 text-[10px] font-semibold disabled:opacity-40"
      >
        Simulate merge ({selectedIds.length})
      </button>
    </div>
  );
}
