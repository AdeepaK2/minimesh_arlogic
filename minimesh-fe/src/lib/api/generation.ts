import type { GenerateSceneResponse, SceneDocument } from "@/lib/scene/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:3001";

export async function generateScene(
  prompt: string,
  accessToken: string,
): Promise<GenerateSceneResponse> {
  const response = await safeFetch(`${API_BASE_URL}/generation/scene`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);

    throw new Error(message);
  }

  return (await response.json()) as GenerateSceneResponse;
}

export async function refineEntity(
  scene: SceneDocument,
  entityId: string,
  instruction: string,
  accessToken: string,
): Promise<GenerateSceneResponse> {
  const response = await safeFetch(
    `${API_BASE_URL}/generation/entity-refinement`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scene, entityId, instruction }),
    },
  );

  if (!response.ok) {
    const message = await readErrorMessage(response);

    throw new Error(message);
  }

  return (await response.json()) as GenerateSceneResponse;
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
