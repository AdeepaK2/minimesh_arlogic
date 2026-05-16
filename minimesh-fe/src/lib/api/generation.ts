import type {
  GenerationClarificationResponse,
  GenerationJobAction,
  GenerationJobResponse,
  GenerateSceneResponse,
  GenerationChatContext,
  SceneDocument,
} from "@/lib/scene/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:3001";

export async function clarifyGenerationPrompt(
  prompt: string,
  accessToken: string,
  chatContext?: GenerationChatContext,
): Promise<GenerationClarificationResponse> {
  const response = await safeFetch(`${API_BASE_URL}/generation/clarify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, chatContext }),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);

    throw new Error(message);
  }

  return (await response.json()) as GenerationClarificationResponse;
}

export async function generateScene(
  prompt: string,
  accessToken: string,
  chatContext?: GenerationChatContext,
): Promise<GenerateSceneResponse> {
  const response = await safeFetch(`${API_BASE_URL}/generation/scene`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, chatContext }),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);

    throw new Error(message);
  }

  return (await response.json()) as GenerateSceneResponse;
}

export async function editScene(
  scene: SceneDocument,
  instruction: string,
  accessToken: string,
  chatContext?: GenerationChatContext,
): Promise<GenerateSceneResponse> {
  const response = await safeFetch(`${API_BASE_URL}/generation/scene-edit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ scene, instruction, chatContext }),
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
  chatContext?: GenerationChatContext,
): Promise<GenerateSceneResponse> {
  const response = await safeFetch(
    `${API_BASE_URL}/generation/entity-refinement`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scene, entityId, instruction, chatContext }),
    },
  );

  if (!response.ok) {
    const message = await readErrorMessage(response);

    throw new Error(message);
  }

  return (await response.json()) as GenerateSceneResponse;
}

export async function createGenerationJob(
  payload:
    | {
        action: Extract<GenerationJobAction, "generate">;
        prompt: string;
        chatContext?: GenerationChatContext;
      }
    | {
        action: Extract<GenerationJobAction, "edit-scene">;
        scene: SceneDocument;
        instruction: string;
        chatContext?: GenerationChatContext;
      }
    | {
        action: Extract<GenerationJobAction, "refine-entity">;
        scene: SceneDocument;
        entityId: string;
        instruction: string;
        chatContext?: GenerationChatContext;
      },
  accessToken: string,
): Promise<GenerationJobResponse> {
  const response = await safeFetch(`${API_BASE_URL}/generation/jobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);

    throw new Error(message);
  }

  return (await response.json()) as GenerationJobResponse;
}

export async function getGenerationJob(
  jobId: string,
  accessToken: string,
): Promise<GenerationJobResponse> {
  const response = await safeFetch(`${API_BASE_URL}/generation/jobs/${jobId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);

    throw new Error(message);
  }

  return (await response.json()) as GenerationJobResponse;
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
