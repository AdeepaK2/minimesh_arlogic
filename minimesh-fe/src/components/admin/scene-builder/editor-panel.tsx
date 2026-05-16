"use client";

import { JsonEditor } from "./json-editor";
import { CategoryField } from "./category-field";
import { ObjectTreePanel } from "./object-tree-panel";

interface EditorPanelProps {
  name: string;
  category: string;
  categoryOptions: string[];
  description: string;
  tagsInput: string;
  semanticKeywords: string;
  aiPromptSeed: string;
  sceneJson: string;
  isPublic: boolean;
  jsonIssues: string[];
  parsedObjects: { id: string; name: string; type: string }[];
  isBusy: boolean;
  isEditing: boolean;
  saveLabel: string;
  onNameChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onSemanticKeywordsChange: (value: string) => void;
  onAiPromptSeedChange: (value: string) => void;
  onSceneJsonChange: (value: string) => void;
  onIsPublicChange: (value: boolean) => void;
  onGeneratePreview: () => void;
  onSave: () => void;
  onNewTemplate: () => void;
  onDelete?: () => void;
  onSuggestTags?: () => void;
  onFormatJson: () => void;
  onLoadExample: () => void;
}

const inputClass = "minimesh-input h-10 w-full";

export function EditorPanel({
  name,
  category,
  categoryOptions,
  description,
  tagsInput,
  semanticKeywords,
  aiPromptSeed,
  sceneJson,
  isPublic,
  jsonIssues,
  parsedObjects,
  isBusy,
  isEditing,
  saveLabel,
  onNameChange,
  onCategoryChange,
  onDescriptionChange,
  onTagsChange,
  onSemanticKeywordsChange,
  onAiPromptSeedChange,
  onSceneJsonChange,
  onIsPublicChange,
  onGeneratePreview,
  onSave,
  onNewTemplate,
  onDelete,
  onSuggestTags,
  onFormatJson,
  onLoadExample,
}: EditorPanelProps) {
  const issues = jsonIssues;

  return (
    <div className="admin-panel flex h-full flex-col">
      <div className="border-b border-landing px-4 py-3">
        <p className="minimesh-eyebrow">Scene template editor</p>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-landing-subtle">
              {isEditing
                ? "Editing a saved template — save updates the library entry"
                : "New template — save adds to the vector library"}
            </p>
          </div>
          <button
            type="button"
            onClick={onNewTemplate}
            className="shrink-0 rounded-lg border border-landing px-2.5 py-1 text-[10px] font-semibold text-landing-muted hover:border-cyan-500/30 hover:text-cyan-200"
          >
            + New
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs sm:col-span-2">
            <span className="font-medium text-landing-muted">Object name</span>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Cyberpunk Street Lamp"
            />
          </label>
          <label className="grid gap-1.5 text-xs sm:col-span-2">
            <span className="font-medium text-landing-muted">Category</span>
            <CategoryField
              value={category}
              options={categoryOptions}
              onChange={onCategoryChange}
              inputClassName={inputClass}
            />
          </label>
          <label className="grid gap-1.5 text-xs">
            <span className="font-medium text-landing-muted">Visibility</span>
            <select
              className={inputClass}
              value={isPublic ? "public" : "private"}
              onChange={(e) => onIsPublicChange(e.target.value === "public")}
            >
              <option value="public" className="bg-landing-code">
                Public · retrieval enabled
              </option>
              <option value="private" className="bg-landing-code">
                Private · internal only
              </option>
            </select>
          </label>
        </div>

        <label className="grid gap-1.5 text-xs">
          <span className="font-medium text-zinc-300">Description</span>
          <textarea
            className={`${inputClass} min-h-20 resize-y py-2`}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Low-poly neon street lamp for night city scenes."
          />
        </label>

        <label className="grid gap-1.5 text-xs">
          <span className="flex items-center justify-between gap-2 font-medium text-zinc-300">
            Tags
            {onSuggestTags ? (
              <button
                type="button"
                onClick={onSuggestTags}
                className="text-[10px] font-normal text-cyan-500/90 hover:text-cyan-300"
              >
                Suggest from fields
              </button>
            ) : null}
          </span>
          <input
            className={inputClass}
            value={tagsInput}
            onChange={(e) => onTagsChange(e.target.value)}
            placeholder="neon, lamp, street, cyberpunk"
          />
        </label>

        <label className="grid gap-1.5 text-xs">
          <span className="font-medium text-zinc-300">Semantic keywords</span>
          <input
            className={inputClass}
            value={semanticKeywords}
            onChange={(e) => onSemanticKeywordsChange(e.target.value)}
            placeholder="illumination, roadside, futuristic"
          />
        </label>

        <label className="grid gap-1.5 text-xs">
          <span className="font-medium text-zinc-300">Retrieval phrase</span>
          <input
            className={inputClass}
            value={aiPromptSeed}
            onChange={(e) => onAiPromptSeedChange(e.target.value)}
            placeholder="Phrase users might say when this object should match"
          />
        </label>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-zinc-300">
              Scene JSON fragment
            </span>
            <div className="flex flex-wrap gap-1">
              <ToolbarButton label="Starter JSON" onClick={onLoadExample} />
              <ToolbarButton label="Format" onClick={onFormatJson} />
            </div>
          </div>
          <JsonEditor
            value={sceneJson}
            onChange={onSceneJsonChange}
            issues={issues}
          />
        </div>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Object tree
          </p>
          <ObjectTreePanel objects={parsedObjects} />
        </div>
      </div>

      <div className="space-y-2 border-t border-white/10 p-3">
        <div className="grid grid-cols-2 gap-2">
          <ActionButton label="Preview" onClick={onGeneratePreview} disabled={isBusy} />
          <ActionButton
            label={saveLabel}
            onClick={onSave}
            disabled={isBusy}
            primary
          />
        </div>
        {isEditing && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={isBusy}
            className="w-full rounded-xl border border-rose-500/30 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-40"
          >
            Delete template
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-400 hover:border-cyan-500/30 hover:text-cyan-300"
    >
      {label}
    </button>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  primary,
  className = "",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl py-2.5 text-xs font-semibold transition disabled:opacity-40 ${className} ${
        primary
          ? "admin-btn-primary text-white hover:brightness-110"
          : "border border-landing text-landing-muted hover:border-cyan-500/30 hover:text-cyan-200"
      }`}
    >
      {label}
    </button>
  );
}
