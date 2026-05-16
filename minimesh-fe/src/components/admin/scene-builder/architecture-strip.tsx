"use client";

import { ARCHITECTURE_NODES } from "@/lib/admin/scene-builder-helpers";

export function ArchitectureStrip() {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-black/30 px-4 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        Stack
      </span>
      {ARCHITECTURE_NODES.map((node) => (
        <span
          key={node.label}
          className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-zinc-400"
          title={node.detail}
        >
          <span className="text-cyan-300/90">{node.label}</span>
          <span className="text-zinc-600"> · </span>
          {node.detail}
        </span>
      ))}
    </div>
  );
}
