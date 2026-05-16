"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  createObjectTemplate,
  deleteObjectTemplate,
  listObjectTemplates,
  searchObjectTemplates,
  updateObjectTemplate,
} from "@/lib/api/admin-object-templates";
import {
  fragmentToSceneDocument,
  mergeFragments,
} from "@/lib/admin/fragment-to-scene";
import { buildCategoryOptions, normalizeCategory } from "@/lib/admin/category-options";
import {
  buildCreateTemplatePayload,
  INITIAL_SCENE_BUILDER_FORM,
} from "@/lib/admin/scene-builder-form";
import {
  EXAMPLE_SCENE_FRAGMENT,
  type ObjectTemplateRecord,
  type ObjectTemplateSearchHit,
} from "@/lib/admin/object-template-types";
import { autoSuggestTags, formatSceneJson } from "@/lib/admin/scene-builder-helpers";
import { validateSceneFragmentJson } from "@/lib/admin/validate-scene-fragment";
import type { SceneDocument } from "@/lib/scene/types";
import { ArchitectureStrip } from "./architecture-strip";
import { CollapsibleCard } from "./collapsible-card";
import { EditorPanel } from "./editor-panel";
import { EmbeddingInspector } from "./embedding-inspector";
import { LibraryPanel } from "./library-panel";
import { MergeSimulator } from "./merge-simulator";
import { PreviewPanel } from "./preview-panel";
import { SemanticFlowDiagram } from "./semantic-flow-diagram";

