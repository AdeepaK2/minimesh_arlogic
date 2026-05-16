"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Grid, Html, OrbitControls, TransformControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { ACESFilmicToneMapping, Mesh, MOUSE } from "three";
import type { Group, MeshStandardMaterial, Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { BuiltGltfDocument, LogicalGltfDocument } from "@/lib/scene/gltf-types";
import type { ViewPreset } from "@/lib/scene/entities";

type LogicalLight = LogicalGltfDocument["lights"][number];

interface GltfViewportProps {
  gltfDocument: BuiltGltfDocument;
  selectedEntityId?: string | null;
  selectedEntityIds?: string[];
  selectedEntityName?: string | null;
  isolatedEntityId?: string | null;
  /** When set, shows draggable light gizmos for each light in the list. */
  lightsForEdit?: LogicalLight[];
  onClearSelection?: () => void;
  onFocusSelected?: () => void;
  onLightMove?: (index: number, position: [number, number, number]) => void;
  onSelectEntity?: (entityId: string | null, additive?: boolean) => void;
  onToggleIsolate?: () => void;
  onViewPreset?: (preset: ViewPreset) => void;
}

export function GltfViewport({
  gltfDocument,
  selectedEntityId = null,
  selectedEntityIds = [],
  selectedEntityName = null,
  isolatedEntityId = null,
  lightsForEdit,
  onClearSelection,
  onFocusSelected,
  onLightMove,
  onSelectEntity,
  onToggleIsolate,
  onViewPreset,
}: GltfViewportProps) {
  const extras = gltfDocument.extras;
  const camera = extras?.camera;
  const env = extras?.environment;
  const backgroundColor = env?.backgroundColorHex ?? "#87c4e8";
  const fogColor = env?.fogColorHex ?? backgroundColor;
  const fogNear = env?.fogNear ?? 30;
  const fogFar = env?.fogFar ?? 120;
  const cameraPos = camera?.position ?? [5, 4, 7];
  const cameraTarget = camera?.target ?? [0, 0, 0];
  const fov = camera?.fovDegrees ?? 50;
  const selectedEntityIdSet = new Set(selectedEntityIds);

  const editableLights = (lightsForEdit ?? []).filter(
    (l) => l.type !== "ambient",
  );

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden border border-zinc-800 bg-[#0b0f14]">
      <ViewportToolbar
        hasSelection={Boolean(selectedEntityId)}
        isIsolating={Boolean(isolatedEntityId)}
        isEditingLights={editableLights.length > 0}
        selectedCount={selectedEntityIdSet.size}
        selectedEntityName={selectedEntityName}
        onClearSelection={onClearSelection}
        onFocusSelected={onFocusSelected}
        onToggleIsolate={onToggleIsolate}
        onViewPreset={onViewPreset}
      />
      <Canvas
        key={`${backgroundColor}-${cameraPos.join(",")}-${cameraTarget.join(",")}-${fov}`}
        shadows
        gl={{ toneMapping: ACESFilmicToneMapping }}
        camera={{ position: cameraPos as [number, number, number], fov, near: 0.1, far: 1000 }}
        onPointerMissed={() => onSelectEntity?.(null)}
      >
        <color attach="background" args={[backgroundColor]} />
        <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

        {/* Ambient lights from extras (not in KHR_lights_punctual) */}
        {(extras?.ambientLights ?? []).map((al, i) => (
          <ambientLight key={`ambient-${i}`} color={al.colorHex} intensity={al.intensity} />
        ))}
        {extras?.ambientLights?.length === 0 || !extras?.ambientLights ? (
          <ambientLight intensity={0.45} />
        ) : null}

        <Grid
          args={[24, 24]}
          cellColor="#263241"
          sectionColor="#475569"
          fadeDistance={26}
          fadeStrength={1.3}
          infiniteGrid
        />

        <Suspense fallback={null}>
          <GltfScene
            gltfDocument={gltfDocument}
            isolatedEntityId={isolatedEntityId}
            selectedEntityIds={selectedEntityIdSet}
            onSelectEntity={onSelectEntity}
          />
        </Suspense>

        {/* Draggable light handles — shown when Lights tab is active */}
        {editableLights.map((light, i) => {
          // find original index in lightsForEdit (ambient lights skipped above)
          const originalIndex = (lightsForEdit ?? []).indexOf(light);
          return (
            <LightHandle
              key={`light-handle-${originalIndex}`}
              index={originalIndex}
              light={light}
              onMove={onLightMove ?? (() => {})}
            />
          );
        })}

        <OrbitControls
          makeDefault
          target={cameraTarget as [number, number, number]}
          enableDamping
          dampingFactor={0.08}
          enablePan
          minDistance={1.5}
          maxDistance={80}
          mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
        />
      </Canvas>
    </div>
  );
}

// ─── Inner scene loader ──────────────────────────────────────────────────────

interface GltfSceneProps {
  gltfDocument: BuiltGltfDocument;
  isolatedEntityId: string | null;
  selectedEntityIds: Set<string>;
  onSelectEntity?: (entityId: string | null, additive?: boolean) => void;
}

// Walk up a Three.js hierarchy to find the nearest entityId in userData.
function getEntityId(obj: Object3D): string | undefined {
  let current: Object3D | null = obj;
  while (current) {
    const uid = (current.userData as Record<string, unknown>).entityId as string | undefined;
    if (uid) return uid;
    current = current.parent;
  }
  return undefined;
}

function GltfScene({ gltfDocument, isolatedEntityId, selectedEntityIds, onSelectEntity }: GltfSceneProps) {
  const groupRef = useRef<Group>(null);
  const [loadedGroup, setLoadedGroup] = useState<Group | null>(null);

  // ── Load glTF and snapshot original emissive values ───────────────────────
  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();

    loader.parseAsync(JSON.stringify(gltfDocument), "").then((gltf) => {
      if (cancelled) return;

      gltf.scene.traverse((obj) => {
        if (!(obj instanceof Mesh)) return;
        const mesh = obj;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of mats) {
          const m = mat as MeshStandardMaterial;
          if (m && "emissive" in m) {
            // Snapshot originals so we can restore them when deselected.
            (obj.userData as Record<string, unknown>)._origEmissiveHex = m.emissive.getHex();
            (obj.userData as Record<string, unknown>)._origEmissiveIntensity = m.emissiveIntensity;
          }
        }

        // Isolation: hide meshes that don't belong to the isolated entity.
        if (isolatedEntityId) {
          const eid = getEntityId(obj);
          if (eid !== isolatedEntityId) obj.visible = false;
        }
      });

      setLoadedGroup(gltf.scene as unknown as Group);
    }).catch((err: unknown) => {
      console.error("[GltfViewport] Failed to parse glTF document:", err);
    });

    return () => { cancelled = true; };
    // Intentionally depend on the document JSON string — rebuilds on new generation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(gltfDocument), isolatedEntityId]);

  // ── Apply / remove selection highlights whenever selection changes ─────────
  useEffect(() => {
    if (!loadedGroup) return;
    loadedGroup.traverse((obj) => {
      if (!(obj instanceof Mesh)) return;
      const mesh = obj;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const eid = getEntityId(obj);
      const isSelected = eid ? selectedEntityIds.has(eid) : false;

      for (const mat of mats) {
        const m = mat as MeshStandardMaterial;
        if (!m || !("emissive" in m)) continue;
        if (isSelected) {
          m.emissive.setHex(0x1a5f8a);
          m.emissiveIntensity = 0.75;
        } else {
          const origHex = (obj.userData as Record<string, unknown>)._origEmissiveHex as number | undefined;
          const origIntensity = (obj.userData as Record<string, unknown>)._origEmissiveIntensity as number | undefined;
          m.emissive.setHex(origHex ?? 0x000000);
          m.emissiveIntensity = origIntensity ?? 0;
        }
        m.needsUpdate = true;
      }
    });
  }, [loadedGroup, selectedEntityIds]);

  const handlePointerDown = (event: import("@react-three/fiber").ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const entityId = getEntityId(event.object) ?? null;
    onSelectEntity?.(entityId, event.nativeEvent.shiftKey || event.nativeEvent.ctrlKey || event.nativeEvent.metaKey);
  };

  if (!loadedGroup) return null;

  return (
    <primitive
      ref={groupRef}
      object={loadedGroup}
      onPointerDown={handlePointerDown}
    />
  );
}

