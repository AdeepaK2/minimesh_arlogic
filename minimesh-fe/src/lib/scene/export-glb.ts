"use client";

import {
  AmbientLight,
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  SphereGeometry,
  TorusGeometry,
} from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { SceneDocument, SceneObject } from "./types";

export async function exportSceneToGlb(sceneDocument: SceneDocument) {
  const scene = buildThreeScene(sceneDocument);
  const exporter = new GLTFExporter();
  const glb = await exporter.parseAsync(scene, { binary: true });
  const blob = new Blob([glb as ArrayBuffer], { type: "model/gltf-binary" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${toFileSlug(sceneDocument.sceneName)}.glb`;
  link.click();
  URL.revokeObjectURL(url);
}

function buildThreeScene(sceneDocument: SceneDocument): Scene {
  const scene = new Scene();

  sceneDocument.objects.forEach((object) => {
    scene.add(createMesh(object));
  });

  sceneDocument.lights.forEach((light) => {
    if (light.type === "ambient") {
      scene.add(new AmbientLight(light.color, light.intensity));
      return;
    }

    const lightObject =
      light.type === "point"
        ? new PointLight(light.color, light.intensity)
        : new DirectionalLight(light.color, light.intensity);

    lightObject.position.set(...(light.position ?? [4, 6, 5]));
    scene.add(lightObject);
  });

  const camera = new PerspectiveCamera(sceneDocument.camera.fov, 1, 0.1, 1000);
  camera.position.set(...sceneDocument.camera.position);
  camera.lookAt(...sceneDocument.camera.target);
  scene.add(camera);

  return scene;
}

function createMesh(object: SceneObject): Object3D {
  const mesh = new Mesh(
    createGeometry(object),
    new MeshStandardMaterial({
      color: object.material.color,
      metalness: object.material.metalness ?? 0,
      roughness: object.material.roughness ?? 0.55,
    }),
  );

  mesh.name = object.name;
  mesh.position.set(...object.position);
  mesh.rotation.set(...object.rotation);
  mesh.scale.set(...object.scale);

  return mesh;
}

function createGeometry(object: SceneObject) {
  switch (object.type) {
    case "box":
      return new BoxGeometry(1, 1, 1);
    case "sphere":
      return new SphereGeometry(0.5, 48, 32);
    case "cylinder":
      return new CylinderGeometry(0.5, 0.5, 1, 48);
    case "cone":
      return new ConeGeometry(0.5, 1, 48);
    case "torus":
      return new TorusGeometry(0.45, 0.14, 24, 64);
    case "plane":
      return new PlaneGeometry(1, 1);
  }
}

function toFileSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "minimesh-scene"
  );
}
