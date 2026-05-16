"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { GlassCard, PageHeader } from "@/components/admin/ui/glass-card";
import {
  createObjectTemplate,
  listObjectTemplates,
} from "@/lib/api/admin-object-templates";
import { buildCategoryOptions, normalizeCategory } from "@/lib/admin/category-options";
import {
  EXAMPLE_SCENE_FRAGMENT,
  OBJECT_TEMPLATE_CATEGORIES,
  type ObjectTemplateRecord,
} from "@/lib/admin/object-template-types";
import { CategoryField } from "@/components/admin/scene-builder/category-field";
import { validateSceneFragmentJson } from "@/lib/admin/validate-scene-fragment";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function ObjectTemplatesPanel() {
  const { accessToken, isLoading: authLoading, user } = useAuth();
  const [templates, setTemplates] = useState<ObjectTemplateRecord[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(
    OBJECT_TEMPLATE_CATEGORIES[0],
  );
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [sceneJson, setSceneJson] = useState(EXAMPLE_SCENE_FRAGMENT);
  const [isPublic, setIsPublic] = useState(true);
  const [jsonIssues, setJsonIssues] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    if (!accessToken) {
      return;
    }

    setIsLoadingList(true);
    setError(null);

    try {
      setTemplates(await listObjectTemplates(accessToken));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load object templates.",
      );
    } finally {
      setIsLoadingList(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  function handleValidateJson() {
    const result = validateSceneFragmentJson(sceneJson);
    setJsonIssues(result.ok ? [] : result.issues);
    return result;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!accessToken) {
      setError("Sign in to save object templates.");
      return;
    }

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName || !trimmedDescription) {
      setError("Name and description are required.");
      return;
    }

    const fragmentResult = validateSceneFragmentJson(sceneJson);
    if (!fragmentResult.ok) {
      setJsonIssues(fragmentResult.issues);
      setError("Fix scene JSON validation issues before saving.");
      return;
    }

    setJsonIssues([]);
    setIsSaving(true);

    try {
      const saved = await createObjectTemplate(accessToken, {
        name: trimmedName,
        category: normalizeCategory(category),
        description: trimmedDescription,
        tags: tagsInput
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        sceneJsonFragment: fragmentResult.value,
        isPublic,
      });

      setTemplates((current) => [
        saved,
        ...current.filter((item) => item.id !== saved.id),
      ]);
      setSuccess(
        `"${saved.name}" saved to the template library${saved.hasEmbedding ? " with vector embedding" : ""}.`,
      );
      setName("");
      setDescription("");
      setTagsInput("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save object template.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleLoadExample() {
    setSceneJson(EXAMPLE_SCENE_FRAGMENT);
    setJsonIssues([]);
  }

  if (authLoading) {
    return (
      <GlassCard className="p-8 text-center text-sm text-zinc-400">
        Loading admin workspace...
      </GlassCard>
    );
  }

  if (!accessToken) {
    return (
      <GlassCard className="p-8 text-center" glow>
        <p className="text-sm text-zinc-400">
          Sign in with your MiniMesh account to manage curated object templates.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-[#041018] transition hover:bg-cyan-400"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-zinc-200 transition hover:border-cyan-500/40"
          >
            Create account
          </Link>
        </div>
      </GlassCard>
    );
  }

  return (
    <>
      <PageHeader
        title="Object templates"
        description="Add reusable scene JSON fragments to the vector library. Each save stores metadata plus an embedding for semantic retrieval during generation."
        action={
          <button
            type="button"
            onClick={() => void loadTemplates()}
            disabled={isLoadingList}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-50"
          >
            {isLoadingList ? "Refreshing..." : "Refresh list"}
          </button>
        }
      />

      {user?.email ? (
        <p className="-mt-4 mb-6 text-xs text-zinc-500">
          Signed in as {user.email}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <GlassCard className="p-6" glow>
          <h2 className="text-lg font-semibold text-white">Add object template</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Paste a scene fragment with <code className="text-cyan-300">objects</code>{" "}
            and optional <code className="text-cyan-300">lights</code>. This is stored
            in <code className="text-cyan-300">object_templates</code> and indexed in{" "}
            <code className="text-cyan-300">template_embeddings</code>.
          </p>

          <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-zinc-200">Name</span>
                <input
                  className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-white outline-none focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/15"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Street Lamp"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm sm:col-span-2">
                <span className="font-medium text-zinc-200">Category</span>
                <CategoryField
                  value={category}
                  options={categoryOptions}
                  onChange={setCategory}
                  inputClassName="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-white outline-none focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/15"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-zinc-200">Description</span>
              <textarea
                className="min-h-24 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/15"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Slim street lamp with a neon light head for cyberpunk streets."
                required
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-zinc-200">
                Tags <span className="text-zinc-500">(comma-separated)</span>
              </span>
              <input
                className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-white outline-none focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/15"
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="street, lamp, neon, prop"
              />
            </label>

            <div className="grid gap-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-zinc-200">Scene JSON fragment</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleLoadExample}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-cyan-500/30 hover:text-cyan-300"
                  >
                    Load example
                  </button>
                  <button
                    type="button"
                    onClick={handleValidateJson}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-cyan-500/30 hover:text-cyan-300"
                  >
                    Validate JSON
                  </button>
                </div>
              </div>
              <textarea
                className="min-h-72 font-mono text-xs leading-5 rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-cyan-50 outline-none focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/15"
                value={sceneJson}
                onChange={(event) => setSceneJson(event.target.value)}
                spellCheck={false}
              />
              {jsonIssues.length > 0 ? (
                <ul className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  {jsonIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            <label className="flex items-center gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(event) => setIsPublic(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/30"
              />
              Public template (available for generation retrieval)
            </label>

            {error ? (
              <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {success}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSaving}
              className="admin-btn-primary h-11 rounded-xl text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving template..." : "Save to vector library"}
            </button>
          </form>
        </GlassCard>

        <GlassCard className="flex flex-col overflow-hidden p-0">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Saved templates</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {templates.length} object{templates.length === 1 ? "" : "s"} in library
            </p>
          </div>

          <div className="max-h-[720px] flex-1 overflow-y-auto">
            {isLoadingList && templates.length === 0 ? (
              <p className="px-5 py-8 text-sm text-zinc-500">Loading templates...</p>
            ) : templates.length === 0 ? (
              <p className="px-5 py-8 text-sm text-zinc-500">
                No templates yet. Add your first object on the left.
              </p>
            ) : (
              <ul className="divide-y divide-white/5">
                {templates.map((template) => (
                  <li key={template.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">
                          {template.name}
                        </p>
                        <p className="mt-0.5 text-xs uppercase tracking-wide text-cyan-400/80">
                          {template.category}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          template.hasEmbedding
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {template.hasEmbedding ? "Indexed" : "No vector"}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                      {template.description}
                    </p>
                    {template.tags.length > 0 ? (
                      <p className="mt-2 text-xs text-zinc-500">
                        {template.tags.join(" · ")}
                      </p>
                    ) : null}
                    <p className="mt-2 text-[11px] text-zinc-600">
                      Updated {formatDate(template.updatedAt)}
                      {template.isPublic ? " · public" : " · private"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </GlassCard>
      </div>
    </>
  );
}
