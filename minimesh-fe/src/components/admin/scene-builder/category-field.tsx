"use client";

import { useState } from "react";
import {
  isKnownCategory,
  normalizeCategory,
} from "@/lib/admin/category-options";

interface CategoryFieldProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  inputClassName: string;
}

export function CategoryField({
  value,
  options,
  onChange,
  inputClassName,
}: CategoryFieldProps) {
  const sortedOptions = [...options].sort((a, b) => a.localeCompare(b));
  const [customMode, setCustomMode] = useState(
    () => value.length > 0 && !isKnownCategory(value, sortedOptions),
  );
  const [customDraft, setCustomDraft] = useState(() =>
    customMode ? value : "",
  );

  function handleSelectChange(next: string) {
    if (next === "__custom__") {
      setCustomMode(true);
      setCustomDraft(
        value && !isKnownCategory(value, sortedOptions) ? value : "",
      );
      return;
    }

    setCustomMode(false);
    setCustomDraft("");
    onChange(next);
  }

  function commitCustomCategory() {
    const normalized = normalizeCategory(customDraft);
    if (!normalized) {
      return;
    }

    onChange(normalized);
    setCustomMode(false);
    setCustomDraft("");
  }

  if (customMode) {
    return (
      <div className="grid gap-2">
        <input
          className={inputClassName}
          value={customDraft}
          onChange={(event) => setCustomDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitCustomCategory();
            }
          }}
          placeholder="e.g. wildlife, furniture, flora"
          autoFocus
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={commitCustomCategory}
            disabled={!normalizeCategory(customDraft)}
            className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-[11px] font-semibold text-cyan-200 transition hover:bg-cyan-500/25 disabled:opacity-40"
          >
            Add category
          </button>
          <button
            type="button"
            onClick={() => {
              setCustomMode(false);
              setCustomDraft("");
              if (sortedOptions[0]) {
                onChange(sortedOptions[0]);
              }
            }}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </button>
        </div>
        <p className="text-[10px] text-zinc-500">
          Saved as a lowercase slug (letters, numbers, underscores · max 64 chars)
        </p>
      </div>
    );
  }

  const selectValue =
    value && isKnownCategory(value, sortedOptions)
      ? value
      : sortedOptions[0] ?? "";

  return (
    <div className="grid gap-1.5">
      <select
        className={inputClassName}
        value={selectValue}
        onChange={(event) => handleSelectChange(event.target.value)}
      >
        {sortedOptions.map((item) => (
          <option key={item} value={item} className="bg-landing-code">
            {item}
          </option>
        ))}
        <option value="__custom__" className="bg-landing-code">
          + Add new category…
        </option>
      </select>
      {value && !isKnownCategory(value, sortedOptions) ? (
        <p className="text-[10px] text-amber-300/90">
          Using custom category:{" "}
          <span className="font-mono text-amber-200">{value}</span>
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => handleSelectChange("__custom__")}
        className="w-fit text-left text-[10px] text-cyan-500/80 transition hover:text-cyan-300"
      >
        Add a category not in the list
      </button>
    </div>
  );
}
