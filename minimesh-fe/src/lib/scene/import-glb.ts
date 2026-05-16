"use client";

import {
  Box3,
  Color,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { SceneDocument, SceneObject } from "./types";

type PrimitiveType = SceneObject["type"];

interface GlbImportResult {
  scene: SceneDocument;
  objectCount: number;
  skippedCount: number;
  warnings: string[];
}

/**
 * Loads a GLB file and converts each mesh node into a MiniMesh primitive
 * based on its world bounding box and material colour.
 *
 * Limitations:
 *  - Arbitrary geometry is approximated as box/sphere/cylinder/torus/plane.
 *  - Rotation is reset to zero (bounding box is axis-aligned).
 *  - Textures are not supported; only diffuse/base colour is extracted.
 */
export async function importGlbToScene(
  file: File,
): Promise<GlbImportResult> {
  const loader = new GLTFLoader();
  const arrayBuffer = await file.arrayBuffer();

  const gltf = await new Promise<{ scene: Object3D }>(
    (resolve, reject) => {
      loader.parse(
        arrayBuffer,
        "",
        (result) => resolve(result),
        (error) => reject(new Error(String(error))),
      );
    },
  );

  const objects: SceneObject[] = [];
  const entityObjectIds: string[] = [];
  const usedIds = new Set<string>();
  const warnings: string[] = [];
  let skippedCount = 0;
  let index = 0;

  gltf.scene.updateMatrixWorld(true);

  gltf.scene.traverse((node: Object3D) => {
    if (!(node instanceof Mesh)) {
      return;
    }

    // Compute axis-aligned world bounding box.
    const box = new Box3().setFromObject(node);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Skip degenerate / zero-size meshes.
    if (size.x < 0.001 && size.y < 0.001 && size.z < 0.001) {
      skippedCount += 1;
      return;
    }

    // Extract the base/diffuse colour from the material.
    const color = extractColor(node.material);
    const metalness = extractNumber(node.material, "metalness", 0);
    const roughness = extractNumber(node.material, "roughness", 0.55);

    const type = guessPrimitive(size, node.name);
    const scale = primitiveScale(type, size);
    const id = uniqueId(node.name || `object-${index + 1}`, usedIds, index);
    const name = node.name || `Object ${index + 1}`;

    objects.push({
      id,
      name,
      entityId: "imported",
      role: guessRole(node.name),
      type,
      position: [
        round(center.x),
        round(center.y),
        round(center.z),
      ],
      rotation: [0, 0, 0],
      scale,
      material: { color, metalness, roughness },
    });

    entityObjectIds.push(id);
    index += 1;
  });

  if (objects.length === 0) {
    throw new Error(
      "No meshes found in the GLB file. The file may be empty or use unsupported node types.",
    );
  }

  if (objects.length > 48) {
    warnings.push(
      `GLB contained ${objects.length} meshes. Only the first 48 are included.`,
    );
    objects.splice(48);
    entityObjectIds.splice(48);
  }

  // Compute a bounding box of the whole scene to place the camera.
  const allPositions = objects.map((o) => o.position);
  const sceneCenter = centroid(allPositions);
  const maxDim = objects.reduce((max, o) => {
    const d = Math.sqrt(
      o.scale[0] ** 2 + o.scale[1] ** 2 + o.scale[2] ** 2,
    );
    return Math.max(max, d);
  }, 1);
  const camDist = Math.min(Math.max(maxDim * 2.5, 4), 20);

  const sceneDocument: SceneDocument = {
    sceneName: file.name.replace(/\.[^.]+$/, "") || "Imported GLB",
    description: `Converted from ${file.name}. Each mesh is approximated as a MiniMesh primitive.`,
    objects,
    entities: [
      {
        id: "imported",
        name: "Imported model",
        description: `Imported from ${file.name}`,
        objectIds: entityObjectIds,
        tags: ["imported", "glb"],
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      },
    ],
    lights: [
      { id: "ambient", type: "ambient", color: "#ffffff", intensity: 0.5 },
      {
        id: "key",
        type: "directional",
        color: "#ffffff",
        intensity: 2,
        position: [4, 6, 5],
      },
    ],
    camera: {
      position: [
        round(sceneCenter[0] + camDist),
        round(sceneCenter[1] + camDist * 0.55),
        round(sceneCenter[2] + camDist),
      ],
      target: sceneCenter,
      fov: 50,
    },
  };

  return {
    scene: sceneDocument,
    objectCount: objects.length,
    skippedCount,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Chooses the closest primitive type from the bounding-box aspect ratios
 * and the node name.
 */
function guessPrimitive(size: Vector3, name: string): PrimitiveType {
  const lowerName = name.toLowerCase();

  if (
    /wheel|tire|ring|torus|donut|disc|disk|circle/.test(lowerName)
  ) {
    return "torus";
  }

  if (/sphere|ball|orb|globe/.test(lowerName)) {
    return "sphere";
  }

  if (/cone|spike|tip|peak/.test(lowerName)) {
    return "cone";
  }

  if (
    /cylinder|pipe|pole|rod|mast|tube|barrel|pillar|column|post/.test(
      lowerName,
    )
  ) {
    return "cylinder";
  }

  if (/plane|floor|ground|road|surface|terrain/.test(lowerName)) {
    return "plane";
  }

  // Use aspect ratio as a secondary heuristic.
  const dims = [size.x, size.y, size.z].sort((a, b) => b - a);
  const ratio = dims[0] / Math.max(dims[2], 0.001);

  // Very flat → plane
  if (size.y < 0.05 * Math.max(size.x, size.z)) {
    return "plane";
  }

  // Tall and narrow → cylinder
  if (size.y > 2.5 * size.x && size.y > 2.5 * size.z) {
    return "cylinder";
  }

  // Roughly equal sides → sphere
  if (ratio < 1.4) {
    return "sphere";
  }

  return "box";
}

/**
 * Returns scale that makes the chosen primitive fill the bounding box.
 */
function primitiveScale(
  type: PrimitiveType,
  size: Vector3,
): [number, number, number] {
  const sx = Math.max(size.x, 0.01);
  const sy = Math.max(size.y, 0.01);
  const sz = Math.max(size.z, 0.01);

  switch (type) {
    case "sphere": {
      // SphereGeometry radius = 0.5 → scale = diameter
      const d = Math.max(sx, sy, sz);
      return [round(d), round(d), round(d)];
    }
    case "cylinder":
      // CylinderGeometry: radius 0.5, height 1
      return [round(Math.max(sx, sz)), round(sy), round(Math.max(sx, sz))];
    case "cone":
      return [round(Math.max(sx, sz)), round(sy), round(Math.max(sx, sz))];
    case "torus": {
      // TorusGeometry: outer radius 0.45 → treat largest horizontal as diameter
      const r = Math.max(sx, sz);
      return [round(r), round(r), round(Math.min(sy, r * 0.35))];
    }
    case "plane":
      return [round(sx), round(sz), 1];
    default:
      return [round(sx), round(sy), round(sz)];
  }
}

function guessRole(name: string): string {
  const lower = name.toLowerCase();
  if (/wheel|tire|torus/.test(lower)) return "wheel";
  if (/window|glass|windshield/.test(lower)) return "window";
  if (/light|lamp|glow/.test(lower)) return "light";
  if (/body|frame|hull/.test(lower)) return "body";
  if (/floor|ground|road|plane/.test(lower)) return "ground";
  return "part";
}

function extractColor(material: unknown): string {
  if (!material || typeof material !== "object") {
    return "#38bdf8";
  }

  const mat = material as MeshStandardMaterial;
  const color = mat.color;

  if (color instanceof Color) {
    const hex = "#" + color.getHexString();
    // Skip near-white defaults that are likely unset
    if (hex === "#ffffff" || hex === "#fefefe" || hex === "#fdfdfd") {
      return "#38bdf8";
    }
    return hex;
  }

  return "#38bdf8";
}

function extractNumber(
  material: unknown,
  key: "metalness" | "roughness",
  fallback: number,
): number {
  if (!material || typeof material !== "object") {
    return fallback;
  }

  const value = (material as Record<string, unknown>)[key];

  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function uniqueId(rawName: string, used: Set<string>, index: number): string {
  const base =
    rawName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || `object-${index + 1}`;

  let candidate = base;
  let suffix = 2;

  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  used.add(candidate);
  return candidate;
}

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function centroid(
  positions: [number, number, number][],
): [number, number, number] {
  if (positions.length === 0) return [0, 0, 0];

  let x = 0, y = 0, z = 0;
  for (const [px, py, pz] of positions) {
    x += px; y += py; z += pz;
  }
  const n = positions.length;
  return [round(x / n), round(y / n), round(z / n)];
}

