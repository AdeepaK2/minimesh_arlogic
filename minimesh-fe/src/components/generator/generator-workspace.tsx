"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { useAppModal } from "@/components/modal/use-app-modal";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { editScene, generateScene, refineEntity } from "@/lib/api/generation";
import { getProject } from "@/lib/api/projects";
import {
  createSavedScene,
  deleteSavedScene,
  listScenes,
  listSceneVersions,
  saveSceneVersion,
} from "@/lib/api/scenes";
import { exportSceneToGlb } from "@/lib/scene/export-glb";
import {
  applyEntityTransform,
  applyViewPreset,
  focusCameraOnEntity,
  getSceneEntities,
  isStaticSceneEntity,
  resetEntityTransform,
} from "@/lib/scene/entities";
import { summarizeSceneChanges } from "@/lib/scene/change-summary";
import type { ViewPreset } from "@/lib/scene/entities";
import type {
  Project,
  SavedScene,
  SceneChatMessage,
  SceneDocument,
  SceneEntityTransform,
  SceneVersion,
} from "@/lib/scene/types";
import { EntityPanel } from "./entity-panel";
import { PromptPanel } from "./prompt-panel";
import { SceneListPanel, SceneVersionsPanel } from "./scene-library";
import { StudioSidebar } from "./studio-sidebar";
import { SceneViewport } from "../scene/scene-viewport";

interface GeneratorWorkspaceProps {
  projectId: string;
}

