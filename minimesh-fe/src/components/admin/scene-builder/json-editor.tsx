"use client";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  issues: string[];
}

export function JsonEditor({ value, onChange, issues }: JsonEditorProps) {
  const lines = value.split("\n");
  const hasError = issues.length > 0;

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-[#030508] font-mono text-xs ${
        hasError
          ? "border-rose-500/40 shadow-[0_0_24px_rgba(244,63,94,0.12)]"
          : "border-cyan-500/20 shadow-[inset_0_0_40px_rgba(34,211,238,0.04)]"
      }`}
    >
      <div className="grid grid-cols-[3rem_1fr]">
        <pre
          aria-hidden
          className="select-none border-r border-white/5 bg-black/40 px-2 py-3 text-right leading-5 text-zinc-600"
        >
          {lines.map((_, index) => (
            <div key={index}>{index + 1}</div>
          ))}
        </pre>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          className="min-h-64 resize-y bg-transparent px-3 py-3 leading-5 text-cyan-50/95 caret-cyan-300 outline-none"
        />
      </div>
      {hasError ? (
        <ul className="border-t border-rose-500/20 bg-rose-500/5 px-3 py-2 text-[11px] text-rose-200">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-white/5 px-3 py-1.5 text-[10px] text-emerald-400/80">
          JSON syntax valid · Run Validate for schema checks
        </p>
      )}
    </div>
  );
}