// ─── Draggable light handle ───────────────────────────────────────────────────

interface LightHandleProps {
  index: number;
  light: LogicalLight;
  onMove: (index: number, position: [number, number, number]) => void;
}

function LightHandle({ index, light, onMove }: LightHandleProps) {
  const meshRef = useRef<Mesh>(null);
  const [attached, setAttached] = useState(false);
  const { controls } = useThree();

  const pos: [number, number, number] = light.position ?? [0, 5, 5];

  // Sync external position changes (after rebuild) back to the mesh
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.set(pos[0], pos[1], pos[2]);
    }
  // Only re-sync when the upstream position prop genuinely changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos[0], pos[1], pos[2]]);

  // Signal when the mesh is mounted so TransformControls can attach
  useEffect(() => {
    if (meshRef.current) setAttached(true);
  }, []);

  const handleDragStart = useCallback(() => {
    if (controls) (controls as unknown as { enabled: boolean }).enabled = false;
  }, [controls]);

  const handleDragEnd = useCallback(() => {
    if (controls) (controls as unknown as { enabled: boolean }).enabled = true;
    if (!meshRef.current) return;
    const p = meshRef.current.position;
    onMove(index, [
      Math.round(p.x * 10) / 10,
      Math.round(p.y * 10) / 10,
      Math.round(p.z * 10) / 10,
    ]);
  }, [controls, index, onMove]);

  return (
    <>
      <mesh ref={meshRef} position={pos}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ff8c00"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>

      {/* Label */}
      {attached && meshRef.current && (
        <Html
          position={[pos[0], pos[1] + 0.38, pos[2]]}
          center
          style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
        >
          <span
            style={{
              background: "rgba(0,0,0,0.65)",
              color: "#ffd700",
              fontSize: 10,
              fontWeight: 600,
              padding: "1px 5px",
              borderRadius: 3,
              backdropFilter: "blur(4px)",
            }}
          >
            {light.name}
          </span>
        </Html>
      )}

      {/* TransformControls — translate only */}
      {attached && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode="translate"
          size={0.65}
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
        />
      )}
    </>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

