"use client";

import { Grid, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping } from "three";
import type { SceneDocument, SceneLight } from "@/lib/scene/types";
import { getObjectEntityId } from "@/lib/scene/entities";
import { PrimitiveObject } from "./primitive-object";

interface SceneViewportProps {
  isolatedEntityId?: string | null;
  selectedEntityId?: string | null;
  scene: SceneDocument;
  onSelectEntity?: (entityId: string | null) => void;
}

export function SceneViewport({
  isolatedEntityId = null,
  selectedEntityId = null,
  scene,
  onSelectEntity,
}: SceneViewportProps) {
  const environment = scene.environment ?? {
    backgroundColor: "#0b0f14",
    fogColor: "#0b0f14",
    fogNear: 18,
    fogFar: 42,
    exposure: 1,
  };

  return (
    <div className="h-full min-h-[420px] w-full overflow-hidden border border-zinc-800 bg-[#0b0f14]">
      <Canvas
        key={`${environment.backgroundColor}-${environment.fogColor}-${environment.exposure}`}
        shadows
        gl={{ toneMapping: ACESFilmicToneMapping }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = environment.exposure;
        }}
        camera={{
          position: scene.camera.position,
          fov: scene.camera.fov,
          near: 0.1,
          far: 1000,
        }}
        onPointerMissed={() => onSelectEntity?.(null)}
      >
        <color attach="background" args={[environment.backgroundColor]} />
        <fog
          attach="fog"
          args={[environment.fogColor, environment.fogNear, environment.fogFar]}
        />
        <SceneLights lights={scene.lights} />
        <Grid
          args={[24, 24]}
          cellColor="#263241"
          sectionColor="#475569"
          fadeDistance={26}
          fadeStrength={1.3}
          infiniteGrid
        />
        <group>
          {scene.objects
            .filter((object) => {
              if (!isolatedEntityId) {
                return true;
              }

              return getObjectEntityId(object) === isolatedEntityId;
            })
            .map((object) => {
              const entityId = getObjectEntityId(object);

              return (
                <PrimitiveObject
                  key={object.id}
                  isSelected={entityId === selectedEntityId}
                  object={object}
                  onSelect={() => onSelectEntity?.(entityId)}
                />
              );
            })}
        </group>
        <OrbitControls
          makeDefault
          target={scene.camera.target}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
}

function SceneLights({ lights }: { lights: SceneLight[] }) {
  if (lights.length === 0) {
    return (
      <>
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 6, 5]} intensity={2} castShadow />
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
              castShadow
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
