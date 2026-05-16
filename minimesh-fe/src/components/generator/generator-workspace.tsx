"use client";

import { useState } from "react";
import { generateScene } from "@/lib/api/generation";
import { exportSceneToGlb } from "@/lib/scene/export-glb";
import { sampleScene } from "@/lib/scene/sample-scene";
import type { SceneDocument } from "@/lib/scene/types";
import { SceneViewport } from "../scene/scene-viewport";
import { PromptPanel } from "./prompt-panel";

export function GeneratorWorkspace() {
  const [prompt, setPrompt] = useState(
    "A tiny sci-fi rover with glowing wheels on a circular platform",
  );
  const [scene, setScene] = useState<SceneDocument>(sampleScene);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  async function handleGenerate() {
    const trimmedPrompt = prompt.trim();

    if (trimmedPrompt.length < 3) {
      setError("Enter a prompt with at least 3 characters.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setWarnings([]);

    try {
      const result = await generateScene(trimmedPrompt);
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

  async function handleExport() {
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

  return (
    <main className="grid min-h-dvh bg-zinc-950 text-zinc-100 lg:grid-cols-[380px_1fr]">
      <PromptPanel
        error={error}
        isGenerating={isGenerating || isExporting}
        prompt={prompt}
        warnings={warnings}
        onExport={handleExport}
        onPromptChange={setPrompt}
        onSubmit={handleGenerate}
      />

      <section className="flex min-w-0 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-50">
              {scene.sceneName}
            </h2>
            {scene.description ? (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-400">
                {scene.description}
              </p>
            ) : null}
          </div>
          <div className="border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300">
            {scene.objects.length} objects
          </div>
        </header>

        <div className="min-h-0 flex-1 p-4">
          <SceneViewport scene={scene} />
        </div>

        <div className="grid max-h-52 border-t border-zinc-800 bg-zinc-950 lg:grid-cols-[260px_1fr]">
          <div className="border-b border-zinc-800 px-5 py-4 lg:border-b-0 lg:border-r">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Scene JSON
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Validated source document
            </p>
          </div>
          <pre className="overflow-auto px-5 py-4 text-xs leading-5 text-zinc-300">
            {JSON.stringify(scene, null, 2)}
          </pre>
        </div>
      </section>
    </main>
  );
}
