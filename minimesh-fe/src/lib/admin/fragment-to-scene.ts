import type { SceneDocument, SceneObject } from "@/lib/scene/types";

interface SceneFragmentShape {
  objects: SceneObject[];
  lights?: SceneDocument["lights"];
}

export function fragmentToSceneDocument(
  fragment: SceneFragmentShape,
  label = "Fragment Preview",
): SceneDocument {
  return {
    sceneName: label,
    description: "Admin scene builder preview",
    objects: fragment.objects,
    lights: fragment.lights ?? [],
    camera: {
      position: [5, 4, 7],
      target: [0, 0.8, 0],
      fov: 45,
    },
    environment: {
      backgroundColor: "#060a12",
      fogColor: "#060a12",
      fogNear: 14,
      fogFar: 38,
      exposure: 1.15,
    },
  };
}

export function mergeFragments(
  fragments: SceneFragmentShape[],
  label = "Merge Preview",
): SceneDocument {
  const objects: SceneObject[] = [];
  const lights: SceneDocument["lights"] = [];
  let offsetX = 0;

  for (const fragment of fragments) {
    for (const object of fragment.objects) {
      objects.push({
        ...object,
        id: `${object.id}-${offsetX}`,
        position: [
          object.position[0] + offsetX,
          object.position[1],
          object.position[2],
        ],
      });
    }

    for (const light of fragment.lights ?? []) {
      lights.push({
        ...light,
        id: `${light.id}-${offsetX}`,
        position: light.position
          ? [
              light.position[0] + offsetX,
              light.position[1],
              light.position[2],
            ]
          : undefined,
      });
    }

    offsetX += 3.5;
  }

  return fragmentToSceneDocument({ objects, lights }, label);
}