function ViewportToolbar({
  hasSelection,
  isEditingLights,
  isIsolating,
  selectedCount,
  selectedEntityName,
  onClearSelection,
  onFocusSelected,
  onToggleIsolate,
  onViewPreset,
}: {
  hasSelection: boolean;
  isEditingLights: boolean;
  isIsolating: boolean;
  selectedCount: number;
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
        <button className={buttonClass} type="button" onClick={() => onViewPreset?.("home")}>Home</button>
        <button className={buttonClass} type="button" onClick={() => onViewPreset?.("top")}>Top</button>
        <button className={buttonClass} type="button" onClick={() => onViewPreset?.("front")}>Front</button>
        <button className={buttonClass} type="button" onClick={() => onViewPreset?.("right")}>Right</button>
        {isEditingLights && (
          <span className="border border-amber-500/60 bg-amber-950/70 px-2.5 py-1.5 text-[11px] font-semibold text-amber-300 shadow-sm backdrop-blur">
            ✦ Light edit — drag gizmos to reposition
          </span>
        )}
      </div>
      <div className="pointer-events-auto flex min-w-0 flex-wrap items-center justify-end gap-1">
        {selectedEntityName ? (
          <span className="max-w-56 truncate border border-cyan-300/70 bg-cyan-950/70 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-100 shadow-sm backdrop-blur">
            {selectedCount > 1 ? `${selectedCount} selected` : selectedEntityName}
          </span>
        ) : null}
        <button className={buttonClass} type="button" disabled={!hasSelection} onClick={onFocusSelected}>Fit</button>
        <button className={buttonClass} type="button" disabled={!hasSelection} onClick={onToggleIsolate}>
          {isIsolating ? "All" : "Solo"}
        </button>
        <button className={buttonClass} type="button" disabled={!hasSelection} onClick={onClearSelection}>Clear</button>
      </div>
    </div>
  );
}
