import type {
  ApprovedReference,
  ApprovedReferenceType,
  SceneDocument,
  SceneFragment,
} from "@/lib/scene/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:3001";

interface ApproveReferenceInput {
  referenceType: ApprovedReferenceType;
  name: string;
  category: string;
  description: string;
  tags: string[];
  fragment?: SceneFragment;
  scene?: SceneDocument;
  sourceSceneId?: string;
}

export function approveReference(
  accessToken: string,
  input: ApproveReferenceInput,
): Promise<ApprovedReference> {
  return apiFetch("/templates/approved-references", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
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
