import type {
  SavedScene,
  SceneDocument,
  SceneVersion,
} from "@/lib/scene/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3001";

interface SaveSceneInput {
  name: string;
  description?: string;
  prompt?: string;
  scene: SceneDocument;
  warnings: string[];
}

interface SaveVersionInput {
  prompt?: string;
  scene: SceneDocument;
  warnings: string[];
}

export function listScenes(
  accessToken: string,
  projectId: string,
): Promise<SavedScene[]> {
  return apiFetch(`/projects/${projectId}/scenes`, accessToken);
}

export function listSceneVersions(
  accessToken: string,
  projectId: string,
  sceneId: string,
): Promise<SceneVersion[]> {
  return apiFetch(`/projects/${projectId}/scenes/${sceneId}/versions`, accessToken);
}

export function createSavedScene(
  accessToken: string,
  projectId: string,
  input: SaveSceneInput,
): Promise<SavedScene> {
  return apiFetch(`/projects/${projectId}/scenes`, accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function saveSceneVersion(
  accessToken: string,
  projectId: string,
  sceneId: string,
  input: SaveVersionInput,
): Promise<SavedScene> {
  return apiFetch(`/projects/${projectId}/scenes/${sceneId}/versions`, accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateSavedScene(
  accessToken: string,
  projectId: string,
  sceneId: string,
  input: { name?: string; description?: string | null },
): Promise<SavedScene> {
  return apiFetch(`/projects/${projectId}/scenes/${sceneId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteSavedScene(
  accessToken: string,
  projectId: string,
  sceneId: string,
): Promise<{ id: string }> {
  return apiFetch(`/projects/${projectId}/scenes/${sceneId}`, accessToken, {
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
