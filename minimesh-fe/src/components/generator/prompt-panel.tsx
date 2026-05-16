"use client";

interface PromptPanelProps {
  error: string | null;
  isGenerating: boolean;
  prompt: string;
  warnings: string[];
  onExport: () => void;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
}

const examples = [
  "A tiny sci-fi rover with glowing wheels on a circular platform",
  "A low-poly island with a lighthouse, rocks, and soft blue lights",
  "A cute robot desk lamp with a bouncing antenna",
];

export function PromptPanel({
  error,
  isGenerating,
  prompt,
  warnings,
  onExport,
  onPromptChange,
  onSubmit,
}: PromptPanelProps) {
  return (
    <aside className="flex min-h-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
          MiniMesh
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-50">
          Prompt to 3D scene
        </h1>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-200">Prompt</span>
          <textarea
            className="min-h-36 resize-none border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition focus:border-cyan-400"
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder="Describe a 3D object or small scene..."
          />
        </label>

        <div className="grid gap-2">
          {examples.map((example) => (
            <button
              key={example}
              className="border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-xs leading-5 text-zinc-300 transition hover:border-cyan-500 hover:text-zinc-50"
              type="button"
              onClick={() => onPromptChange(example)}
            >
              {example}
            </button>
          ))}
        </div>

        {error ? (
          <p className="border border-red-900 bg-red-950/40 px-3 py-2 text-sm leading-6 text-red-200">
            {error}
          </p>
        ) : null}

        {warnings.length > 0 ? (
          <div className="border border-amber-700 bg-amber-950/30 px-3 py-2 text-sm leading-6 text-amber-100">
            {warnings.join(" ")}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 p-5">
        <button
          className="border border-cyan-400 bg-cyan-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500"
          type="button"
          disabled={isGenerating || prompt.trim().length < 3}
          onClick={onSubmit}
        >
          {isGenerating ? "Generating" : "Generate"}
        </button>
        <button
          className="border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:text-zinc-500"
          type="button"
          disabled={isGenerating}
          onClick={onExport}
        >
          Export GLB
        </button>
      </div>
    </aside>
  );
}
