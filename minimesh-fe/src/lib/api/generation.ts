import type { GenerateSceneResponse } from "@/lib/scene/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3001";

export async function generateScene(
  prompt: string,
): Promise<GenerateSceneResponse> {
  const response = await fetch(`${API_BASE_URL}/generation/scene`, {
    method: "POST",
    headers: {
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
