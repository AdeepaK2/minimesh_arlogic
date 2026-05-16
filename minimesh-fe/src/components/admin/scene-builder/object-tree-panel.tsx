"use client";

interface ObjectTreePanelProps {
  objects: { id: string; name: string; type: string }[];
}

export function ObjectTreePanel({ objects }: ObjectTreePanelProps) {
  if (objects.length === 0) {
    return (
      <p className="text-[11px] text-zinc-500">No objects parsed yet.</p>
    );
  }

  return (
    <ul className="space-y-1 text-[11px]">
      {objects.map((object) => (
        <li
          key={object.id}
          className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
          <span className="font-medium text-zinc-200">{object.name}</span>
          <span className="ml-auto text-zinc-500">{object.type}</span>
        </li>
      ))}
    </ul>
  );
}
