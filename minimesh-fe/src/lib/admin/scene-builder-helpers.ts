import type { ObjectTemplateRecord } from "@/lib/admin/object-template-types";

export function formatSceneJson(raw: string): string {
  const parsed = JSON.parse(raw) as unknown;
  return `${JSON.stringify(parsed, null, 2)}\n`;
}

export function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

export function autoSuggestTags(input: {
  name: string;
  description: string;
  category: string;
  semanticKeywords: string;
  sceneJson: string;
}): string[] {
  const tags = new Set<string>();

  for (const token of tokenize(
    `${input.name} ${input.description} ${input.category} ${input.semanticKeywords}`,
  )) {
    tags.add(token);
  }

  try {
    const parsed = JSON.parse(input.sceneJson) as {
      objects?: { name?: string; type?: string; role?: string }[];
    };

    for (const object of parsed.objects ?? []) {
      for (const token of tokenize(
        `${object.name ?? ""} ${object.type ?? ""} ${object.role ?? ""}`,
      )) {
        tags.add(token);
      }
    }
  } catch {
    // ignore invalid JSON during auto-tag
  }

  return Array.from(tags).slice(0, 16);
}

export function scoreTemplateRelevance(
  template: ObjectTemplateRecord,
  query: string,
): number {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) {
    return 0;
  }

  const haystack = tokenize(
    `${template.name} ${template.category} ${template.description} ${template.tags.join(" ")}`,
  );

  let score = 0;
  for (const token of haystack) {
    if (queryTokens.has(token)) {
      score += 1;
    }
  }

  return Math.min(0.99, score / queryTokens.size);
}

export const PIPELINE_EXAMPLE = {
  prompt: "bird sitting in tree",
  matches: ["bird_fragment_v2", "pine_tree_large", "branch_asset_pack"],
};

export const ARCHITECTURE_NODES = [
  { label: "PostgreSQL", detail: "object_templates" },
  { label: "pgvector", detail: "384-dim cosine" },
  { label: "Embedding pipeline", detail: "hash / future model" },
  { label: "Scene fragments", detail: "JSON storage" },
  { label: "Generation engine", detail: "MiniMax + assembly" },
];