export function GeneratorWorkspace({ projectId }: GeneratorWorkspaceProps) {
  const router = useRouter();
  const { accessToken, isLoading, signOut, user } = useAuth();
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<SceneChatMessage[]>([]);
  const [lastAppliedPrompt, setLastAppliedPrompt] = useState("");
  const [scene, setScene] = useState<SceneDocument | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [savedScenes, setSavedScenes] = useState<SavedScene[]>([]);
  const [versions, setVersions] = useState<SceneVersion[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isolatedEntityId, setIsolatedEntityId] = useState<string | null>(null);
  const [lockedEntityIds, setLockedEntityIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [unlockedStaticEntityIds, setUnlockedStaticEntityIds] = useState<
    Set<string>
  >(() => new Set());
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefiningEntity, setIsRefiningEntity] = useState(false);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [isJsonOpen, setIsJsonOpen] = useState(false);
  const { confirm, modal, prompt: promptModal } = useAppModal();

  useEffect(() => {
    if (!isLoading && !accessToken) {
      router.replace("/login");
    }
  }, [accessToken, isLoading, router]);

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
    async (sceneId: string): Promise<SceneVersion[]> => {
      if (!accessToken) {
        return [];
      }

      try {
        const loadedVersions = await listSceneVersions(
          accessToken,
          projectId,
          sceneId,
        );

        setVersions(loadedVersions);
        return loadedVersions;
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load scene versions.",
        );
        return [];
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
    return (
      <main className="grid min-h-dvh place-items-center bg-app text-primary">
        <p className="text-sm text-secondary">Redirecting to login</p>
      </main>
    );
  }

  const authenticatedToken = accessToken;

  async function handleChatSubmit() {
    const instruction = chatInput.trim();

    if (instruction.length < 3) {
      setError("Enter a message with at least 3 characters.");
      return;
    }

    const previousScene = scene;
    const userMessageId = createMessageId();
    const action = getChatAction(Boolean(previousScene), selectedEntityId);
    const targetName =
      action === "refine-entity"
        ? (selectedEntity?.name ?? "Selected entity")
        : action === "edit-scene"
          ? (previousScene?.sceneName ?? "Current scene")
          : "New scene";

    setChatMessages((current) => [
      ...current,
      createChatMessage({
        id: userMessageId,
        role: "user",
        content: instruction,
        status: "pending",
        action,
        targetName,
      }),
    ]);
    setIsGenerating(true);
    setError(null);
    setWarnings([]);
    setChatInput("");

    try {
      const result = !previousScene
        ? await generateScene(instruction, authenticatedToken)
        : selectedEntityId
          ? await refineEntity(
              previousScene,
              selectedEntityId,
              instruction,
              authenticatedToken,
            )
          : await editScene(previousScene, instruction, authenticatedToken);
      const assistantSummary = createAssistantSummary({
        hadScene: Boolean(previousScene),
        sceneName: result.scene.sceneName,
        selectedEntityName: selectedEntity?.name ?? null,
      });
      const changeSummary = summarizeSceneChanges(previousScene, result.scene);
      const versionWarnings = [
        `Assistant: ${assistantSummary}`,
        changeSummary,
        ...result.warnings,
      ].slice(0, 12);
      const saved = await autoSaveChatScene(
        result.scene,
        instruction,
        versionWarnings,
      );

      setScene(result.scene);
      setWarnings(versionWarnings);
      setLastAppliedPrompt(instruction);
      setChatMessages((current) => [
        ...current.map((message) =>
          message.id === userMessageId
            ? { ...message, status: "applied" as const }
            : message,
        ),
        createChatMessage({
          role: "assistant",
          content: `${assistantSummary}\n${changeSummary}`,
          status: "applied",
          action,
          targetName,
          versionNumber: saved.latestVersionNumber,
        }),
      ]);
    } catch (caughtError) {
      setChatInput(instruction);
      setChatMessages((current) =>
        current.map((message) =>
          message.id === userMessageId
            ? { ...message, status: "failed" as const }
            : message,
        ),
      );
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Scene chat action failed.",
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
    const savePrompt = lastAppliedPrompt || chatInput.trim();

    try {
      if (activeSceneId) {
        const saved = await saveSceneVersion(
          authenticatedToken,
          projectId,
          activeSceneId,
          {
            prompt: savePrompt,
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
        prompt: savePrompt,
        scene,
        warnings,
      });

      setActiveSceneId(saved.id);
      setSavedScenes((current) => [saved, ...current]);
      await loadVersions(saved.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Scene save failed.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function autoSaveChatScene(
    nextScene: SceneDocument,
    instruction: string,
    nextWarnings: string[],
  ): Promise<SavedScene> {
    if (activeSceneId) {
      const saved = await saveSceneVersion(
        authenticatedToken,
        projectId,
        activeSceneId,
        {
          prompt: instruction,
          scene: nextScene,
          warnings: nextWarnings,
        },
      );

      setSavedScenes((current) =>
        current.map((savedScene) =>
          savedScene.id === saved.id ? saved : savedScene,
        ),
      );
      await loadVersions(activeSceneId);
      return saved;
    }

    const saved = await createSavedScene(authenticatedToken, projectId, {
      name: nextScene.sceneName,
      description: nextScene.description,
      prompt: instruction,
      scene: nextScene,
      warnings: nextWarnings,
    });

    setActiveSceneId(saved.id);
    setSavedScenes((current) => [saved, ...current]);
    await loadVersions(saved.id);
    return saved;
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
    setChatInput("");
    setLastAppliedPrompt(savedScene.latestPrompt ?? "");
    setWarnings([]);
    setError(null);
    setActiveSceneId(savedScene.id);
    setSelectedEntityId(null);
    setIsolatedEntityId(null);
    setLockedEntityIds(new Set());
    setUnlockedStaticEntityIds(new Set());
    const loadedVersions = await loadVersions(savedScene.id);
    const latestVersion =
      loadedVersions.find(
        (version) => version.versionNumber === savedScene.latestVersionNumber,
      ) ?? loadedVersions[0];

    setChatMessages(
      latestVersion ? messagesFromVersion(latestVersion) : [],
    );
  }

  function handleLoadVersion(version: SceneVersion) {
    setScene(version.scene);
    setChatInput("");
    setLastAppliedPrompt(version.prompt ?? "");
    setWarnings(version.warnings);
    setError(null);
    setActiveSceneId(version.sceneId);
    setChatMessages(messagesFromVersion(version));
    setSelectedEntityId(null);
    setIsolatedEntityId(null);
    setLockedEntityIds(new Set());
    setUnlockedStaticEntityIds(new Set());
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
        setChatMessages([]);
        setLastAppliedPrompt("");
        setSelectedEntityId(null);
        setIsolatedEntityId(null);
        setLockedEntityIds(new Set());
        setUnlockedStaticEntityIds(new Set());
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

  function handleTransformEntity(transform: SceneEntityTransform) {
    if (!scene || !selectedEntityId) {
      return;
    }

    if (isSelectedTransformLocked()) {
      return;
    }

    setScene(applyEntityTransform(scene, selectedEntityId, transform));
  }

  function handleResetEntityTransform() {
    if (!scene || !selectedEntityId) {
      return;
    }

    setScene(resetEntityTransform(scene, selectedEntityId));
  }

  function handleFocusEntity() {
    if (!scene || !selectedEntityId) {
      return;
    }

    setScene(focusCameraOnEntity(scene, selectedEntityId));
  }

  function handleToggleIsolate() {
    if (!selectedEntityId) {
      return;
    }

    setIsolatedEntityId((current) =>
      current === selectedEntityId ? null : selectedEntityId,
    );
  }

  function handleSelectEntity(entityId: string | null) {
    setSelectedEntityId(entityId);

    if (!entityId || (isolatedEntityId && isolatedEntityId !== entityId)) {
      setIsolatedEntityId(null);
    }
  }

  function handleToggleTransformLock() {
    if (!selectedEntityId) {
      return;
    }

    const entityId = selectedEntityId;
    const isLocked = isSelectedTransformLocked();

    if (isLocked) {
      setLockedEntityIds((current) => {
        const next = new Set(current);
        next.delete(entityId);
        return next;
      });
      setUnlockedStaticEntityIds((current) => {
        const next = new Set(current);
        next.add(entityId);
        return next;
      });
      return;
    }

    setLockedEntityIds((current) => {
      const next = new Set(current);
      next.add(entityId);
      return next;
    });
    setUnlockedStaticEntityIds((current) => {
      const next = new Set(current);
      next.delete(entityId);
      return next;
    });
  }

  function handleViewPreset(preset: ViewPreset) {
    if (!scene) {
      return;
    }

    setScene(applyViewPreset(scene, preset, selectedEntityId));
  }

  async function handleRefineEntity(instruction: string) {
    if (!scene || !selectedEntityId) {
      setError("Select an entity before refining.");
      return;
    }

    setIsRefiningEntity(true);
    setError(null);

    try {
      const result = await refineEntity(
        scene,
        selectedEntityId,
        instruction,
        authenticatedToken,
      );
      setScene(result.scene);
      setWarnings(result.warnings);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Entity refinement failed.",
      );
    } finally {
      setIsRefiningEntity(false);
    }
  }

  const sceneEntities = scene ? getSceneEntities(scene) : [];
  const selectedEntity =
    sceneEntities.find((entity) => entity.id === selectedEntityId) ?? null;
  const selectedEntityIsStatic =
    scene && selectedEntity
      ? isStaticSceneEntity(scene, selectedEntity)
      : false;
  const selectedTransformLocked =
    selectedEntity !== null &&
    (lockedEntityIds.has(selectedEntity.id) ||
      (selectedEntityIsStatic &&
        !unlockedStaticEntityIds.has(selectedEntity.id)));
  const isBusy =
    isGenerating ||
    isExporting ||
    isSaving ||
    isLibraryLoading ||
    isRefiningEntity;

  function isSelectedTransformLocked() {
    if (!scene || !selectedEntity) {
      return false;
    }

    return selectedTransformLocked;
  }

  return (
    <main className="flex h-dvh overflow-hidden bg-app text-primary max-lg:flex-col">
      <StudioSidebar
        userEmail={user?.email}
        onSignOut={() => void signOut()}
        agent={
          <PromptPanel
            embedded
            canExport={Boolean(scene)}
            canSave={Boolean(scene)}
            canSaveVersion={Boolean(activeSceneId)}
            chatInput={chatInput}
            error={error}
            isBusy={isBusy}
            messages={chatMessages}
            projectName={project?.name ?? null}
            sceneName={scene?.sceneName ?? null}
            selectedEntityName={selectedEntity?.name ?? null}
            selectedEntityPartCount={selectedEntity?.objectIds.length ?? 0}
            userEmail={user?.email}
            warnings={warnings}
            onSave={handleSave}
            onExport={handleExport}
            onSignOut={() => void signOut()}
            onChatInputChange={setChatInput}
            onSubmit={handleChatSubmit}
          />
        }
        library={
          <SceneListPanel
            activeSceneId={activeSceneId}
            isBusy={isBusy}
            scenes={savedScenes}
            onDeleteScene={handleDeleteScene}
            onLoadScene={(savedScene) => void handleLoadScene(savedScene)}
            onRefresh={() => void loadSavedScenes()}
          />
        }
        versions={
          <SceneVersionsPanel
            activeSceneId={activeSceneId}
            versions={versions}
            onLoadVersion={handleLoadVersion}
          />
        }
        entities={
          <EntityPanel
            embedded
            entities={sceneEntities}
            isBusy={isBusy}
            isIsolating={Boolean(
              selectedEntityId && isolatedEntityId === selectedEntityId,
            )}
            isTransformLocked={selectedTransformLocked}
            selectedEntity={selectedEntity}
            onFocus={handleFocusEntity}
            onRefine={handleRefineEntity}
            onResetTransform={handleResetEntityTransform}
            onSelectEntity={(entityId) => handleSelectEntity(entityId)}
            onToggleTransformLock={handleToggleTransformLock}
            onToggleIsolate={handleToggleIsolate}
            onTransformChange={handleTransformEntity}
          />
        }
      />

      <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-ui bg-panel px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              {project?.name ?? "Project Studio"}
            </p>
            <h2 className="mt-1 text-base font-semibold text-primary">
              {scene?.sceneName ??
                (isGenerating ? "Generating scene" : "No scene yet")}
            </h2>
            {scene?.description ? (
              <p className="mt-1 line-clamp-2 max-w-3xl text-xs leading-5 text-secondary">
                {scene.description}
              </p>
            ) : !isGenerating ? (
              <p className="mt-1 max-w-3xl text-xs leading-5 text-secondary">
                The assistant chat is ready.
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Link
              className="border border-ui px-3 py-2 text-xs font-semibold text-secondary transition hover:border-accent hover:text-primary"
              href="/dashboard"
            >
              Projects
            </Link>
            <div className="border border-ui px-3 py-2 text-xs font-medium text-secondary">
              {activeSceneId ? "Saved" : "Draft"} / {scene?.objects.length ?? 0}{" "}
              objects
              {scene ? ` / ${sceneEntities.length} entities` : ""}
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="min-h-0 flex-1 p-3">
          {scene ? (
            <SceneViewport
              isolatedEntityId={isolatedEntityId}
              scene={scene}
              selectedEntityId={selectedEntityId}
              selectedEntityName={selectedEntity?.name ?? null}
              onClearSelection={() => handleSelectEntity(null)}
              onFocusSelected={handleFocusEntity}
              onSelectEntity={(entityId) => {
                handleSelectEntity(entityId);
              }}
              onToggleIsolate={handleToggleIsolate}
              onViewPreset={handleViewPreset}
            />
          ) : (
            <div className="grid h-full min-h-0 place-items-center border border-ui bg-panel">
              <p className="max-w-sm px-6 text-center text-sm leading-6 text-secondary">
                {isGenerating
                  ? "Generating a fresh scene..."
                  : "No generated scene is loaded yet."}
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-ui bg-panel">
          <button
            className="flex w-full items-center justify-between px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted transition hover:text-primary"
            type="button"
            onClick={() => setIsJsonOpen((current) => !current)}
          >
            <span>Scene JSON</span>
            <span className="normal-case tracking-normal text-secondary">
              {isJsonOpen ? "Hide" : "Show"}
            </span>
          </button>
          {isJsonOpen ? (
            <pre className="max-h-44 overflow-auto border-t border-ui px-4 py-3 text-xs leading-5 text-secondary">
              {scene ? JSON.stringify(scene, null, 2) : "{}"}
            </pre>
          ) : null}
        </div>
      </section>

      {modal}
    </main>
  );
}

function messagesFromVersion(version: SceneVersion): SceneChatMessage[] {
  const action = version.scene.entities?.length
    ? "edit-scene"
    : "generate";
  const targetName = version.scene.sceneName;
  const messages: SceneChatMessage[] = [];

  if (version.prompt) {
    messages.push(
      createChatMessage({
        role: "user",
        content: version.prompt,
        status: "applied",
        action,
        targetName,
        versionNumber: version.versionNumber,
        createdAt: version.createdAt,
      }),
    );
  }

  if (version.warnings.length > 0) {
    messages.push(
      createChatMessage({
        role: "assistant",
        content: version.warnings
          .map((warning) => warning.replace(/^Assistant:\s*/i, ""))
          .join("\n"),
        status: "applied",
        action,
        targetName,
        versionNumber: version.versionNumber,
        createdAt: version.createdAt,
      }),
    );
  }

  return messages;
}

function createAssistantSummary({
  hadScene,
  sceneName,
  selectedEntityName,
}: {
  hadScene: boolean;
  sceneName: string;
  selectedEntityName: string | null;
}): string {
  if (!hadScene) {
    return `Created ${sceneName}.`;
  }

  if (selectedEntityName) {
    return `Updated ${selectedEntityName}.`;
  }

  return `Updated ${sceneName}.`;
}

function createChatMessage({
  id,
  role,
  content,
  status,
  action,
  targetName,
  versionNumber,
  createdAt,
}: {
  id?: string;
  role: SceneChatMessage["role"];
  content: string;
  status: SceneChatMessage["status"];
  action?: SceneChatMessage["action"];
  targetName?: string;
  versionNumber?: number;
  createdAt?: string;
}): SceneChatMessage {
  return {
    id: id ?? createMessageId(),
    role,
    content,
    status,
    action,
    targetName,
    versionNumber,
    createdAt: createdAt ?? new Date().toISOString(),
  };
}

function getChatAction(
  hasScene: boolean,
  selectedEntityId: string | null,
): NonNullable<SceneChatMessage["action"]> {
  if (!hasScene) {
    return "generate";
  }

  return selectedEntityId ? "refine-entity" : "edit-scene";
}

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
