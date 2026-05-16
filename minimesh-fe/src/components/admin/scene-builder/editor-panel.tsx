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

const labelClass = "text-[10px] font-medium text-landing-muted";

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
  return (
    <div className="sb-panel h-full min-h-0">
      <div className="sb-panel-header flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-landing-heading">Template editor</p>
          <p className="text-[10px] text-landing-subtle">
            {isEditing ? "Editing library entry" : "New template"}
          </p>
        </div>
        <button
          type="button"
          onClick={onNewTemplate}
          className="shrink-0 rounded-md border border-landing px-2 py-1 text-[10px] font-medium text-landing-muted hover:bg-landing-hover"
        >
          + New
        </button>
      </div>

      <div className="sb-panel-body space-y-3">
        <label className="grid gap-1">
          <span className={labelClass}>Object name</span>
          <input
            className="sb-input"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Cyberpunk Street Lamp"
          />
        </label>

        <label className="grid gap-1">
          <span className={labelClass}>Category</span>
          <CategoryField
            value={category}
            options={categoryOptions}
            onChange={onCategoryChange}
            inputClassName="sb-input"
          />
        </label>

        <label className="grid gap-1">
          <span className={labelClass}>Visibility</span>
          <select
            className="sb-input"
            value={isPublic ? "public" : "private"}
            onChange={(e) => onIsPublicChange(e.target.value === "public")}
          >
            <option value="public">Public · retrieval enabled</option>
            <option value="private">Private · internal only</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className={labelClass}>Description</span>
          <textarea
            className="sb-input min-h-[4.5rem] resize-y py-2"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Low-poly neon street lamp for night city scenes."
          />
        </label>

        <label className="grid gap-1">
          <span className="flex items-center justify-between gap-2">
            <span className={labelClass}>Tags</span>
            {onSuggestTags ? (
              <button
                type="button"
                onClick={onSuggestTags}
                className="text-[9px] text-landing-accent hover:underline"
              >
                Suggest
              </button>
            ) : null}
          </span>
          <input
            className="sb-input"
            value={tagsInput}
            onChange={(e) => onTagsChange(e.target.value)}
            placeholder="neon, lamp, street"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className={labelClass}>Semantic keywords</span>
            <input
              className="sb-input"
              value={semanticKeywords}
              onChange={(e) => onSemanticKeywordsChange(e.target.value)}
              placeholder="illumination, roadside"
            />
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>Retrieval phrase</span>
            <input
              className="sb-input"
              value={aiPromptSeed}
              onChange={(e) => onAiPromptSeedChange(e.target.value)}
              placeholder="User match phrase"
            />
          </label>
        </div>

        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className={labelClass}>Scene JSON</span>
            <div className="flex gap-1">
              <ToolbarButton label="Starter" onClick={onLoadExample} />
              <ToolbarButton label="Format" onClick={onFormatJson} />
            </div>
          </div>
          <JsonEditor value={sceneJson} onChange={onSceneJsonChange} issues={jsonIssues} />
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-landing-subtle">
            Object tree
          </p>
          <ObjectTreePanel objects={parsedObjects} />
        </div>
      </div>

      <div className="sb-panel-footer space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <ActionButton label="Preview" onClick={onGeneratePreview} disabled={isBusy} />
          <ActionButton label={saveLabel} onClick={onSave} disabled={isBusy} primary />
        </div>
        {isEditing && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={isBusy}
            className="w-full rounded-md border border-rose-500/30 py-1.5 text-[10px] font-medium text-rose-400 hover:bg-rose-500/10 disabled:opacity-40"
          >
            Delete template
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ToolbarButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-landing px-1.5 py-0.5 text-[9px] text-landing-subtle hover:bg-landing-hover"
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
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md py-2 text-[10px] font-semibold transition disabled:opacity-40 ${
        primary
          ? "admin-btn-primary text-white"
          : "border border-landing text-landing-muted hover:bg-landing-hover"
      }`}
    >
      {label}
    </button>
  );
}
