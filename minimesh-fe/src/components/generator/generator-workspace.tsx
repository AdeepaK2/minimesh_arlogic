"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { useAppModal } from "@/components/modal/use-app-modal";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  clarifyGenerationPrompt,
  createGenerationJob,
  getGenerationJob,
} from "@/lib/api/generation";
import { getProject } from "@/lib/api/projects";
import {
  createSavedScene,
  deleteSavedScene,
  listScenes,
  listSceneVersions,
  saveSceneVersion,
} from "@/lib/api/scenes";
import { approveReference } from "@/lib/api/templates";
import { exportSceneToGlb } from "@/lib/scene/export-glb";
import { importGlbToScene } from "@/lib/scene/import-glb";
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
  GenerationChatContext,
  GenerationClarificationOption,
  GenerationJobAction,
  GenerationJobResponse,
  GenerationJobStep,
  GenerationUsage,
  Project,
  SavedScene,
  SceneChatMessage,
  SceneDocument,
  SceneEntity,
  SceneEntityTransform,
  SceneFragment,
  SceneLight,
  SceneMemoryMetadata,
  SceneVersion,
} from "@/lib/scene/types";
import { EntityPanel } from "./entity-panel";
import { PromptPanel } from "./prompt-panel";
import { SceneListPanel, SceneVersionsPanel } from "./scene-library";
import { StudioSidebar, type StudioSidebarView } from "./studio-sidebar";
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
  const [contextSummary, setContextSummary] = useState<string | null>(null);
  const [contextUpdatedAt, setContextUpdatedAt] = useState<string | null>(null);
  const [contextUsage, setContextUsage] = useState<GenerationUsage | null>(
    null,
  );
  const [generationJobSteps, setGenerationJobSteps] = useState<
    GenerationJobStep[]
  >([]);
  const [scene, setScene] = useState<SceneDocument | null>(null);
  const [pendingSceneName, setPendingSceneName] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [savedScenes, setSavedScenes] = useState<SavedScene[]>([]);
  const [versions, setVersions] = useState<SceneVersion[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(
    () => new Set(),
  );
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
  const [jsonDraft, setJsonDraft] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isImportingGlb, setIsImportingGlb] = useState(false);
  const glbInputRef = useRef<HTMLInputElement>(null);
  const [sidebarView, setSidebarView] = useState<StudioSidebarView>("agent");
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

  async function runSceneJob(
    payload:
      | {
          action: Extract<GenerationJobAction, "generate">;
          prompt: string;
          chatContext?: GenerationChatContext;
        }
      | {
          action: Extract<GenerationJobAction, "edit-scene">;
          scene: SceneDocument;
          instruction: string;
          chatContext?: GenerationChatContext;
        }
      | {
          action: Extract<GenerationJobAction, "refine-entity">;
          scene: SceneDocument;
          entityId: string;
          instruction: string;
          chatContext?: GenerationChatContext;
        },
  ): Promise<GenerationJobResponse> {
    const startedJob = await createGenerationJob(payload, authenticatedToken);
    setGenerationJobSteps(startedJob.steps);

    let currentJob = startedJob;

    while (
      currentJob.status === "queued" ||
      currentJob.status === "running"
    ) {
      await wait(1000);
      currentJob = await getGenerationJob(currentJob.jobId, authenticatedToken);
      setGenerationJobSteps(currentJob.steps);
    }

    if (currentJob.status === "failed" || !currentJob.result) {
      throw new Error(currentJob.error ?? "Scene generation job failed.");
    }

    return currentJob;
  }

  async function handleChatSubmit() {
    const instruction = chatInput.trim();

    if (instruction.length < 3) {
      setError("Enter a message with at least 3 characters.");
      return;
    }

    const previousScene = scene;
    const userMessageId = createMessageId();
    const action = getChatAction(
      Boolean(previousScene),
      selectedEntityIds.size,
      instruction,
    );
    const targetName =
      action === "refine-entity" ||
      (action === "edit-scene" && selectedEntityIds.size > 0)
        ? selectedEntityLabel
        : action === "edit-scene"
          ? (previousScene?.sceneName ?? "Current scene")
          : (pendingSceneName ?? "New scene");

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
    const chatContext = buildChatContext({
      messages: chatMessages,
      compactSummary: contextSummary,
      sceneName: previousScene?.sceneName ?? pendingSceneName,
      selectedEntityName:
        selectedEntityIds.size > 0 ? selectedEntityLabel : null,
    });
    setIsGenerating(true);
    setError(null);
    setWarnings([]);
    setChatInput("");

    try {
      let resolvedInstruction = instruction;

      if (!previousScene) {
        const clarification = await clarifyGenerationPrompt(
          instruction,
          authenticatedToken,
          chatContext,
        );

        if (clarification.status === "needs_clarification") {
          setChatMessages((current) => [
            ...current.map((message) =>
              message.id === userMessageId
                ? { ...message, status: "applied" as const }
                : message,
            ),
            createChatMessage({
              role: "assistant",
              content: clarification.question,
              status: "pending",
              action: "clarify",
              targetName: "New scene",
              clarificationOptions: clarification.options,
            }),
          ]);
          return;
        }

        resolvedInstruction = clarification.resolvedPrompt;
      }

      const job = !previousScene
        ? await runSceneJob({
            action: "generate",
            prompt: resolvedInstruction,
            chatContext,
          })
        : action === "refine-entity" && selectedEntityId
          ? await runSceneJob({
              action: "refine-entity",
              scene: previousScene,
              entityId: selectedEntityId,
              instruction: resolvedInstruction,
              chatContext,
            })
          : await runSceneJob({
              action: "edit-scene",
              scene: previousScene,
              instruction: resolvedInstruction,
              chatContext,
            });
      const result = job.result;
      if (!result) {
        throw new Error("Scene generation job did not return a result.");
      }
      const nextScene =
        !previousScene && pendingSceneName
          ? { ...result.scene, sceneName: pendingSceneName }
          : result.scene;
      const assistantSummary = createAssistantSummary({
        hadScene: Boolean(previousScene),
        sceneName: nextScene.sceneName,
        selectedEntityName:
          selectedEntityIds.size > 0 ? selectedEntityLabel : null,
      });
      const changeSummary = summarizeSceneChanges(previousScene, nextScene);
      const versionWarnings = [
        `Assistant: ${assistantSummary}`,
        changeSummary,
        ...result.warnings,
      ].slice(0, 12);
      const saved = await autoSaveChatScene(
        nextScene,
        resolvedInstruction,
        versionWarnings,
        result.usage,
      );

      applyScenePreview(nextScene);
      setSelectedEntityIds((current) => {
        const entityIds = new Set((nextScene.entities ?? []).map((e) => e.id));

        return new Set([...current].filter((id) => entityIds.has(id)));
      });
      setWarnings(versionWarnings);
      setLastAppliedPrompt(instruction);
      applyUsageState(result.usage);
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

  async function handleClarificationSelect(
    option: GenerationClarificationOption,
  ) {
    if (isGenerating) {
      return;
    }

    setChatMessages((current) =>
      current.map((message) =>
        message.action === "clarify" && message.status === "pending"
          ? { ...message, status: "applied" as const }
          : message,
      ),
    );

    if (option.id === "manual-clarification") {
      setChatInput(option.resolvedPrompt);
      return;
    }

    const userMessageId = createMessageId();
    const previousScene = scene;
    const action: NonNullable<SceneChatMessage["action"]> = previousScene
      ? "edit-scene"
      : "generate";
    const targetName = previousScene?.sceneName ?? pendingSceneName ?? "New scene";
    const chatContext = buildChatContext({
      messages: chatMessages,
      compactSummary: contextSummary,
      sceneName: previousScene?.sceneName ?? pendingSceneName,
      selectedEntityName: null,
    });

    setChatMessages((current) => [
      ...current,
      createChatMessage({
        id: userMessageId,
        role: "user",
        content: option.label,
        status: "pending",
        action,
        targetName,
      }),
    ]);
    setIsGenerating(true);
    setError(null);
    setWarnings([]);

    try {
      const job = previousScene
        ? await runSceneJob({
            action: "edit-scene",
            scene: previousScene,
            instruction: option.resolvedPrompt,
            chatContext,
          })
        : await runSceneJob({
            action: "generate",
            prompt: option.resolvedPrompt,
            chatContext,
          });
      const result = job.result;
      if (!result) {
        throw new Error("Scene generation job did not return a result.");
      }
      const nextScene =
        !previousScene && pendingSceneName
          ? { ...result.scene, sceneName: pendingSceneName }
          : result.scene;
      const assistantSummary = createAssistantSummary({
        hadScene: Boolean(previousScene),
        sceneName: nextScene.sceneName,
        selectedEntityName: null,
      });
      const changeSummary = summarizeSceneChanges(previousScene, nextScene);
      const versionWarnings = [
        `Assistant: ${assistantSummary}`,
        changeSummary,
        ...result.warnings,
      ].slice(0, 12);
      const saved = await autoSaveChatScene(
        nextScene,
        option.resolvedPrompt,
        versionWarnings,
        result.usage,
      );

      applyScenePreview(nextScene);
      setSelectedEntityIds(new Set());
      setWarnings(versionWarnings);
      setLastAppliedPrompt(option.resolvedPrompt);
      applyUsageState(result.usage);
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
            usage: contextUsage ?? undefined,
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
        usage: contextUsage ?? undefined,
      });

      setActiveSceneId(saved.id);
      setPendingSceneName(null);
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

  async function handleStartNewScene() {
    if (isBusy) {
      return;
    }

    const sceneName = await promptModal({
      title: "New scene",
      description:
        "Name the scene first, then use the agent chat to generate it.",
      label: "Scene name",
      defaultValue: "Untitled Scene",
      confirmLabel: "Start scene",
    });

    if (!sceneName?.trim()) {
      return;
    }

    resetChatState();
    applyScenePreview(null);
    setPendingSceneName(sceneName.trim());
    setActiveSceneId(null);
    setLastAppliedPrompt("");
    setVersions([]);
    setSelectedEntityIds(new Set());
    setIsolatedEntityId(null);
    setLockedEntityIds(new Set());
    setUnlockedStaticEntityIds(new Set());
    setSidebarView("agent");
  }

  async function handleApproveSceneReference() {
    if (!scene) {
      setError("Generate or load a scene before approving it.");
      return;
    }

    const referenceName = await promptModal({
      title: "Approve scene for RAG",
      description:
        "This scene will become a global MiniMesh reference for future generation prompts.",
      label: "Reference name",
      defaultValue: scene.sceneName,
      confirmLabel: "Approve",
    });

    if (!referenceName?.trim()) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const approved = await approveReference(authenticatedToken, {
        referenceType: "scene",
        name: referenceName.trim(),
        category: "scene",
        description:
          scene.description ?? `Approved full scene reference for ${scene.sceneName}.`,
        tags: deriveSceneTags(scene),
        scene,
        sourceSceneId: activeSceneId ?? undefined,
      });

      setWarnings((current) =>
        [
          `Approved "${approved.name}" as a global RAG scene reference.`,
          ...current,
        ].slice(0, 12),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Scene approval failed.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleApproveSelectedReference() {
    if (!scene || selectedEntities.length === 0) {
      setError("Select at least one entity before approving a model.");
      return;
    }

    const defaultName =
      selectedEntities.length === 1
        ? selectedEntities[0].name
        : `${selectedEntities.length} selected models`;
    const referenceName = await promptModal({
      title: "Approve selected model for RAG",
      description:
        "The selected entity parts will become a global MiniMesh model reference.",
      label: "Reference name",
      defaultValue: defaultName,
      confirmLabel: "Approve",
    });

    if (!referenceName?.trim()) {
      return;
    }

    const fragment = fragmentFromSelectedEntities(scene, selectedEntities);

    if (fragment.objects.length === 0) {
      setError("Selected entities do not contain approvable scene objects.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const approved = await approveReference(authenticatedToken, {
        referenceType: "fragment",
        name: referenceName.trim(),
        category: selectedEntities[0].tags[0] ?? "model",
        description:
          selectedEntities.length === 1
            ? (selectedEntities[0].description ??
              `Approved reusable model from ${selectedEntities[0].name}.`)
            : `Approved reusable model made from ${selectedEntities.length} selected entities.`,
        tags: uniqueTags(selectedEntities.flatMap((entity) => entity.tags)),
        fragment,
        sourceSceneId: activeSceneId ?? undefined,
      });

      setWarnings((current) =>
        [
          `Approved "${approved.name}" as a global RAG model reference.`,
          ...current,
        ].slice(0, 12),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Selected model approval failed.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleStartNewChat() {
    if (isBusy) {
      return;
    }

    resetChatState();
    setSidebarView("agent");
  }

  async function autoSaveChatScene(
    nextScene: SceneDocument,
    instruction: string,
    nextWarnings: string[],
    usage?: GenerationUsage,
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
          usage,
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
      name: pendingSceneName ?? nextScene.sceneName,
      description: nextScene.description,
      prompt: instruction,
      scene: nextScene,
      warnings: nextWarnings,
      usage,
    });

    setActiveSceneId(saved.id);
    setPendingSceneName(null);
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
    applyScenePreview(savedScene.latestScene);
    setPendingSceneName(null);
    setChatInput("");
    setLastAppliedPrompt(savedScene.latestPrompt ?? "");
    applyMemoryState(savedScene.memory);
    setWarnings([]);
    setError(null);
    setActiveSceneId(savedScene.id);
    setSelectedEntityIds(new Set());
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
    applyScenePreview(version.scene);
    setPendingSceneName(null);
    setChatInput("");
    setLastAppliedPrompt(version.prompt ?? "");
    applyMemoryState(version.memory);
    setWarnings(version.warnings);
    setError(null);
    setActiveSceneId(version.sceneId);
    setChatMessages(messagesFromVersion(version));
    setSelectedEntityIds(new Set());
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
        setPendingSceneName(null);
        setChatMessages([]);
        setLastAppliedPrompt("");
        setContextSummary(null);
        setContextUpdatedAt(null);
        setContextUsage(null);
        setSelectedEntityIds(new Set());
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

    applyScenePreview(applyEntityTransform(scene, selectedEntityId, transform));
  }

  function handleResetEntityTransform() {
    if (!scene || !selectedEntityId) {
      return;
    }

    applyScenePreview(resetEntityTransform(scene, selectedEntityId));
  }

  function handleFocusEntity() {
    if (!scene || !selectedEntityId) {
      return;
    }

    applyScenePreview(focusCameraOnEntity(scene, selectedEntityId));
  }

  function handleToggleIsolate() {
    if (!selectedEntityId) {
      return;
    }

    setIsolatedEntityId((current) =>
      current === selectedEntityId ? null : selectedEntityId,
    );
  }

  function handleSelectEntity(entityId: string | null, additive = false) {
    setSelectedEntityIds((current) => {
      if (!entityId) {
        return new Set();
      }

      if (!additive) {
        return new Set([entityId]);
      }

      const next = new Set(current);

      if (next.has(entityId)) {
        next.delete(entityId);
      } else {
        next.add(entityId);
      }

      return next;
    });

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

    applyScenePreview(applyViewPreset(scene, preset, selectedEntityId));
  }

  async function handleRefineEntity(instruction: string) {
    if (!scene || !selectedEntityId) {
      setError("Select an entity before refining.");
      return;
    }

    if (selectedEntityIds.size > 1) {
      setError("Select exactly one entity to use entity refinement.");
      return;
    }

    setIsRefiningEntity(true);
    setError(null);

    try {
      const chatContext = buildChatContext({
        messages: chatMessages,
        compactSummary: contextSummary,
        sceneName: scene.sceneName,
        selectedEntityName: selectedEntityLabel,
      });
      const job = await runSceneJob({
        action: "refine-entity",
        scene,
        entityId: selectedEntityId,
        instruction,
        chatContext,
      });
      const result = job.result;
      if (!result) {
        throw new Error("Entity refinement job did not return a result.");
      }
      applyScenePreview(result.scene);
      setWarnings(result.warnings);
      applyUsageState(result.usage);
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
  const selectedEntityIdsArray = [...selectedEntityIds];
  const selectedEntityId = selectedEntityIdsArray[0] ?? null;
  const selectedEntities = sceneEntities.filter((entity) =>
    selectedEntityIds.has(entity.id),
  );
  const selectedEntity =
    sceneEntities.find((entity) => entity.id === selectedEntityId) ?? null;
  const selectedEntityLabel =
    selectedEntities.length > 1
      ? `${selectedEntities.length} selected: ${selectedEntities
          .slice(0, 2)
          .map((entity) => entity.name)
          .join(", ")}${selectedEntities.length > 2 ? "..." : ""}`
      : (selectedEntity?.name ?? "Selected entity");
  const selectedEntityPartCount = selectedEntities.reduce(
    (total, entity) => total + entity.objectIds.length,
    0,
  );
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
  const workspaceSceneName = scene?.sceneName ?? pendingSceneName;

  function isSelectedTransformLocked() {
    if (!scene || !selectedEntity) {
      return false;
    }

    return selectedTransformLocked;
  }

  function applyUsageState(usage?: GenerationUsage) {
    setContextUsage(usage ?? null);

    if (usage?.memory?.compactSummary !== undefined) {
      setContextSummary(usage.memory.compactSummary ?? null);
    }

    if (usage?.memory?.compactedAt !== undefined) {
      setContextUpdatedAt(usage.memory.compactedAt ?? null);
    }
  }

  function applyMemoryState(memory: SceneMemoryMetadata) {
    setContextSummary(memory.chatContextSummary);
    setContextUpdatedAt(memory.chatContextUpdatedAt);
    setContextUsage({
      estimatedInputTokens: memory.estimatedInputTokens ?? undefined,
      estimatedOutputTokens: memory.estimatedOutputTokens ?? undefined,
      providerInputTokens: memory.providerInputTokens,
      providerOutputTokens: memory.providerOutputTokens,
      usedProviderUsage: Boolean(
        memory.providerInputTokens || memory.providerOutputTokens,
      ),
      memory: {
        compactSummary: memory.chatContextSummary,
        compactedAt: memory.chatContextUpdatedAt,
        didCompact: false,
      },
    });
  }

  function resetChatState() {
    setChatInput("");
    setChatMessages([]);
    setWarnings([]);
    setError(null);
    setContextSummary(null);
    setContextUpdatedAt(null);
    setContextUsage(null);
    setGenerationJobSteps([]);
  }

  function applyScenePreview(nextScene: SceneDocument | null) {
    setScene(nextScene);
    setJsonDraft(nextScene ? JSON.stringify(nextScene, null, 2) : "{}");
    setJsonError(null);
  }

  async function handleCopySceneJson() {
    const value = scene ? JSON.stringify(scene, null, 2) : jsonDraft;

    try {
      await navigator.clipboard.writeText(value);
      setJsonError(null);
      setWarnings((current) => ["Scene JSON copied.", ...current].slice(0, 12));
    } catch {
      setJsonError("Clipboard copy failed in this browser.");
    }
  }

  function handlePreviewJson() {
    try {
      const importedScene = parseSceneDocument(jsonDraft);

      applyScenePreview(importedScene);
      setPendingSceneName(null);
      setActiveSceneId(null);
      setVersions([]);
      setSelectedEntityIds(new Set());
      setIsolatedEntityId(null);
      setLockedEntityIds(new Set());
      setUnlockedStaticEntityIds(new Set());
      setLastAppliedPrompt("Imported from JSON editor");
      setJsonError(null);
      setError(null);
      setWarnings((current) =>
        [`Previewing pasted JSON scene "${importedScene.sceneName}".`, ...current].slice(
          0,
          12,
        ),
      );
    } catch (caughtError) {
      setJsonError(
        caughtError instanceof Error
          ? caughtError.message
          : "Scene JSON could not be parsed.",
      );
    }
  }

  async function handleImportGlb(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    // Reset the input so the same file can be re-selected later.
    event.target.value = "";

    setIsImportingGlb(true);
    setJsonError(null);

    try {
      const result = await importGlbToScene(file);
      const draft = JSON.stringify(result.scene, null, 2);

      setJsonDraft(draft);
      applyScenePreview(result.scene);
      setPendingSceneName(null);
      setActiveSceneId(null);
      setVersions([]);
      setSelectedEntityIds(new Set());
      setIsolatedEntityId(null);
      setLockedEntityIds(new Set());
      setUnlockedStaticEntityIds(new Set());
      setLastAppliedPrompt(`Imported from GLB: ${file.name}`);
      setError(null);

      const msgs: string[] = [
        `GLB imported: ${result.objectCount} mesh${result.objectCount !== 1 ? "es" : ""} converted to primitives.`,
        ...(result.skippedCount > 0
          ? [`${result.skippedCount} degenerate mesh${result.skippedCount !== 1 ? "es" : ""} skipped.`]
          : []),
        ...result.warnings,
        "Each mesh is approximated — edit positions and materials in the JSON editor or via chat.",
      ];

      setWarnings((current) => [...msgs, ...current].slice(0, 12));
    } catch (caughtError) {
      setJsonError(
        caughtError instanceof Error
          ? caughtError.message
          : "GLB import failed.",
      );
    } finally {
      setIsImportingGlb(false);
    }
  }

  return (
    <main className="flex h-dvh overflow-hidden bg-app text-primary max-lg:flex-col">
      <StudioSidebar
        activeView={sidebarView}
        userEmail={user?.email}
        onViewChange={setSidebarView}
        onSignOut={() => void signOut()}
        agent={
          <PromptPanel
            embedded
            canApproveScene={Boolean(scene)}
            canExport={Boolean(scene)}
            canSave={Boolean(scene)}
            canSaveVersion={Boolean(activeSceneId)}
            chatInput={chatInput}
            error={error}
            hasScene={Boolean(scene)}
            isBusy={isBusy}
            jobSteps={generationJobSteps}
            messages={chatMessages}
            memorySummary={contextSummary}
            memoryUpdatedAt={contextUpdatedAt}
            projectName={project?.name ?? null}
            selectedEntityCount={selectedEntities.length}
            sceneName={workspaceSceneName}
            selectedEntityName={
              selectedEntities.length > 0 ? selectedEntityLabel : null
            }
            selectedEntityPartCount={selectedEntityPartCount}
            userEmail={user?.email}
            warnings={warnings}
            usage={contextUsage}
            onApproveScene={() => void handleApproveSceneReference()}
            onSave={handleSave}
            onExport={handleExport}
            onClarificationSelect={handleClarificationSelect}
            onNewChat={handleStartNewChat}
            onNewScene={() => void handleStartNewScene()}
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
            onNewScene={() => void handleStartNewScene()}
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
            selectedEntityIds={selectedEntityIdsArray}
            onFocus={handleFocusEntity}
            onRefine={handleRefineEntity}
            onApproveSelected={handleApproveSelectedReference}
            onResetTransform={handleResetEntityTransform}
            onSelectEntity={(entityId, additive) =>
              handleSelectEntity(entityId, additive)
            }
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
              {workspaceSceneName ??
                (isGenerating ? "Generating scene" : "No scene yet")}
            </h2>
            {scene?.description ? (
              <p className="mt-1 line-clamp-2 max-w-3xl text-xs leading-5 text-secondary">
                {scene.description}
              </p>
            ) : !isGenerating ? (
              <p className="mt-1 max-w-3xl text-xs leading-5 text-secondary">
                {pendingSceneName
                  ? "Use the chat to generate this new named scene."
                  : "The assistant chat is ready."}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <button
              className="border border-ui px-3 py-2 text-xs font-semibold text-secondary transition hover:border-accent hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={isBusy}
              onClick={() => void handleStartNewScene()}
            >
              New scene
            </button>
            <button
              className="border border-ui px-3 py-2 text-xs font-semibold text-secondary transition hover:border-accent hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={isBusy}
              onClick={handleStartNewChat}
            >
              New chat
            </button>
            <button
              className="border border-success bg-success-soft px-3 py-2 text-xs font-semibold text-success transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={isBusy || !scene}
              onClick={() => void handleApproveSceneReference()}
            >
              Approve scene
            </button>
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
              selectedEntityIds={selectedEntityIdsArray}
              selectedEntityName={
                selectedEntities.length > 0 ? selectedEntityLabel : null
              }
              onClearSelection={() => handleSelectEntity(null)}
              onFocusSelected={handleFocusEntity}
              onSelectEntity={(entityId, additive) => {
                handleSelectEntity(entityId, additive);
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
            <div className="border-t border-ui">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                <p className="text-xs text-secondary">
                  Paste a MiniMesh scene JSON, then preview it in the viewport.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    ref={glbInputRef}
                    type="file"
                    accept=".glb,.gltf"
                    className="sr-only"
                    onChange={(e) => void handleImportGlb(e)}
                  />
                  <button
                    className="border border-ui px-2.5 py-1 text-xs font-semibold text-secondary transition hover:border-accent hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    disabled={isBusy || isImportingGlb}
                    onClick={() => glbInputRef.current?.click()}
                  >
                    {isImportingGlb ? "Importing…" : "Import GLB"}
                  </button>
                  <button
                    className="border border-ui px-2.5 py-1 text-xs font-semibold text-secondary transition hover:border-accent hover:text-primary"
                    type="button"
                    onClick={() => void handleCopySceneJson()}
                  >
                    Copy JSON
                  </button>
                  <button
                    className="border border-accent bg-accent px-2.5 py-1 text-xs font-semibold text-accent-contrast transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    disabled={isBusy || isImportingGlb || jsonDraft.trim().length < 2}
                    onClick={handlePreviewJson}
                  >
                    Preview JSON
                  </button>
                </div>
              </div>
              {jsonError ? (
                <p className="mx-4 mb-2 border border-danger bg-danger-soft px-3 py-2 text-xs text-danger">
                  {jsonError}
                </p>
              ) : null}
              <textarea
                className="block h-52 w-full resize-y border-t border-ui bg-field px-4 py-3 font-mono text-xs leading-5 text-primary outline-none transition focus:border-accent"
                spellCheck={false}
                value={jsonDraft}
                onChange={(event) => {
                  setJsonDraft(event.target.value);
                  setJsonError(null);
                }}
              />
            </div>
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

function buildChatContext({
  messages,
  compactSummary,
  sceneName,
  selectedEntityName,
}: {
  messages: SceneChatMessage[];
  compactSummary: string | null;
  sceneName: string | null;
  selectedEntityName: string | null;
}): GenerationChatContext {
  return {
    compactSummary,
    sceneName,
    selectedEntityName,
    recentMessages: messages
      .filter((message) => message.status === "applied")
      .slice(-8)
      .map((message) => ({
        role: message.role,
        content: message.content,
      })),
  };
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
  clarificationOptions,
  targetName,
  versionNumber,
  createdAt,
}: {
  id?: string;
  role: SceneChatMessage["role"];
  content: string;
  status: SceneChatMessage["status"];
  action?: SceneChatMessage["action"];
  clarificationOptions?: SceneChatMessage["clarificationOptions"];
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
    clarificationOptions,
    targetName,
    versionNumber,
    createdAt: createdAt ?? new Date().toISOString(),
  };
}

function getChatAction(
  hasScene: boolean,
  selectedEntityCount: number,
  instruction: string,
): NonNullable<SceneChatMessage["action"]> {
  if (!hasScene) {
    return "generate";
  }

  if (selectedEntityCount !== 1) {
    return "edit-scene";
  }

  return isAdditiveSceneInstruction(instruction)
    ? "edit-scene"
    : "refine-entity";
}

function isAdditiveSceneInstruction(instruction: string): boolean {
  return /\b(add|create|place|put|insert|spawn|make|include)\b/i.test(
    instruction,
  );
}

function fragmentFromSelectedEntities(
  scene: SceneDocument,
  entities: SceneEntity[],
): SceneFragment {
  const selectedObjectIds = new Set(
    entities.flatMap((entity) => entity.objectIds),
  );

  return {
    objects: scene.objects
      .filter((object) => selectedObjectIds.has(object.id))
      .slice(0, 24),
    lights: scene.lights.slice(0, 4),
  };
}

function deriveSceneTags(scene: SceneDocument): string[] {
  return uniqueTags([
    scene.sceneName,
    ...(scene.description?.split(/\s+/) ?? []),
    ...(scene.entities ?? []).flatMap((entity) => entity.tags),
    ...scene.objects.map((object) => object.type),
  ]).slice(0, 16);
}

function uniqueTags(values: string[]): string[] {
  return [
    ...new Set(
      values
        .map((value) => value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
        .filter((value) => value.length > 2)
        .slice(0, 32),
    ),
  ];
}

function parseSceneDocument(value: string): SceneDocument {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Invalid JSON. Check commas, quotes, and brackets.");
  }

  if (!isRecord(parsed)) {
    throw new Error("Scene JSON must be an object.");
  }

  if (!Array.isArray(parsed.objects) || parsed.objects.length === 0) {
    throw new Error("Scene JSON must include at least one object.");
  }

  const objects = parsed.objects.map((object, index) =>
    parseSceneObject(object, index),
  );

  return {
    sceneName:
      typeof parsed.sceneName === "string" && parsed.sceneName.trim()
        ? parsed.sceneName.trim()
        : "Imported Scene",
    description:
      typeof parsed.description === "string" ? parsed.description : undefined,
    objects,
    entities: Array.isArray(parsed.entities)
      ? parsed.entities.map(parseSceneEntity).filter(isPresent)
      : undefined,
    lights: Array.isArray(parsed.lights)
      ? parsed.lights.map(parseSceneLight).filter(isPresent)
      : [],
    camera: parseCamera(parsed.camera),
    environment: isRecord(parsed.environment)
      ? {
          backgroundColor: stringOr(parsed.environment.backgroundColor, "#0b0f14"),
          fogColor: stringOr(parsed.environment.fogColor, "#0b0f14"),
          fogNear: numberOr(parsed.environment.fogNear, 18),
          fogFar: numberOr(parsed.environment.fogFar, 42),
          exposure: numberOr(parsed.environment.exposure, 1),
        }
      : undefined,
  };
}

function parseSceneObject(value: unknown, index: number): SceneDocument["objects"][number] {
  if (!isRecord(value)) {
    throw new Error(`Object ${index + 1} must be an object.`);
  }

  const type = stringOr(value.type, "box");

  if (!["box", "sphere", "cylinder", "cone", "torus", "plane"].includes(type)) {
    throw new Error(`Object ${index + 1} has unsupported type "${type}".`);
  }

  const material = isRecord(value.material) ? value.material : {};

  return {
    id: stringOr(value.id, `object-${index + 1}`),
    name: stringOr(value.name, `Object ${index + 1}`),
    entityId: typeof value.entityId === "string" ? value.entityId : undefined,
    role: typeof value.role === "string" ? value.role : undefined,
    type: type as SceneDocument["objects"][number]["type"],
    position: vectorOr(value.position, [0, 0, 0]),
    rotation: vectorOr(value.rotation, [0, 0, 0]),
    scale: vectorOr(value.scale, [1, 1, 1]).map((item) =>
      Math.max(0.01, Math.abs(item)),
    ) as [number, number, number],
    material: {
      color: stringOr(material.color, "#38bdf8"),
      metalness:
        material.metalness === undefined
          ? undefined
          : numberOr(material.metalness, 0),
      roughness:
        material.roughness === undefined
          ? undefined
          : numberOr(material.roughness, 0.55),
      emissive:
        typeof material.emissive === "string" ? material.emissive : undefined,
      emissiveIntensity:
        material.emissiveIntensity === undefined
          ? undefined
          : numberOr(material.emissiveIntensity, 0),
    },
  };
}

function parseSceneEntity(value: unknown): SceneEntity | null {
  if (!isRecord(value) || !Array.isArray(value.objectIds)) {
    return null;
  }

  return {
    id: stringOr(value.id, "entity"),
    name: stringOr(value.name, "Imported entity"),
    description:
      typeof value.description === "string" ? value.description : undefined,
    sourceGroupId:
      typeof value.sourceGroupId === "string" ? value.sourceGroupId : undefined,
    objectIds: value.objectIds.filter(
      (objectId): objectId is string => typeof objectId === "string",
    ),
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    transform: isRecord(value.transform)
      ? {
          position: vectorOr(value.transform.position, [0, 0, 0]),
          rotation: vectorOr(value.transform.rotation, [0, 0, 0]),
          scale: vectorOr(value.transform.scale, [1, 1, 1]),
        }
      : {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
  };
}

function parseSceneLight(value: unknown): SceneLight | null {
  if (!isRecord(value)) {
    return null;
  }

  const type = stringOr(value.type, "point");

  if (!["ambient", "directional", "point"].includes(type)) {
    return null;
  }

  return {
    id: stringOr(value.id, "light"),
    type: type as SceneDocument["lights"][number]["type"],
    color: stringOr(value.color, "#ffffff"),
    intensity: numberOr(value.intensity, 1),
    position: type === "ambient" ? undefined : vectorOr(value.position, [4, 5, 4]),
  };
}

function parseCamera(value: unknown): SceneDocument["camera"] {
  if (!isRecord(value)) {
    return {
      position: [5, 4, 7],
      target: [0, 0, 0],
      fov: 45,
    };
  }

  return {
    position: vectorOr(value.position, [5, 4, 7]),
    target: vectorOr(value.target, [0, 0, 0]),
    fov: numberOr(value.fov, 45),
  };
}

function vectorOr(
  value: unknown,
  fallback: [number, number, number],
): [number, number, number] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return [
    numberOr(value[0], fallback[0]),
    numberOr(value[1], fallback[1]),
    numberOr(value[2], fallback[2]),
  ];
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberOr(value: unknown, fallback: number): number {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(number) ? number : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
