"use client";

import type { SavedScene, SceneVersion } from "@/lib/scene/types";

interface SceneLibraryProps {
  activeSceneId: string | null;
  isBusy: boolean;
  scenes: SavedScene[];
  versions: SceneVersion[];
  onDeleteScene: (sceneId: string) => void;
  onLoadScene: (scene: SavedScene) => void;
  onLoadVersion: (version: SceneVersion) => void;
  onRefresh: () => void;
}

export function SceneLibrary({
  activeSceneId,
  isBusy,
  scenes,
  versions,
  onDeleteScene,
  onLoadScene,
  onLoadVersion,
  onRefresh,
}: SceneLibraryProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col border-t border-ui bg-panel">
      <div className="flex items-center justify-between gap-3 border-b border-ui px-4 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Library
          </p>
          <h2 className="mt-1 text-base font-semibold text-primary">
            Saved scenes
          </h2>
        </div>
        <button
          className="border border-ui px-3 py-2 text-xs font-semibold text-secondary transition hover:border-accent hover:text-primary"
          type="button"
          onClick={onRefresh}
          disabled={isBusy}
        >
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {scenes.length === 0 ? (
          <p className="px-2 py-8 text-sm leading-6 text-secondary">
            Saved scenes will appear here after you click Save.
          </p>
        ) : (
          <div className="grid gap-2">
            {scenes.map((scene) => (
              <div
                key={scene.id}
                className={`border p-3 transition ${
                  activeSceneId === scene.id
                    ? "border-accent bg-accent-soft"
                    : "border-ui bg-field"
                }`}
              >
                <button
                  className="block w-full text-left"
                  type="button"
                  onClick={() => onLoadScene(scene)}
                >
                  <span className="block text-sm font-semibold text-primary">
                    {scene.name}
                  </span>
                  <span className="mt-1 block text-xs text-secondary">
                    Version {scene.latestVersionNumber}
                  </span>
                </button>
                <button
                  className="mt-3 text-xs font-semibold text-danger transition hover:opacity-80"
                  type="button"
                  onClick={() => onDeleteScene(scene.id)}
                  disabled={isBusy}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="max-h-60 border-t border-ui p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Versions
        </p>
        {activeSceneId && versions.length > 0 ? (
          <div className="mt-3 grid max-h-44 gap-2 overflow-y-auto">
            {versions.map((version) => (
              <button
                key={version.id}
                className="border border-ui bg-field px-3 py-2 text-left text-xs transition hover:border-accent"
                type="button"
                onClick={() => onLoadVersion(version)}
              >
                <span className="font-semibold text-primary">
                  Version {version.versionNumber}
                </span>
                <span className="mt-1 block text-secondary">
                  {new Date(version.createdAt).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-secondary">
            Load a saved scene to inspect versions.
          </p>
        )}
      </div>
    </section>
  );
}
