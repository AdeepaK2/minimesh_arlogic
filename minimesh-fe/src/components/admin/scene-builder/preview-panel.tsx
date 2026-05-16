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
    { label: "Wireframe", on: showWireframe, action: onToggleWireframe },
    { label: "Bounds", on: showBounds, action: onToggleBounds },
    { label: "Lighting", on: showLighting, action: onToggleLighting },
    { label: "Grid", on: showGrid, action: onToggleGrid },
  ];

  return (
    <div className="admin-panel flex h-full min-h-0 flex-col border-cyan-500/15">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-landing px-4 py-3">
        <div>
          <p className="minimesh-eyebrow">Live 3D preview</p>
          <p className="text-xs text-landing-subtle">
            {previewTitle ? (
              <>
                <span className="text-landing-muted">{previewTitle}</span>
                {" · "}
              </>
            ) : null}
            {objectCount} object{objectCount === 1 ? "" : "s"} · React Three Fiber
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {toggles.map((toggle) => (
            <button
              key={toggle.label}
              type="button"
              onClick={toggle.action}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                toggle.on
                  ? "admin-tab-active border-0 px-2.5 py-1"
                  : "admin-segment-btn border border-white/10 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {toggle.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onCenter}
            className="admin-segment-btn rounded-lg border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-zinc-400"
          >
            Center
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
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