export function SceneBuilderPortal() {
  const { accessToken, user } = useAuth();
  const [templates, setTemplates] = useState<ObjectTemplateRecord[]>([]);
  const [semanticHits, setSemanticHits] = useState<ObjectTemplateSearchHit[]>([]);
  const [librarySearch, setLibrarySearch] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);

  const [name, setName] = useState(INITIAL_SCENE_BUILDER_FORM.name);
  const [category, setCategory] = useState(INITIAL_SCENE_BUILDER_FORM.category);
  const [description, setDescription] = useState(INITIAL_SCENE_BUILDER_FORM.description);
  const [tagsInput, setTagsInput] = useState(INITIAL_SCENE_BUILDER_FORM.tagsInput);
  const [semanticKeywords, setSemanticKeywords] = useState(
    INITIAL_SCENE_BUILDER_FORM.semanticKeywords,
  );
  const [aiPromptSeed, setAiPromptSeed] = useState(INITIAL_SCENE_BUILDER_FORM.aiPromptSeed);
  const [sceneJson, setSceneJson] = useState(INITIAL_SCENE_BUILDER_FORM.sceneJson);
  const [isPublic, setIsPublic] = useState(INITIAL_SCENE_BUILDER_FORM.isPublic);
  const [jsonIssues, setJsonIssues] = useState<string[]>([]);
  const [previewScene, setPreviewScene] = useState<SceneDocument | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [showWireframe, setShowWireframe] = useState(false);
  const [showBounds, setShowBounds] = useState(true);
  const [showLighting, setShowLighting] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  const parsedObjects = useMemo(() => {
    try {
      const parsed = JSON.parse(sceneJson) as {
        objects?: { id: string; name: string; type: string }[];
      };
      return parsed.objects ?? [];
    } catch {
      return [];
    }
  }, [sceneJson]);

  const objectCount = previewScene?.objects.length ?? parsedObjects.length;

  const categoryOptions = useMemo(() => {
    const built = buildCategoryOptions(
      templates.map((template) => template.category),
    );
    const current = normalizeCategory(category);

    if (current && !built.includes(current)) {
      return [...built, current].sort((a, b) => a.localeCompare(b));
    }

    return built;
  }, [templates, category]);

  const loadTemplates = useCallback(async () => {
    if (!accessToken) return;
    try {
      setTemplates(await listObjectTemplates(accessToken));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load vector library.",
      );
    }
  }, [accessToken]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!accessToken || !librarySearch.trim()) {
      setSemanticHits([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      void (async () => {
        setIsSearching(true);
        try {
          setSemanticHits(
            await searchObjectTemplates(accessToken, librarySearch.trim(), 12),
          );
        } catch {
          setSemanticHits([]);
        } finally {
          setIsSearching(false);
        }
      })();
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [accessToken, librarySearch]);

  function getValidatedFragment() {
    const result = validateSceneFragmentJson(sceneJson);
    setJsonIssues(result.ok ? [] : result.issues);
    return result;
  }

  function previewTemplate(template: ObjectTemplateRecord) {
    const result = validateSceneFragmentJson(
      JSON.stringify(template.sceneJsonFragment),
    );
    if (!result.ok) {
      setError("Saved template JSON is invalid.");
      return;
    }
    setPreviewScene(fragmentToSceneDocument(result.value, template.name));
    setPreviewTitle(template.name);
    setSelectedTemplateId(template.id);
    setError(null);
  }

  function resetEditorForm() {
    setEditingTemplateId(null);
    setName(INITIAL_SCENE_BUILDER_FORM.name);
    setCategory(INITIAL_SCENE_BUILDER_FORM.category);
    setDescription(INITIAL_SCENE_BUILDER_FORM.description);
    setTagsInput(INITIAL_SCENE_BUILDER_FORM.tagsInput);
    setSemanticKeywords(INITIAL_SCENE_BUILDER_FORM.semanticKeywords);
    setAiPromptSeed(INITIAL_SCENE_BUILDER_FORM.aiPromptSeed);
    setSceneJson(INITIAL_SCENE_BUILDER_FORM.sceneJson);
    setIsPublic(INITIAL_SCENE_BUILDER_FORM.isPublic);
    setJsonIssues([]);
  }

  function loadTemplateIntoEditor(template: ObjectTemplateRecord) {
    setEditingTemplateId(template.id);
    setSelectedTemplateId(template.id);
    setName(template.name);
    setCategory(template.category);
    setDescription(template.description);
    setTagsInput(template.tags.join(", "));
    setSemanticKeywords("");
    setAiPromptSeed("");
    setSceneJson(`${JSON.stringify(template.sceneJsonFragment, null, 2)}\n`);
    setIsPublic(template.isPublic);
    setJsonIssues([]);
    previewTemplate(template);
  }

  function handleNewTemplate() {
    resetEditorForm();
    setSelectedTemplateId(null);
    setPreviewScene(null);
    setPreviewTitle(null);
    setStatus("New template — fill the form and save.");
    setError(null);
  }

  function handleGeneratePreview() {
    const result = getValidatedFragment();
    if (!result.ok) {
      setError("Fix validation issues before preview.");
      return;
    }
    setPreviewScene(
      fragmentToSceneDocument(result.value, name.trim() || "Fragment Preview"),
    );
    setPreviewTitle(name.trim() || "Fragment Preview");
    setError(null);
    setStatus("Preview updated in viewport.");
  }

  function handleSuggestTags() {
    const tags = autoSuggestTags({
      name,
      description,
      category,
      semanticKeywords,
      sceneJson,
    });
    setTagsInput(tags.join(", "));
    setStatus(`Suggested ${tags.length} tags.`);
  }

  function handleFormatJson() {
    try {
      setSceneJson(formatSceneJson(sceneJson));
      setStatus("JSON formatted.");
    } catch {
      setError("Cannot format invalid JSON.");
    }
  }

  function handleLoadExample() {
    setSceneJson(EXAMPLE_SCENE_FRAGMENT);
    setJsonIssues([]);
  }

  async function handleSave() {
    if (!accessToken) return;

    const built = buildCreateTemplatePayload({
      name,
      category,
      description,
      tagsInput,
      semanticKeywords,
      aiPromptSeed,
      sceneJson,
      isPublic,
    });

    if (!built.ok) {
      setError(built.error);
      if (built.error.includes("validation")) {
        getValidatedFragment();
      }
      return;
    }

    const wasEditing = Boolean(editingTemplateId);

    setIsBusy(true);
    setError(null);
    try {
      const saved = wasEditing && editingTemplateId
        ? await updateObjectTemplate(accessToken, editingTemplateId, built.payload)
        : await createObjectTemplate(accessToken, built.payload);

      setTemplates((current) => [
        saved,
        ...current.filter((item) => item.id !== saved.id),
      ]);

      resetEditorForm();
      previewTemplate(saved);
      setStatus(
        wasEditing
          ? `"${saved.name}" updated. Form cleared — preview shows the saved model.`
          : `"${saved.name}" saved. Form cleared — click the library entry to preview again.`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save template.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteTemplate(template: ObjectTemplateRecord) {
    if (!accessToken) return;
    const confirmed = window.confirm(
      `Delete "${template.name}" from the library? This cannot be undone.`,
    );
    if (!confirmed) return;

    setIsBusy(true);
    setError(null);
    try {
      await deleteObjectTemplate(accessToken, template.id);
      setTemplates((current) => current.filter((item) => item.id !== template.id));
      setMergeSelection((current) => current.filter((id) => id !== template.id));

      if (selectedTemplateId === template.id || editingTemplateId === template.id) {
        handleNewTemplate();
        setStatus(`"${template.name}" deleted.`);
      } else {
        setStatus(`"${template.name}" deleted.`);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not delete template.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  function handleLibraryPreview(template: ObjectTemplateRecord) {
    previewTemplate(template);
    setStatus(`Previewing "${template.name}". Click Edit to change it.`);
    setError(null);
  }

  function handleLibraryEdit(template: ObjectTemplateRecord) {
    loadTemplateIntoEditor(template);
    setStatus(`Editing "${template.name}".`);
    setError(null);
  }

  function handleMergeSimulate() {
    const selected = templates.filter((t) => mergeSelection.includes(t.id));
    const fragments = selected.flatMap((t) => {
      const result = validateSceneFragmentJson(
        JSON.stringify(t.sceneJsonFragment),
      );
      return result.ok ? [result.value] : [];
    });

    if (fragments.length === 0) {
      setError("Select valid templates to merge.");
      return;
    }

    setPreviewScene(mergeFragments(fragments, "Merge simulation"));
    setStatus(`Merged ${fragments.length} fragments in preview.`);
    setError(null);
  }

  function toggleMergeId(id: string) {
    setMergeSelection((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <div className="scene-builder scene-builder-canvas flex h-full min-h-0 flex-col">
      <header className="sb-header shrink-0 px-3 py-2.5 lg:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-landing-subtle">
              Scene Builder
            </p>
            <h1 className="text-base font-bold tracking-tight text-landing-heading sm:text-lg">
              3D memory library
            </h1>
            <p className="truncate text-[10px] text-landing-subtle">{user?.email}</p>
          </div>
          {(status || error) && (
            <p
              className={`max-w-sm shrink-0 text-right text-[10px] ${error ? "text-rose-400" : "text-emerald-500"}`}
            >
              {error ?? status}
            </p>
          )}
        </div>
        <div className="mt-2">
          <SemanticFlowDiagram />
        </div>
      </header>

      <div className="sb-workspace grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[var(--sb-col-left)_minmax(0,1fr)_var(--sb-col-right)] lg:overflow-hidden lg:p-4">
        <EditorPanel
          name={name}
          category={category}
          categoryOptions={categoryOptions}
          description={description}
          tagsInput={tagsInput}
          semanticKeywords={semanticKeywords}
          aiPromptSeed={aiPromptSeed}
          sceneJson={sceneJson}
          isPublic={isPublic}
          jsonIssues={jsonIssues}
          parsedObjects={parsedObjects}
          isBusy={isBusy}
          onNameChange={setName}
          onCategoryChange={setCategory}
          onDescriptionChange={setDescription}
          onTagsChange={setTagsInput}
          onSemanticKeywordsChange={setSemanticKeywords}
          onAiPromptSeedChange={setAiPromptSeed}
          onSceneJsonChange={setSceneJson}
          onIsPublicChange={setIsPublic}
          onGeneratePreview={handleGeneratePreview}
          onSuggestTags={handleSuggestTags}
          isEditing={Boolean(editingTemplateId)}
          saveLabel={editingTemplateId ? "Update library" : "Save to library"}
          onSave={() => void handleSave()}
          onNewTemplate={handleNewTemplate}
          onDelete={
            editingTemplateId
              ? () => {
                  const template = templates.find((t) => t.id === editingTemplateId);
                  if (template) void handleDeleteTemplate(template);
                }
              : undefined
          }
          onFormatJson={handleFormatJson}
          onLoadExample={handleLoadExample}
        />

        <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-y-auto lg:max-h-full lg:overflow-hidden">
          <PreviewPanel
            scene={previewScene}
            previewTitle={previewTitle}
            objectCount={objectCount}
            showWireframe={showWireframe}
            showBounds={showBounds}
            showLighting={showLighting}
            showGrid={showGrid}
            onToggleWireframe={() => setShowWireframe((v) => !v)}
            onToggleBounds={() => setShowBounds((v) => !v)}
            onToggleLighting={() => setShowLighting((v) => !v)}
            onToggleGrid={() => setShowGrid((v) => !v)}
            onCenter={handleGeneratePreview}
          />
          <div className="grid shrink-0 gap-2 lg:grid-cols-2">
            <CollapsibleCard
              title="Embedding inspector"
              subtitle="Nearest vectors for current query"
              badge={semanticHits.length ? `${semanticHits.length} hits` : undefined}
            >
              <EmbeddingInspector
                query={librarySearch || semanticKeywords || name}
                nearest={semanticHits}
              />
            </CollapsibleCard>
            <CollapsibleCard
              title="Merge simulator"
              subtitle="Combine library fragments"
              badge={mergeSelection.length ? `${mergeSelection.length} selected` : undefined}
            >
              <MergeSimulator
                templates={templates}
                selectedIds={mergeSelection}
                onToggle={toggleMergeId}
                onSimulate={handleMergeSimulate}
              />
            </CollapsibleCard>
          </div>
        </div>

        <LibraryPanel
          templates={templates}
          searchQuery={librarySearch}
          onSearchChange={setLibrarySearch}
          semanticHits={semanticHits}
          isSearching={isSearching}
          selectedId={selectedTemplateId}
          onPreview={handleLibraryPreview}
          onEdit={handleLibraryEdit}
          onDelete={(template) => void handleDeleteTemplate(template)}
        />
      </div>

      <ArchitectureStrip />
    </div>
  );
}
