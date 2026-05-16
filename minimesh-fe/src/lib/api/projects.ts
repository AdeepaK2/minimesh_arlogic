import type { Project } from "@/lib/scene/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3001";

export function listProjects(accessToken: string): Promise<Project[]> {
  return apiFetch("/projects", accessToken);
}

export function getProject(
  accessToken: string,
  projectId: string,
): Promise<Project> {
  return apiFetch(`/projects/${projectId}`, accessToken);
}

export function createProject(
  accessToken: string,
  input: { name: string; description?: string },
): Promise<Project> {
  return apiFetch("/projects", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProject(
  accessToken: string,
  projectId: string,
  input: { name?: string; description?: string | null },
): Promise<Project> {
  return apiFetch(`/projects/${projectId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteProject(
  accessToken: string,
  projectId: string,
): Promise<{ id: string }> {
  return apiFetch(`/projects/${projectId}`, accessToken, {
    method: "DELETE",
  });
}

async function apiFetch<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await safeFetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as T;
}

async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(
      "Backend API is offline. Start the Nest server on port 3001 and try again.",
    );
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      message?: string | string[];
      error?: string;
    };
    const message = Array.isArray(body.message)
      ? body.message.join(" ")
      : body.message;

    return message ?? body.error ?? `Request failed with ${response.status}.`;
  } catch {
    return `Request failed with ${response.status}.`;
  }
}
