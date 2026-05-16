"use client";

interface PromptPanelProps {
  canExport: boolean;
  canSave: boolean;
  canSaveVersion: boolean;
  error: string | null;
  isGenerating: boolean;
  prompt: string;
  userEmail?: string;
  warnings: string[];
  onExport: () => void;
  onSave: () => void;
  onSignOut: () => void;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
}

export function PromptPanel({
  canExport,
  canSave,
  canSaveVersion,
  error,
  isGenerating,
  prompt,
  userEmail,
  warnings,
  onExport,
  onSave,
  onSignOut,
  onPromptChange,
  onSubmit,
}: PromptPanelProps) {
  return (
    <section className="flex shrink-0 flex-col bg-panel">
      <div className="border-b border-ui px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              MiniMesh
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-primary">
              Prompt to 3D scene
            </h1>
          </div>
          <button
            className="border border-ui px-3 py-2 text-xs font-semibold text-secondary transition hover:border-accent hover:text-primary"
            type="button"
            onClick={onSignOut}
          >
            Logout
          </button>
        </div>
        {userEmail ? (
          <p className="mt-3 truncate text-xs text-secondary">{userEmail}</p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-primary">Prompt</span>
          <textarea
            className="min-h-28 resize-none border border-ui bg-field px-3 py-3 text-sm leading-6 text-primary outline-none transition focus:border-accent"
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder="Describe a 3D object or small scene..."
          />
        </label>

        {error ? (
          <p className="border border-danger bg-danger-soft px-3 py-2 text-sm leading-6 text-danger">
            {error}
          </p>
        ) : null}

        {warnings.length > 0 ? (
          <div className="border border-warning bg-warning-soft px-3 py-2 text-sm leading-6 text-warning">
            {warnings.join(" ")}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-ui p-5">
        <button
          className="border border-accent bg-accent px-4 py-3 text-sm font-semibold text-accent-contrast transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          disabled={isGenerating || prompt.trim().length < 3}
          onClick={onSubmit}
        >
          {isGenerating ? "Generating" : "Generate"}
        </button>
        <button
          className="border border-ui bg-field px-4 py-3 text-sm font-semibold text-primary transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          disabled={isGenerating || !canSave}
          onClick={onSave}
        >
          {canSaveVersion ? "Save Version" : "Save"}
        </button>
        <button
          className="col-span-2 border border-ui bg-field px-4 py-3 text-sm font-semibold text-primary transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          disabled={isGenerating || !canExport}
          onClick={onExport}
        >
          Export GLB
        </button>
      </div>
    </section>
  );
}
