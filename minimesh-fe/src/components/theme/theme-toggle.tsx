"use client";

import type { ThemeMode } from "./theme-provider";
import { useTheme } from "./theme-provider";

const modes: ThemeMode[] = ["light", "dark"];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div className="inline-grid grid-cols-2 border border-ui bg-panel p-1">
      {modes.map((themeMode) => (
        <button
          key={themeMode}
          className={`px-3 py-1.5 text-xs font-semibold capitalize transition ${
            mode === themeMode
              ? "bg-accent text-accent-contrast"
              : "text-secondary hover:text-primary"
          }`}
          type="button"
          onClick={() => setMode(themeMode)}
        >
          {themeMode}
        </button>
      ))}
    </div>
  );
}
