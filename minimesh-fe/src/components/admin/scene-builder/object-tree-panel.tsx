"use client";

interface ObjectTreePanelProps {
  objects: { id: string; name: string; type: string }[];
}

export function ObjectTreePanel({ objects }: ObjectTreePanelProps) {
  if (objects.length === 0) {
    return (
      <p className="text-[10px] text-landing-subtle">No objects parsed yet.</p>
    );
  }

  return (
    <ul className="space-y-0.5 text-[10px]">
      {objects.map((object) => (
        <li
          key={object.id}
          className="flex items-center gap-2 rounded-md border border-landing bg-landing-surface px-2 py-1"
        >
          <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--landing-accent)]" />
          <span className="truncate font-medium text-landing-heading">{object.name}</span>
          <span className="ml-auto shrink-0 text-landing-subtle">{object.type}</span>
        </li>
      ))}
    </ul>
  );
}
