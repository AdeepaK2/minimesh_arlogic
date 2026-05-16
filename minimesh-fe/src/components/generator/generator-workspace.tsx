"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthScreen } from "@/components/auth/auth-screen";
import { useAuth } from "@/components/auth/auth-provider";
import { useAppModal } from "@/components/modal/use-app-modal";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { generateScene } from "@/lib/api/generation";
import { getProject } from "@/lib/api/projects";
import {
  createSavedScene,
  deleteSavedScene,
  listScenes,
  listSceneVersions,
  saveSceneVersion,
} from "@/lib/api/scenes";
import { exportSceneToGlb } from "@/lib/scene/export-glb";
import type {
  Project,
  SavedScene,
  SceneDocument,
  SceneVersion,
} from "@/lib/scene/types";
import { SceneLibrary } from "./scene-library";
import { SceneViewport } from "../scene/scene-viewport";
import { PromptPanel } from "./prompt-panel";

interface GeneratorWorkspaceProps {
  projectId: string;
}

export function GeneratorWorkspace({ projectId }: GeneratorWorkspaceProps) {
  const { accessToken, isLoading, signOut, user } = useAuth();
  const [prompt, setPrompt] = useState(
    "A tiny sci-fi rover with glowing wheels on a circular platform",
  );
  const [scene, setScene] = useState<SceneDocument | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [savedScenes, setSavedScenes] = useState<SavedScene[]>([]);
  const [versions, setVersions] = useState<SceneVersion[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const { confirm, modal, prompt: promptModal } = useAppModal();

  const loadSavedScenes = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setIsLibraryLoading(true);

    try {
      setSavedScenes(await listScenes(accessToken, projectId));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load saved scenes.",
      );
    } finally {
      setIsLibraryLoading(false);
    }
  }, [accessToken, projectId]);

  const loadVersions = useCallback(
    async (sceneId: string) => {
      if (!accessToken) {
        return;
      }

      try {
        setVersions(await listSceneVersions(accessToken, projectId, sceneId));
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load scene versions.",
        );
      }
    },
    [accessToken, projectId],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSavedScenes();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadSavedScenes]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const timeout = window.setTimeout(() => {
      getProject(accessToken, projectId)
        .then(setProject)
        .catch((caughtError: unknown) => {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load project.",
          );
        });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [accessToken, projectId]);

  if (isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-app text-primary">
        <p className="text-sm text-secondary">Loading MiniMesh</p>
      </main>
    );
  }

  if (!accessToken) {
    return <AuthScreen />;
  }

  const authenticatedToken = accessToken;

  async function handleGenerate() {
    const trimmedPrompt = prompt.trim();

    if (trimmedPrompt.length < 3) {
      setError("Enter a prompt with at least 3 characters.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setWarnings([]);
    setScene(null);
    setActiveSceneId(null);
    setVersions([]);

    try {
      const result = await generateScene(trimmedPrompt, authenticatedToken);
      setScene(result.scene);
      setWarnings(result.warnings);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Scene generation failed.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    if (!scene) {
      setError("Generate or load a scene before saving.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (activeSceneId) {
        const saved = await saveSceneVersion(
          authenticatedToken,
          projectId,
          activeSceneId,
          {
            prompt,
            scene,
            warnings,
          },
        );

        setSavedScenes((current) =>
          current.map((savedScene) =>
            savedScene.id === saved.id ? saved : savedScene,
          ),
        );
        await loadVersions(activeSceneId);
        return;
      }

      const sceneName = await promptModal({
        title: "Save scene",
        description: "Name this scene before adding it to the current project.",
        label: "Scene name",
        defaultValue: scene.sceneName,
        confirmLabel: "Save",
      });

      if (!sceneName?.trim()) {
        return;
      }

      const saved = await createSavedScene(authenticatedToken, projectId, {
        name: sceneName.trim(),
        description: scene.description,
        prompt,
        scene,
        warnings,
      });

      setActiveSceneId(saved.id);
      setSavedScenes((current) => [saved, ...current]);
      await loadVersions(saved.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Scene save failed.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExport() {
    if (!scene) {
      setError("Generate or load a scene before exporting.");
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      await exportSceneToGlb(scene);
    } catch {
      setError("GLB export failed in this browser session.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleLoadScene(savedScene: SavedScene) {
    setScene(savedScene.latestScene);
    setPrompt(savedScene.latestPrompt ?? "");
    setWarnings([]);
    setError(null);
    setActiveSceneId(savedScene.id);
    await loadVersions(savedScene.id);
  }

  function handleLoadVersion(version: SceneVersion) {
    setScene(version.scene);
    setPrompt(version.prompt ?? "");
    setWarnings(version.warnings);
    setError(null);
    setActiveSceneId(version.sceneId);
  }

  async function handleDeleteScene(sceneId: string) {
    const confirmed = await confirm({
      title: "Delete scene",
      description: "This will delete the saved scene and all of its versions.",
      confirmLabel: "Delete",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setIsLibraryLoading(true);

    try {
      await deleteSavedScene(authenticatedToken, projectId, sceneId);
      setSavedScenes((current) =>
        current.filter((savedScene) => savedScene.id !== sceneId),
      );

      if (activeSceneId === sceneId) {
        setActiveSceneId(null);
        setVersions([]);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Scene delete failed.",
      );
    } finally {
      setIsLibraryLoading(false);
    }
  }

  const isBusy = isGenerating || isExporting || isSaving || isLibraryLoading;

  return (
    <main className="flex min-h-dvh bg-app text-primary max-lg:flex-col">
      <aside className="flex w-[380px] min-w-[320px] max-w-[560px] resize-x flex-col overflow-auto border-r border-ui bg-panel max-lg:w-full max-lg:max-w-none max-lg:resize-none max-lg:border-b max-lg:border-r-0">
        <PromptPanel
          canExport={Boolean(scene)}
          canSave={Boolean(scene)}
          canSaveVersion={Boolean(activeSceneId)}
          error={error}
          isGenerating={isBusy}
          prompt={prompt}
          userEmail={user?.email}
          warnings={warnings}
          onSave={handleSave}
          onExport={handleExport}
          onSignOut={() => void signOut()}
          onPromptChange={setPrompt}
          onSubmit={handleGenerate}
        />

        <SceneLibrary
          activeSceneId={activeSceneId}
          isBusy={isBusy}
          scenes={savedScenes}
          versions={versions}
          onDeleteScene={handleDeleteScene}
          onLoadScene={(savedScene) => void handleLoadScene(savedScene)}
          onLoadVersion={handleLoadVersion}
          onRefresh={() => void loadSavedScenes()}
        />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ui bg-panel px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              {project?.name ?? "Project Studio"}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-primary">
              {scene?.sceneName ??
                (isGenerating ? "Generating scene" : "No scene yet")}
            </h2>
            {scene?.description ? (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-secondary">
                {scene.description}
              </p>
            ) : !isGenerating ? (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-secondary">
                Write a prompt on the left and generate your first 3D scene.
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Link
              className="border border-ui px-3 py-2 text-xs font-semibold text-secondary transition hover:border-accent hover:text-primary"
              href="/"
            >
              Projects
            </Link>
            <div className="border border-ui px-3 py-2 text-xs font-medium text-secondary">
              {activeSceneId ? "Saved" : "Draft"} / {scene?.objects.length ?? 0} objects
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="min-h-0 flex-1 p-4">
          {scene ? (
            <SceneViewport scene={scene} />
          ) : (
            <div className="grid h-full min-h-[420px] place-items-center border border-ui bg-panel">
              <p className="max-w-sm px-6 text-center text-sm leading-6 text-secondary">
                {isGenerating
                  ? "Generating a fresh scene..."
                  : "No generated scene is loaded yet."}
              </p>
            </div>
          )}
        </div>

        <div className="grid max-h-52 border-t border-ui bg-panel lg:grid-cols-[260px_1fr]">
          <div className="border-b border-ui px-5 py-4 lg:border-b-0 lg:border-r">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Scene JSON
            </p>
            <p className="mt-2 text-sm leading-6 text-secondary">
              Validated source document
            </p>
          </div>
          <pre className="overflow-auto px-5 py-4 text-xs leading-5 text-secondary">
            {scene ? JSON.stringify(scene, null, 2) : "{}"}
          </pre>
        </div>
      </section>

      {modal}
    </main>
  );
}
