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
      className={`overflow-hidden rounded-lg border font-mono text-[11px] ${
        hasError
          ? "border-rose-500/35 bg-rose-500/[0.03]"
          : "border-landing bg-landing-code"
      }`}
    >
      <div className="grid grid-cols-[2.25rem_1fr]">
        <pre
          aria-hidden
          className="select-none border-r border-landing bg-landing-surface px-1.5 py-2 text-right leading-[1.35rem] text-landing-subtle"
        >
          {lines.map((_, index) => (
            <div key={index}>{index + 1}</div>
          ))}
        </pre>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          className="min-h-[11rem] max-h-64 resize-y bg-transparent px-2 py-2 leading-[1.35rem] text-landing-heading caret-[var(--landing-accent)] outline-none"
        />
      </div>
      {hasError ? (
        <ul className="border-t border-rose-500/20 px-2 py-1.5 text-[10px] text-rose-400">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-landing px-2 py-1 text-[9px] text-landing-subtle">
          Valid JSON · schema checked on preview
        </p>
      )}
    </div>
  );
}
