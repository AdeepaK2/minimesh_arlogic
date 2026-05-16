import { OBJECT_TEMPLATE_CATEGORIES } from "@/lib/admin/object-template-types";

export function normalizeCategory(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 64);
}

export function buildCategoryOptions(
  templateCategories: string[] = [],
): string[] {
  const merged = new Set<string>([...OBJECT_TEMPLATE_CATEGORIES]);

  for (const category of templateCategories) {
    const normalized = normalizeCategory(category);
    if (normalized) {
      merged.add(normalized);
    }
  }

  return Array.from(merged).sort((a, b) => a.localeCompare(b));
}

export function isKnownCategory(
  value: string,
  options: string[],
): boolean {
  const normalized = normalizeCategory(value);
  return options.includes(normalized);
}
