import type { SceneDocument } from "./types";

export function summarizeSceneChanges(
  previousScene: SceneDocument | null,
  nextScene: SceneDocument,
): string {
  if (!previousScene) {
    return `Changes: created scene with ${nextScene.objects.length} objects, ${nextScene.lights.length} lights.`;
  }

  const summaryParts = [
    countChange("objects", previousScene.objects.length, nextScene.objects.length),
    countChange(
      "entities",
      previousScene.entities?.length ?? 0,
      nextScene.entities?.length ?? 0,
    ),
    countChange("lights", previousScene.lights.length, nextScene.lights.length),
  ].filter(Boolean);
  const updatedParts = [
    changedObjectCount(previousScene, nextScene),
    changedEntityCount(previousScene, nextScene),
  ].filter(Boolean);
  const sceneLevelChanges = [
    hasChanged(previousScene.camera, nextScene.camera) ? "camera updated" : "",
    hasChanged(previousScene.environment, nextScene.environment)
      ? "environment updated"
      : "",
  ].filter(Boolean);
  const parts = [...summaryParts, ...updatedParts, ...sceneLevelChanges];

  return parts.length > 0 ? `Changes: ${parts.join(", ")}.` : "Changes: scene updated.";
}

function countChange(label: string, before: number, after: number): string {
  const difference = after - before;

  if (difference === 0) {
    return "";
  }

  return `${difference > 0 ? "+" : ""}${difference} ${label}`;
}

function changedObjectCount(
  previousScene: SceneDocument,
  nextScene: SceneDocument,
): string {
  const previousObjects = new Map(
    previousScene.objects.map((object) => [object.id, object]),
  );
  const updatedCount = nextScene.objects.filter((object) => {
    const previousObject = previousObjects.get(object.id);

    return previousObject && hasChanged(previousObject, object);
  }).length;

  return updatedCount > 0 ? `${updatedCount} objects updated` : "";
}

function changedEntityCount(
  previousScene: SceneDocument,
  nextScene: SceneDocument,
): string {
  const previousEntities = new Map(
    (previousScene.entities ?? []).map((entity) => [entity.id, entity]),
  );
  const updatedCount = (nextScene.entities ?? []).filter((entity) => {
    const previousEntity = previousEntities.get(entity.id);

    return previousEntity && hasChanged(previousEntity, entity);
  }).length;

  return updatedCount > 0 ? `${updatedCount} entities updated` : "";
}

function hasChanged(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) !== JSON.stringify(right);
}
