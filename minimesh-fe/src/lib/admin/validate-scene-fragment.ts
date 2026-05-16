import type { SceneLight, SceneObject } from "@/lib/scene/types";

const OBJECT_TYPES = new Set([
  "box",
  "sphere",
  "cylinder",
  "cone",
  "torus",
  "plane",
]);

const LIGHT_TYPES = new Set(["ambient", "directional", "point"]);

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

function isVector3(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

function validateMaterial(
  material: unknown,
  path: string,
  issues: string[],
): void {
  if (!material || typeof material !== "object") {
    issues.push(`${path}: material is required.`);
    return;
  }

  const record = material as Record<string, unknown>;

  if (typeof record.color !== "string" || !HEX_COLOR.test(record.color)) {
    issues.push(`${path}: material.color must be a hex color like #38bdf8.`);
  }
}

function validateObject(
  object: unknown,
  index: number,
  issues: string[],
): void {
  const path = `objects[${index}]`;

  if (!object || typeof object !== "object") {
    issues.push(`${path}: must be an object.`);
    return;
  }

  const record = object as Record<string, unknown>;

  if (typeof record.id !== "string" || !record.id.trim()) {
    issues.push(`${path}.id is required.`);
  }

  if (typeof record.name !== "string" || !record.name.trim()) {
    issues.push(`${path}.name is required.`);
  }

  if (typeof record.type !== "string" || !OBJECT_TYPES.has(record.type)) {
    issues.push(
      `${path}.type must be one of: box, sphere, cylinder, cone, torus, plane.`,
    );
  }

  if (!isVector3(record.position)) {
    issues.push(`${path}.position must be [x, y, z].`);
  }

  if (!isVector3(record.rotation)) {
    issues.push(`${path}.rotation must be [x, y, z].`);
  }

  if (
    !isVector3(record.scale) ||
    record.scale.some((value) => value <= 0)
  ) {
    issues.push(`${path}.scale must be [x, y, z] with positive values.`);
  }

  validateMaterial(record.material, `${path}.material`, issues);
}

function validateLight(light: unknown, index: number, issues: string[]): void {
  const path = `lights[${index}]`;

  if (!light || typeof light !== "object") {
    issues.push(`${path}: must be an object.`);
    return;
  }

  const record = light as Record<string, unknown>;

  if (typeof record.id !== "string" || !record.id.trim()) {
    issues.push(`${path}.id is required.`);
  }

  if (typeof record.type !== "string" || !LIGHT_TYPES.has(record.type)) {
    issues.push(`${path}.type must be ambient, directional, or point.`);
  }

  if (
    record.color !== undefined &&
    (typeof record.color !== "string" || !HEX_COLOR.test(record.color))
  ) {
    issues.push(`${path}.color must be a hex color.`);
  }
}

export function validateSceneFragmentJson(
  raw: string,
):
  | { ok: true; value: { objects: SceneObject[]; lights: SceneLight[] } }
  | { ok: false; issues: string[] } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, issues: ["Scene JSON must be valid JSON."] };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, issues: ["Scene JSON must be an object."] };
  }

  const record = parsed as Record<string, unknown>;
  const issues: string[] = [];

  if (!Array.isArray(record.objects) || record.objects.length === 0) {
    issues.push("At least one object is required in objects[].");
  } else if (record.objects.length > 24) {
    issues.push("A fragment can contain at most 24 objects.");
  } else {
    record.objects.forEach((object, index) => validateObject(object, index, issues));
  }

  const lights = record.lights ?? [];

  if (!Array.isArray(lights)) {
    issues.push("lights must be an array when provided.");
  } else if (lights.length > 4) {
    issues.push("A fragment can contain at most 4 lights.");
  } else {
    lights.forEach((light, index) => validateLight(light, index, issues));
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      objects: record.objects as SceneObject[],
      lights: (Array.isArray(lights) ? lights : []) as SceneLight[],
    },
  };
}
