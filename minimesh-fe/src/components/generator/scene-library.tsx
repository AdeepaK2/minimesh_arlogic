"use client";

import type { SavedScene, SceneVersion } from "@/lib/scene/types";

interface SceneListPanelProps {
  activeSceneId: string | null;
  isBusy: boolean;
  scenes: SavedScene[];
  onDeleteScene: (sceneId: string) => void;
  onLoadScene: (scene: SavedScene) => void;
  onRefresh: () => void;
}

interface SceneVersionsPanelProps {
  activeSceneId: string | null;
  versions: SceneVersion[];
  onLoadVersion: (version: SceneVersion) => void;
}

export function SceneListPanel({
  activeSceneId,
  isBusy,
  scenes,
  onDeleteScene,
  onLoadScene,
  onRefresh,
}: SceneListPanelProps) {
  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-end border-b border-ui px-3 py-2">
        <button
          className="rounded-md border border-ui px-2.5 py-1 text-xs font-medium text-secondary transition hover:border-accent hover:text-primary disabled:opacity-50"
          type="button"
          onClick={onRefresh}
          disabled={isBusy}
        >
          Refresh
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {scenes.length === 0 ? (
          <p className="px-2 py-8 text-sm leading-6 text-secondary">
            Saved scenes appear here after you generate or save from the agent
            panel.
          </p>
        ) : (
          <div className="grid gap-2">
            {scenes.map((scene) => (
              <div
                key={scene.id}
                className={`rounded-lg border p-3 transition ${
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
                  className="mt-3 text-xs font-medium text-danger transition hover:opacity-80 disabled:opacity-50"
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
    </section>
  );
}

export function SceneVersionsPanel({
  activeSceneId,
  versions,
  onLoadVersion,
}: SceneVersionsPanelProps) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-y-auto p-3">
      {!activeSceneId ? (
        <p className="px-2 py-8 text-sm leading-6 text-secondary">
          Load a saved scene from the Scenes panel to browse its version history.
        </p>
      ) : versions.length === 0 ? (
        <p className="px-2 py-8 text-sm leading-6 text-secondary">
          No versions yet. Apply a change in the agent panel to create one.
        </p>
      ) : (
        <div className="grid gap-2">
          {versions.map((version) => (
            <button
              key={version.id}
              className="rounded-lg border border-ui bg-field px-3 py-2.5 text-left transition hover:border-accent"
              type="button"
              onClick={() => onLoadVersion(version)}
            >
              <span className="text-sm font-semibold text-primary">
                Version {version.versionNumber}
              </span>
              <span className="mt-1 block text-xs text-secondary">
                {new Date(version.createdAt).toLocaleString()}
              </span>
              {version.prompt ? (
                <span className="mt-2 line-clamp-3 block text-xs leading-5 text-secondary">
                  {version.prompt}
                </span>
              ) : null}
              {version.warnings[0] ? (
                <span className="mt-1 line-clamp-2 block text-xs text-muted">
                  {version.warnings[0].replace(/^Assistant:\s*/i, "")}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
