import type { SceneDocument } from "./types";

export const sampleScene: SceneDocument = {
  sceneName: "MiniMesh Starter",
  description: "A small generated-style scene ready for prompt replacement.",
  objects: [
    {
      id: "base-platform",
      name: "Base platform",
      type: "cylinder",
      position: [0, 0.15, 0],
      rotation: [0, 0, 0],
      scale: [2.8, 0.3, 2.8],
      material: {
        color: "#4b5563",
        roughness: 0.75,
      },
    },
    {
      id: "core-orb",
      name: "Core orb",
      type: "sphere",
      position: [0, 1.35, 0],
      rotation: [0, 0, 0],
      scale: [0.85, 0.85, 0.85],
      material: {
        color: "#38bdf8",
        metalness: 0.1,
        roughness: 0.35,
      },
      animation: {
        type: "pulse",
        speed: 1,
        loop: true,
      },
    },
    {
      id: "left-fin",
      name: "Left fin",
      type: "cone",
      position: [-1.35, 0.95, 0],
      rotation: [0, 0, -0.45],
      scale: [0.45, 1.1, 0.45],
      material: {
        color: "#f97316",
        roughness: 0.5,
      },
    },
    {
      id: "right-fin",
      name: "Right fin",
      type: "cone",
      position: [1.35, 0.95, 0],
      rotation: [0, 0, 0.45],
      scale: [0.45, 1.1, 0.45],
      material: {
        color: "#22c55e",
        roughness: 0.5,
      },
    },
  ],
  lights: [
    {
      id: "ambient-main",
      type: "ambient",
      color: "#ffffff",
      intensity: 0.5,
    },
    {
      id: "key-light",
      type: "directional",
      color: "#ffffff",
      intensity: 2,
      position: [4, 6, 5],
    },
  ],
  camera: {
    position: [5, 4, 7],
    target: [0, 0.8, 0],
    fov: 45,
  },
};
