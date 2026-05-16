import type {
  CreateObjectTemplateInput,
  ObjectTemplateRecord,
  ObjectTemplateSearchHit,
} from "@/lib/admin/object-template-types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:3001";

export function listObjectTemplates(
  accessToken: string,
): Promise<ObjectTemplateRecord[]> {
  return apiFetch("/admin/object-templates", accessToken);
}

export function createObjectTemplate(
  accessToken: string,
  input: CreateObjectTemplateInput,
): Promise<ObjectTemplateRecord> {
  return apiFetch("/admin/object-templates", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateObjectTemplate(
  accessToken: string,
  id: string,
  input: CreateObjectTemplateInput,
): Promise<ObjectTemplateRecord> {
  return apiFetch(`/admin/object-templates/${id}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteObjectTemplate(
  accessToken: string,
  id: string,
): Promise<{ deleted: true; id: string }> {
  return apiFetch(`/admin/object-templates/${id}`, accessToken, {
    method: "DELETE",
  });
}

export function searchObjectTemplates(
  accessToken: string,
  query: string,
  limit = 8,
): Promise<ObjectTemplateSearchHit[]> {
  return apiFetch("/admin/object-templates/search", accessToken, {
    method: "POST",
    body: JSON.stringify({ query, limit }),
  });
}

async function apiFetch<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new Error(
      `Cannot reach the API at ${API_BASE_URL}. Start the backend (minimesh-be: npm run start:dev) and use the same host as the app (localhost vs 127.0.0.1).`,
    );
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string; issues?: unknown[] }
      | null;
    const issueHint =
      Array.isArray(payload?.issues) && payload.issues.length > 0
        ? ` (${payload.issues.length} validation issue(s))`
        : "";
    throw new Error(
      (payload?.message ?? `Request failed (${response.status}).`) + issueHint,
    );
  }

  return (await response.json()) as T;
}
