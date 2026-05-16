"use client";

import type { SceneDocument } from "@/lib/scene/types";
import { FragmentPreviewViewport } from "./fragment-preview-viewport";

interface PreviewPanelProps {
  scene: SceneDocument | null;
  previewTitle?: string | null;
  objectCount: number;
  showWireframe: boolean;
  showBounds: boolean;
  showLighting: boolean;
  showGrid: boolean;
  onToggleWireframe: () => void;
  onToggleBounds: () => void;
  onToggleLighting: () => void;
  onToggleGrid: () => void;
  onCenter: () => void;
}

export function PreviewPanel({
  scene,
  previewTitle,
  objectCount,
  showWireframe,
  showBounds,
  showLighting,
  showGrid,
  onToggleWireframe,
  onToggleBounds,
  onToggleLighting,
  onToggleGrid,
  onCenter,
}: PreviewPanelProps) {
  const toggles = [
    { label: "Wire", on: showWireframe, action: onToggleWireframe },
    { label: "Bounds", on: showBounds, action: onToggleBounds },
    { label: "Light", on: showLighting, action: onToggleLighting },
    { label: "Grid", on: showGrid, action: onToggleGrid },
  ];

  return (
    <div className="sb-panel min-h-0 flex-[2]">
      <div className="sb-panel-header flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-landing-heading">Live preview</p>
          <p className="truncate text-[10px] text-landing-subtle">
            {previewTitle ? `${previewTitle} · ` : ""}
            {objectCount} object{objectCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {toggles.map((toggle) => (
            <button
              key={toggle.label}
              type="button"
              onClick={toggle.action}
              className={`rounded-md px-2 py-1 text-[10px] font-medium transition ${
                toggle.on
                  ? "admin-tab-active"
                  : "border border-landing text-landing-subtle hover:bg-landing-hover hover:text-landing-heading"
              }`}
            >
              {toggle.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onCenter}
            className="rounded-md border border-landing px-2 py-1 text-[10px] font-medium text-landing-subtle hover:bg-landing-hover"
          >
            Center
          </button>
        </div>
      </div>
      <div className="sb-viewport-frame">
        <FragmentPreviewViewport
          scene={scene}
          showWireframe={showWireframe}
          showBounds={showBounds}
          showLighting={showLighting}
          showGrid={showGrid}
        />
      </div>
    </div>
  );
}
