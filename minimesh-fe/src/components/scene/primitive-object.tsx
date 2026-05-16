"use client";

import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import { useRef } from "react";
import type { Mesh } from "three";
import type { SceneObject } from "@/lib/scene/types";

interface PrimitiveObjectProps {
  isSelected?: boolean;
  object: SceneObject;
  onSelect?: () => void;
}

export function PrimitiveObject({
  isSelected = false,
  object,
  onSelect,
}: PrimitiveObjectProps) {
  const meshRef = useRef<Mesh>(null);
  const basePosition = object.position;
  const baseScale = object.scale;

  useFrame(({ clock }) => {
    const mesh = meshRef.current;

    if (!mesh || !object.animation) {
      return;
    }

    const speed = object.animation.speed ?? 1;
    const elapsed = clock.getElapsedTime() * speed;

    if (object.animation.type === "rotate") {
      const axis = object.animation.axis ?? "y";
      mesh.rotation[axis] = object.rotation[axisIndex(axis)] + elapsed;
    }

    if (object.animation.type === "bounce") {
      mesh.position.y = basePosition[1] + Math.sin(elapsed * 2) * 0.25;
    }

    if (object.animation.type === "pulse") {
      const amount = 1 + Math.sin(elapsed * 2) * 0.08;
      mesh.scale.set(
        baseScale[0] * amount,
        baseScale[1] * amount,
        baseScale[2] * amount,
      );
    }

    if (object.animation.type === "orbit") {
      const radius = Math.max(
        0.6,
        Math.hypot(basePosition[0], basePosition[2]),
      );
      mesh.position.x = Math.cos(elapsed) * radius;
      mesh.position.z = Math.sin(elapsed) * radius;
    }

    if (object.animation.type === "open_close") {
      mesh.scale.y = baseScale[1] * (0.75 + Math.abs(Math.sin(elapsed)) * 0.25);
    }
  });

  return (
    <mesh
      ref={meshRef}
      name={object.name}
      position={object.position}
      rotation={object.rotation}
      scale={object.scale}
      castShadow
      receiveShadow
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.();
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
    >
      <PrimitiveGeometry type={object.type} />
      <meshStandardMaterial
        color={object.material.color}
        emissive={
          isSelected
            ? (object.material.emissive ?? "#38bdf8")
            : (object.material.emissive ?? "#000000")
        }
        emissiveIntensity={
          isSelected
            ? Math.max(0.6, object.material.emissiveIntensity ?? 0)
            : (object.material.emissiveIntensity ?? 0)
        }
        metalness={object.material.metalness ?? 0}
        roughness={object.material.roughness ?? 0.55}
      />
      {isSelected ? <Edges color="#38bdf8" scale={1.03} /> : null}
    </mesh>
  );
}

function PrimitiveGeometry({ type }: { type: SceneObject["type"] }) {
  switch (type) {
    case "box":
      return <boxGeometry args={[1, 1, 1]} />;
    case "sphere":
      return <sphereGeometry args={[0.5, 48, 32]} />;
    case "cylinder":
      return <cylinderGeometry args={[0.5, 0.5, 1, 48]} />;
    case "cone":
      return <coneGeometry args={[0.5, 1, 48]} />;
    case "torus":
      return <torusGeometry args={[0.45, 0.14, 24, 64]} />;
    case "plane":
      return <planeGeometry args={[1, 1]} />;
  }
}

function axisIndex(axis: "x" | "y" | "z") {
  return axis === "x" ? 0 : axis === "y" ? 1 : 2;
}
