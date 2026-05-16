"use client";

import { Box, Edges, Grid, OrbitControls, Stats } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { ACESFilmicToneMapping, MOUSE } from "three";
import { PrimitiveObject } from "@/components/scene/primitive-object";
import type { SceneDocument, SceneLight, SceneObject } from "@/lib/scene/types";

interface FragmentPreviewViewportProps {
  scene: SceneDocument | null;
  showWireframe: boolean;
  showBounds: boolean;
  showLighting: boolean;
  showGrid: boolean;
}

export function FragmentPreviewViewport({
  scene,
  showWireframe,
  showBounds,
  showLighting,
  showGrid,
}: FragmentPreviewViewportProps) {
  if (!scene) {
    return (
      <div className="admin-viewport-bg grid h-full min-h-[420px] place-items-center border border-cyan-500/10">
        <div className="max-w-xs text-center">
          <p className="text-sm font-medium text-cyan-200/80">Live 3D Preview</p>
          <p className="mt-2 text-xs leading-5 text-landing-subtle">
            Validate JSON and click Generate Preview to render the fragment in-browser.
          </p>
        </div>
      </div>
    );
  }

  const environment = scene.environment ?? {
    backgroundColor: "#060a12",
    fogColor: "#060a12",
    fogNear: 14,
    fogFar: 38,
    exposure: 1.15,
  };

  const bounds = useMemo(() => computeBounds(scene.objects), [scene.objects]);

  return (
    <div className="admin-viewport-bg relative h-full min-h-[420px] overflow-hidden border border-cyan-500/20 shadow-[inset_0_0_80px_rgba(34,211,238,0.06)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
      <Canvas
        shadows
        gl={{ toneMapping: ACESFilmicToneMapping, antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = environment.exposure;
        }}
        camera={{
          position: scene.camera.position,
          fov: scene.camera.fov,
          near: 0.1,
          far: 1000,
        }}
      >
        <color attach="background" args={[environment.backgroundColor]} />
        <fog
          attach="fog"
          args={[environment.fogColor, environment.fogNear, environment.fogFar]}
        />
        {showLighting ? (
          <SceneLights lights={scene.lights} />
        ) : (
          <>
            <ambientLight intensity={0.35} />
            <directionalLight position={[5, 8, 4]} intensity={0.5} />
          </>
        )}
        {showGrid ? (
          <Grid
            args={[24, 24]}
            cellColor="#1e3a4a"
            sectionColor="#22d3ee"
            sectionThickness={0.6}
            fadeDistance={28}
            infiniteGrid
          />
        ) : null}
        <group>
          {scene.objects.map((object) => (
            <PreviewObject
              key={object.id}
              object={object}
              wireframe={showWireframe}
            />
          ))}
        </group>
        {showBounds ? <BoundsBox bounds={bounds} /> : null}
        <OrbitControls
          makeDefault
          target={scene.camera.target}
          enableDamping
          dampingFactor={0.08}
          minDistance={1}
          maxDistance={60}
          mouseButtons={{
            LEFT: MOUSE.ROTATE,
            MIDDLE: MOUSE.DOLLY,
            RIGHT: MOUSE.PAN,
          }}
        />
        <Stats className="!left-auto !right-2 !top-2 !bottom-auto" />
      </Canvas>
    </div>
  );
}

function PreviewObject({
  object,
  wireframe,
}: {
  object: SceneObject;
  wireframe: boolean;
}) {
  if (!wireframe) {
    return <PrimitiveObject object={object} />;
  }

  return (
    <group position={object.position} rotation={object.rotation} scale={object.scale}>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.85} />
        <Edges color="#67e8f9" />
      </mesh>
    </group>
  );
}

function BoundsBox({
  bounds,
}: {
  bounds: { min: [number, number, number]; max: [number, number, number] };
}) {
  const size: [number, number, number] = [
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  ];
  const center: [number, number, number] = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];

  return (
    <Box position={center} args={size}>
      <meshBasicMaterial color="#a855f7" wireframe transparent opacity={0.35} />
    </Box>
  );
}

function SceneLights({ lights }: { lights: SceneLight[] }) {
  if (lights.length === 0) {
    return (
      <>
        <ambientLight intensity={0.45} />
        <directionalLight position={[4, 6, 5]} intensity={1.8} castShadow />
        <pointLight position={[-3, 4, 2]} color="#22d3ee" intensity={0.8} />
      </>
    );
  }

  return (
    <>
      {lights.map((light) => {
        if (light.type === "ambient") {
          return (
            <ambientLight
              key={light.id}
              color={light.color}
              intensity={light.intensity}
            />
          );
        }

        if (light.type === "point") {
          return (
            <pointLight
              key={light.id}
              color={light.color}
              intensity={light.intensity}
              position={light.position ?? [4, 4, 4]}
            />
          );
        }

        return (
          <directionalLight
            key={light.id}
            color={light.color}
            intensity={light.intensity}
            position={light.position ?? [4, 6, 5]}
            castShadow
          />
        );
      })}
    </>
  );
}

function computeBounds(objects: SceneObject[]) {
  if (objects.length === 0) {
    return {
      min: [-1, 0, -1] as [number, number, number],
      max: [1, 2, 1] as [number, number, number],
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const object of objects) {
    const [px, py, pz] = object.position;
    const [sx, sy, sz] = object.scale;
    minX = Math.min(minX, px - sx / 2);
    minY = Math.min(minY, py - sy / 2);
    minZ = Math.min(minZ, pz - sz / 2);
    maxX = Math.max(maxX, px + sx / 2);
    maxY = Math.max(maxY, py + sy / 2);
    maxZ = Math.max(maxZ, pz + sz / 2);
  }

  return {
    min: [minX, minY, minZ] as [number, number, number],
    max: [maxX, maxY, maxZ] as [number, number, number],
  };
}
