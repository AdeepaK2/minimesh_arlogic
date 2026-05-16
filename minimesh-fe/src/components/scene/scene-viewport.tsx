"use client";

import { Grid, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping, MOUSE } from "three";
import type { SceneDocument, SceneLight } from "@/lib/scene/types";
import { getObjectEntityId } from "@/lib/scene/entities";
import type { ViewPreset } from "@/lib/scene/entities";
import { PrimitiveObject } from "./primitive-object";

interface SceneViewportProps {
  isolatedEntityId?: string | null;
  selectedEntityId?: string | null;
  selectedEntityName?: string | null;
  scene: SceneDocument;
  onClearSelection?: () => void;
  onFocusSelected?: () => void;
  onSelectEntity?: (entityId: string | null) => void;
  onToggleIsolate?: () => void;
  onViewPreset?: (preset: ViewPreset) => void;
}

export function SceneViewport({
  isolatedEntityId = null,
  selectedEntityId = null,
  selectedEntityName = null,
  scene,
  onClearSelection,
  onFocusSelected,
  onSelectEntity,
  onToggleIsolate,
  onViewPreset,
}: SceneViewportProps) {
  const environment = scene.environment ?? {
    backgroundColor: "#0b0f14",
    fogColor: "#0b0f14",
    fogNear: 18,
    fogFar: 42,
    exposure: 1,
  };

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden border border-zinc-800 bg-[#0b0f14]">
      <ViewportToolbar
        hasSelection={Boolean(selectedEntityId)}
        isIsolating={Boolean(isolatedEntityId)}
        selectedEntityName={selectedEntityName}
        onClearSelection={onClearSelection}
        onFocusSelected={onFocusSelected}
        onToggleIsolate={onToggleIsolate}
        onViewPreset={onViewPreset}
      />
      <Canvas
        key={`${environment.backgroundColor}-${environment.fogColor}-${environment.exposure}-${scene.camera.position.join(",")}-${scene.camera.target.join(",")}-${scene.camera.fov}`}
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
          enablePan
          minDistance={1.5}
          maxDistance={80}
          mouseButtons={{
            LEFT: MOUSE.ROTATE,
            MIDDLE: MOUSE.DOLLY,
            RIGHT: MOUSE.PAN,
          }}
        />
      </Canvas>
    </div>
  );
}

function ViewportToolbar({
  hasSelection,
  isIsolating,
  selectedEntityName,
  onClearSelection,
  onFocusSelected,
  onToggleIsolate,
  onViewPreset,
}: {
  hasSelection: boolean;
  isIsolating: boolean;
  selectedEntityName: string | null;
  onClearSelection?: () => void;
  onFocusSelected?: () => void;
  onToggleIsolate?: () => void;
  onViewPreset?: (preset: ViewPreset) => void;
}) {
  const buttonClass =
    "border border-slate-700/80 bg-slate-950/80 px-2.5 py-1.5 text-[11px] font-semibold text-slate-100 shadow-sm backdrop-blur transition hover:border-cyan-300 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-center justify-between gap-2">
      <div className="pointer-events-auto flex flex-wrap items-center gap-1">
        <button
          className={buttonClass}
          type="button"
          onClick={() => onViewPreset?.("home")}
        >
          Home
        </button>
        <button
          className={buttonClass}
          type="button"
          onClick={() => onViewPreset?.("top")}
        >
          Top
        </button>
        <button
          className={buttonClass}
          type="button"
          onClick={() => onViewPreset?.("front")}
        >
          Front
        </button>
        <button
          className={buttonClass}
          type="button"
          onClick={() => onViewPreset?.("right")}
        >
          Right
        </button>
      </div>

      <div className="pointer-events-auto flex min-w-0 flex-wrap items-center justify-end gap-1">
        {selectedEntityName ? (
          <span className="max-w-56 truncate border border-cyan-300/70 bg-cyan-950/70 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-100 shadow-sm backdrop-blur">
            {selectedEntityName}
          </span>
        ) : null}
        <button
          className={buttonClass}
          type="button"
          disabled={!hasSelection}
          onClick={onFocusSelected}
        >
          Fit
        </button>
        <button
          className={buttonClass}
          type="button"
          disabled={!hasSelection}
          onClick={onToggleIsolate}
        >
          {isIsolating ? "All" : "Solo"}
        </button>
        <button
          className={buttonClass}
          type="button"
          disabled={!hasSelection}
          onClick={onClearSelection}
        >
          Clear
        </button>
      </div>
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
