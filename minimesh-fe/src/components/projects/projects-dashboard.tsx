"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProject,
  deleteProject,
  listProjects,
} from "@/lib/api/projects";
import { useAppModal } from "@/components/modal/use-app-modal";
import type { Project } from "@/lib/scene/types";
import { DashboardPlansBanner } from "./dashboard-plans-banner";

interface ProjectsDashboardProps {
  accessToken: string;
}

export function ProjectsDashboard({ accessToken }: ProjectsDashboardProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { confirm, modal, prompt } = useAppModal();

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setProjects(await listProjects(accessToken));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load projects.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadProjects();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadProjects]);

  async function handleCreateProject() {
    const name = await prompt({
      title: "Create project",
      description: "Name the workspace where related generated scenes will live.",
      label: "Project name",
      defaultValue: "Untitled Project",
      confirmLabel: "Create",
    });

    if (!name?.trim()) {
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const project = await createProject(accessToken, {
        name: name.trim(),
      });
      setProjects((current) => [project, ...current]);
      router.push(`/dashboard/projects/${project.id}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not create project.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteProject(projectId: string) {
    const confirmed = await confirm({
      title: "Delete project",
      description: "This will delete the project and all saved scenes inside it.",
      confirmLabel: "Delete",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setError(null);

    try {
      await deleteProject(accessToken, projectId);
      setProjects((current) =>
        current.filter((project) => project.id !== projectId),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not delete project.",
      );
    }
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-app">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ui bg-panel px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Projects
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-primary">
            Your workspaces
          </h2>
          <p className="mt-2 text-sm leading-6 text-secondary">
            Create a project, open it, then generate and version scenes inside.
          </p>
        </div>
        <button
          className="border border-accent bg-accent px-4 py-3 text-sm font-semibold text-accent-contrast transition hover:bg-accent-strong disabled:opacity-60"
          type="button"
          disabled={isCreating}
          onClick={handleCreateProject}
        >
          Create Project
        </button>
      </header>

      <DashboardPlansBanner accessToken={accessToken} />

      <div className="flex-1 overflow-auto p-6">
        {error ? (
          <p className="mb-4 border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-secondary">Loading projects...</p>
        ) : projects.length === 0 ? (
          <div className="grid min-h-[360px] place-items-center border border-ui bg-panel p-8 text-center">
            <div className="max-w-sm">
              <h3 className="text-xl font-semibold text-primary">
                Start with a project
              </h3>
              <p className="mt-2 text-sm leading-6 text-secondary">
                Projects keep related scenes and versions together.
              </p>
              <button
                className="mt-5 border border-accent bg-accent px-4 py-3 text-sm font-semibold text-accent-contrast transition hover:bg-accent-strong"
                type="button"
                onClick={handleCreateProject}
              >
                Create Project
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <article
                key={project.id}
                className="border border-ui bg-panel p-4 transition hover:border-accent"
              >
                <button
                  className="block w-full text-left"
                  type="button"
                  onClick={() =>
                    router.push(`/dashboard/projects/${project.id}`)
                  }
                >
                  <h3 className="text-lg font-semibold text-primary">
                    {project.name}
                  </h3>
                  <p className="mt-2 min-h-10 text-sm leading-5 text-secondary">
                    {project.description ?? "No description yet."}
                  </p>
                  <p className="mt-4 text-xs text-muted">
                    {project.sceneCount ?? 0} scenes / Updated{" "}
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </button>
                <button
                  className="mt-4 text-xs font-semibold text-danger transition hover:opacity-80"
                  type="button"
                  onClick={() => void handleDeleteProject(project.id)}
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
      {modal}
    </section>
  );
}
