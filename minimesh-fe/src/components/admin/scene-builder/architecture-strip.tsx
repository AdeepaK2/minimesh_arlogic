"use client";

import { ARCHITECTURE_NODES } from "@/lib/admin/scene-builder-helpers";

export function ArchitectureStrip() {
  return (
    <div className="sb-footer flex shrink-0 flex-wrap items-center gap-2 border-t border-landing px-3 py-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-landing-subtle">
        Stack
      </span>
      {ARCHITECTURE_NODES.map((node) => (
        <span
          key={node.label}
          className="rounded-md border border-landing bg-landing-card px-2 py-0.5 text-[10px] text-landing-muted"
          title={node.detail}
        >
          <span className="font-medium text-landing-heading">{node.label}</span>
          <span className="text-landing-subtle"> · {node.detail}</span>
        </span>
      ))}
    </div>
  );
}
