"use client";

import { useState } from "react";
import type { SceneEntity, SceneEntityTransform, Vector3Tuple } from "@/lib/scene/types";

interface EntityPanelProps {
  entities: SceneEntity[];
  isBusy: boolean;
  isIsolating: boolean;
  selectedEntity: SceneEntity | null;
  onFocus: () => void;
  onRefine: (instruction: string) => Promise<void>;
  onSelectEntity: (entityId: string) => void;
  onToggleIsolate: () => void;
  onTransformChange: (transform: SceneEntityTransform) => void;
}

const axes = ["x", "y", "z"] as const;

export function EntityPanel({
  entities,
  isBusy,
  isIsolating,
  selectedEntity,
  onFocus,
  onRefine,
  onSelectEntity,
  onToggleIsolate,
  onTransformChange,
}: EntityPanelProps) {
  const [instruction, setInstruction] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  async function handleRefine() {
    const trimmedInstruction = instruction.trim();

    if (!trimmedInstruction) {
      return;
    }

    setIsRefining(true);

    try {
      await onRefine(trimmedInstruction);
      setInstruction("");
    } finally {
      setIsRefining(false);
    }
  }

  return (
    <section className="border-t border-ui bg-panel">
      <div className="border-b border-ui px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Entities
        </p>
        <h2 className="mt-1 text-base font-semibold text-primary">
          Selectable models
        </h2>
      </div>

      <div className="grid max-h-64 gap-2 overflow-y-auto p-3">
        {entities.length === 0 ? (
          <p className="px-2 py-4 text-sm leading-6 text-secondary">
            Generate a scene to inspect entities.
          </p>
        ) : (
          entities.map((entity) => (
            <button
              key={entity.id}
              className={`border px-3 py-2 text-left transition ${
                selectedEntity?.id === entity.id
                  ? "border-accent bg-accent-soft"
                  : "border-ui bg-field hover:border-accent"
              }`}
              type="button"
              onClick={() => onSelectEntity(entity.id)}
            >
              <span className="block text-sm font-semibold text-primary">
                {entity.name}
              </span>
              <span className="mt-1 block text-xs text-secondary">
                {entity.objectIds.length} parts
              </span>
            </button>
          ))
        )}
      </div>

      {selectedEntity ? (
        <div className="grid gap-4 border-t border-ui p-4">
          <div>
            <h3 className="text-sm font-semibold text-primary">
              {selectedEntity.name}
            </h3>
            <p className="mt-1 text-xs leading-5 text-secondary">
              {selectedEntity.description ?? "Selectable generated entity."}
            </p>
            {selectedEntity.tags.length > 0 ? (
              <p className="mt-2 text-xs text-muted">
                {selectedEntity.tags.join(" / ")}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              className="border border-ui bg-field px-3 py-2 text-xs font-semibold text-primary transition hover:border-accent"
              type="button"
              disabled={isBusy}
              onClick={onFocus}
            >
              Focus
            </button>
            <button
              className="border border-ui bg-field px-3 py-2 text-xs font-semibold text-primary transition hover:border-accent"
              type="button"
              disabled={isBusy}
              onClick={onToggleIsolate}
            >
              {isIsolating ? "Show All" : "Isolate"}
            </button>
          </div>

          <TransformFields
            transform={selectedEntity.transform}
            onChange={onTransformChange}
          />

          <label className="grid gap-2 text-xs font-semibold text-primary">
            Refine selected entity
            <textarea
              className="min-h-20 resize-none border border-ui bg-field px-3 py-2 text-sm font-normal leading-5 text-primary outline-none transition focus:border-accent"
              value={instruction}
              placeholder="Example: make it longer and add cyan side lights"
              onChange={(event) => setInstruction(event.target.value)}
            />
          </label>
          <button
            className="border border-accent bg-accent px-3 py-2 text-sm font-semibold text-accent-contrast transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={isBusy || isRefining || instruction.trim().length < 3}
            onClick={() => void handleRefine()}
          >
            {isRefining ? "Refining" : "Refine Entity"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function TransformFields({
  transform,
  onChange,
}: {
  transform: SceneEntityTransform;
  onChange: (transform: SceneEntityTransform) => void;
}) {
  return (
    <div className="grid gap-3">
      <VectorField
        label="Position"
        value={transform.position}
        onChange={(position) => onChange({ ...transform, position })}
      />
      <VectorField
        label="Rotation"
        value={transform.rotation}
        onChange={(rotation) => onChange({ ...transform, rotation })}
      />
      <VectorField
        label="Scale"
        min={0.01}
        value={transform.scale}
        onChange={(scale) => onChange({ ...transform, scale })}
      />
    </div>
  );
}

function VectorField({
  label,
  min,
  value,
  onChange,
}: {
  label: string;
  min?: number;
  value: Vector3Tuple;
  onChange: (value: Vector3Tuple) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted">{label}</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {axes.map((axis, index) => (
          <label key={axis} className="grid gap-1 text-[11px] uppercase text-muted">
            {axis}
            <input
              className="min-w-0 border border-ui bg-field px-2 py-1 text-xs text-primary outline-none transition focus:border-accent"
              min={min}
              step={0.1}
              type="number"
              value={Number(value[index].toFixed(2))}
              onChange={(event) => {
                const next = [...value] as Vector3Tuple;
                next[index] = Number(event.target.value);
                onChange(next);
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
