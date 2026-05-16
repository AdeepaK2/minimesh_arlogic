import type {
  SceneDocument,
  SceneEntity,
  SceneEntityTransform,
  SceneObject,
  Vector3Tuple,
} from "./types";

const identityTransform: SceneEntityTransform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
};

export function getSceneEntities(scene: SceneDocument): SceneEntity[] {
  if (scene.entities && scene.entities.length > 0) {
    return scene.entities.map((entity) => ({
      ...entity,
      tags: entity.tags ?? [],
      transform: entity.transform ?? identityTransform,
    }));
  }

  return scene.objects.map((object) => ({
    id: object.entityId ?? object.id,
    name: object.name,
    description: `${object.name} selectable entity`,
    sourceGroupId: object.entityId ?? object.id,
    objectIds: [object.id],
    tags: [object.type],
    transform: identityTransform,
  }));
}

export function getObjectEntityId(object: SceneObject): string {
  return object.entityId ?? object.id;
}

export function getEntityObjectIds(
  scene: SceneDocument,
  entityId: string | null,
): Set<string> {
  if (!entityId) {
    return new Set();
  }

  const entity = getSceneEntities(scene).find((item) => item.id === entityId);

  if (entity) {
    return new Set(entity.objectIds);
  }

  return new Set(
    scene.objects
      .filter((object) => getObjectEntityId(object) === entityId)
      .map((object) => object.id),
  );
}

export function isStaticSceneEntity(
  scene: SceneDocument,
  entity: SceneEntity | null,
): boolean {
  if (!entity) {
    return false;
  }

  const text =
    `${entity.id} ${entity.name} ${entity.description ?? ""} ${entity.tags.join(" ")}`.toLowerCase();
  const objectIds = new Set(entity.objectIds);
  const objects = scene.objects.filter((object) => objectIds.has(object.id));
  const hasStaticName = [
    "ground",
    "floor",
    "road",
    "street",
    "terrain",
    "platform",
    "environment",
  ].some((token) => text.includes(token));
  const hasLargePlane = objects.some(
    (object) =>
      object.type === "plane" &&
      Math.max(object.scale[0], object.scale[1], object.scale[2]) >= 5,
  );

  return hasStaticName || hasLargePlane;
}

export function applyEntityTransform(
  scene: SceneDocument,
  entityId: string,
  nextTransform: SceneEntityTransform,
): SceneDocument {
  const entities = getSceneEntities(scene);
  const entity = entities.find((item) => item.id === entityId);

  if (!entity) {
    return scene;
  }

  const previous = entity.transform ?? identityTransform;
  const objectIds = new Set(entity.objectIds);
  const positionDelta = vectorDelta(nextTransform.position, previous.position);
  const rotationDelta = vectorDelta(nextTransform.rotation, previous.rotation);
  const scaleRatio = safeScaleRatio(nextTransform.scale, previous.scale);

  return {
    ...scene,
    objects: scene.objects.map((object) => {
      if (!objectIds.has(object.id)) {
        return object;
      }

      return {
        ...object,
        position: addVector(object.position, positionDelta),
        rotation: addVector(object.rotation, rotationDelta),
        scale: multiplyVector(object.scale, scaleRatio),
      };
    }),
    entities: entities.map((item) =>
      item.id === entityId ? { ...item, transform: nextTransform } : item,
    ),
  };
}

export function resetEntityTransform(
  scene: SceneDocument,
  entityId: string,
): SceneDocument {
  return applyEntityTransform(scene, entityId, identityTransform);
}

export function focusCameraOnEntity(
  scene: SceneDocument,
  entityId: string,
): SceneDocument {
  const objectIds = getEntityObjectIds(scene, entityId);
  const selectedObjects = scene.objects.filter((object) =>
    objectIds.has(object.id),
  );

  if (selectedObjects.length === 0) {
    return scene;
  }

  const center = averagePosition(selectedObjects);

  return {
    ...scene,
    camera: {
      ...scene.camera,
      position: [center[0] + 4, center[1] + 2.5, center[2] + 4.5],
      target: center,
    },
  };
}

export type ViewPreset = "home" | "top" | "front" | "right" | "fit";

export function applyViewPreset(
  scene: SceneDocument,
  preset: ViewPreset,
  selectedEntityId: string | null,
): SceneDocument {
  if (preset === "fit" && selectedEntityId) {
    return focusCameraOnEntity(scene, selectedEntityId);
  }

  const target: Vector3Tuple = scene.camera.target ?? [0, 0.5, 0];

  if (preset === "top") {
    return {
      ...scene,
      camera: {
        ...scene.camera,
        position: [target[0], target[1] + 9, target[2] + 0.01],
        target,
        fov: 45,
      },
    };
  }

  if (preset === "front") {
    return {
      ...scene,
      camera: {
        ...scene.camera,
        position: [target[0], target[1] + 1.8, target[2] + 9],
        target,
        fov: 45,
      },
    };
  }

  if (preset === "right") {
    return {
      ...scene,
      camera: {
        ...scene.camera,
        position: [target[0] + 9, target[1] + 1.8, target[2]],
        target,
        fov: 45,
      },
    };
  }

  return {
    ...scene,
    camera: {
      position: [6.5, 3.2, 6.8],
      target: [0, 0.85, 0],
      fov: 44,
    },
  };
}

function vectorDelta(next: Vector3Tuple, previous: Vector3Tuple): Vector3Tuple {
  return [next[0] - previous[0], next[1] - previous[1], next[2] - previous[2]];
}

function addVector(value: Vector3Tuple, delta: Vector3Tuple): Vector3Tuple {
  return [value[0] + delta[0], value[1] + delta[1], value[2] + delta[2]];
}

function multiplyVector(
  value: Vector3Tuple,
  ratio: Vector3Tuple,
): Vector3Tuple {
  return [
    Math.max(0.01, value[0] * ratio[0]),
    Math.max(0.01, value[1] * ratio[1]),
    Math.max(0.01, value[2] * ratio[2]),
  ];
}

function safeScaleRatio(
  next: Vector3Tuple,
  previous: Vector3Tuple,
): Vector3Tuple {
  return [
    next[0] / Math.max(0.01, previous[0]),
    next[1] / Math.max(0.01, previous[1]),
    next[2] / Math.max(0.01, previous[2]),
  ];
}

function averagePosition(objects: SceneObject[]): Vector3Tuple {
  const total = objects.reduce<Vector3Tuple>(
    (sum, object) => [
      sum[0] + object.position[0],
      sum[1] + object.position[1],
      sum[2] + object.position[2],
    ],
    [0, 0, 0],
  );

  return [
    total[0] / objects.length,
    total[1] / objects.length,
    total[2] / objects.length,
  ];
}
