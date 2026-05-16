"use client";

import { useState } from "react";
import type { LogicalGltfDocument } from "@/lib/scene/gltf-types";

type LogicalLight = LogicalGltfDocument["lights"][number];

interface LightPanelProps {
  embedded?: boolean;
  lights: LogicalLight[];
  isRebuilding: boolean;
  onLightChange: (index: number, patch: Partial<LogicalLight>) => void;
}

const TYPE_BADGE: Record<LogicalLight["type"], string> = {
  ambient: "bg-sky-900/60 text-sky-300 ring-sky-700/50",
  directional: "bg-amber-900/60 text-amber-300 ring-amber-700/50",
  point: "bg-violet-900/60 text-violet-300 ring-violet-700/50",
};

export function LightPanel({
  embedded = false,
  lights,
  isRebuilding,
  onLightChange,
}: LightPanelProps) {
  if (lights.length === 0) {
    return (
      <div
        className={`flex h-full flex-col items-center justify-center gap-2 px-6 text-center ${embedded ? "" : "p-4"}`}
      >
        <LightbulbIcon className="h-8 w-8 text-muted opacity-30" />
        <p className="text-sm text-muted">No scene loaded yet.</p>
        <p className="text-xs text-muted/70">
          Generate a scene to edit its lights here.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-0 overflow-y-auto ${embedded ? "h-full" : "p-4"}`}>
      {isRebuilding && (
        <div className="flex items-center gap-2 border-b border-ui bg-field/60 px-4 py-2 text-xs text-muted">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
          Rebuilding scene…
        </div>
      )}
      {lights.map((light, index) => (
        <LightRow
          key={index}
          index={index}
          light={light}
          onChange={(patch) => onLightChange(index, patch)}
        />
      ))}
    </div>
  );
}

// ─── Single light row ─────────────────────────────────────────────────────────

interface LightRowProps {
  index: number;
  light: LogicalLight;
  onChange: (patch: Partial<LogicalLight>) => void;
}

function LightRow({ index, light, onChange }: LightRowProps) {
  const [expanded, setExpanded] = useState(true);
  const hasPosition = light.type !== "ambient";
  const pos = light.position ?? [0, 8, 5];

  return (
    <div className="border-b border-ui last:border-b-0">
      {/* Header row */}
      <button
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition hover:bg-field/50"
        type="button"
        onClick={() => setExpanded((v) => !v)}
      >
        <LightbulbIcon className="h-4 w-4 shrink-0 text-muted" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">
          {light.name || `Light ${index + 1}`}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1 ${TYPE_BADGE[light.type]}`}
        >
          {light.type}
        </span>
        <ChevronIcon className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Controls */}
      {expanded && (
        <div className="flex flex-col gap-3 px-4 pb-4 pt-1">
          {/* Intensity */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-secondary">Intensity</label>
              <span className="text-xs tabular-nums text-muted">{light.intensity.toFixed(2)}</span>
            </div>
            <input
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ui accent-accent"
              max={5}
              min={0}
              step={0.05}
              type="range"
              value={light.intensity}
              onChange={(e) => onChange({ intensity: parseFloat(e.target.value) })}
            />
          </div>

          {/* Color */}
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-medium text-secondary">Color</label>
            <div className="flex items-center gap-2">
              <input
                className="h-6 w-10 cursor-pointer rounded border border-ui bg-transparent"
                type="color"
                value={light.colorHex}
                onChange={(e) => onChange({ colorHex: e.target.value })}
              />
              <span className="font-mono text-xs text-muted">{light.colorHex}</span>
            </div>
          </div>

          {/* Position — directional / point only */}
          {hasPosition && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-secondary">Position</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["X", "Y", "Z"] as const).map((axis, axisIdx) => (
                  <div key={axis} className="flex flex-col gap-0.5">
                    <label className="text-center text-[10px] font-semibold text-muted">{axis}</label>
                    <input
                      className="w-full rounded border border-ui bg-field px-1.5 py-1 text-center text-xs tabular-nums text-primary focus:border-accent focus:outline-none"
                      step={0.5}
                      type="number"
                      value={pos[axisIdx]}
                      onChange={(e) => {
                        const newPos: [number, number, number] = [...pos] as [number, number, number];
                        newPos[axisIdx] = parseFloat(e.target.value) || 0;
                        onChange({ position: newPos });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M9 21h6M12 3a6 6 0 016 6c0 2.22-1.2 4.16-3 5.2V17H9v-2.8A6.001 6.001 0 0112 3z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
