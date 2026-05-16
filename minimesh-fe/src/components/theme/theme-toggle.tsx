"use client";

import type { ThemePreference } from "./theme-provider";
import { useTheme } from "./theme-provider";

const options: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

interface ThemeToggleProps {
  /** Compact pill for marketing nav; default segmented control for app chrome */
  variant?: "default" | "compact";
  className?: string;
}

export function ThemeToggle({
  variant = "default",
  className = "",
}: ThemeToggleProps) {
  const { preference, setPreference } = useTheme();

  if (variant === "compact") {
    return (
      <div
        className={`inline-flex rounded-full border border-landing p-0.5 ${className}`}
        role="group"
        aria-label="Theme"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.label}
            aria-label={option.label}
            aria-pressed={preference === option.value}
            onClick={() => setPreference(option.value)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize transition ${
              preference === option.value
                ? "bg-gradient-to-r from-cyan-500 to-violet-500 text-white"
                : "text-landing-muted hover:text-landing-heading"
            }`}
          >
            {option.value === "system" ? "Auto" : option.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`inline-grid grid-cols-3 border border-ui bg-panel p-1 ${className}`}
      role="group"
      aria-label="Theme"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={preference === option.value}
          className={`px-2.5 py-1.5 text-xs font-semibold transition ${
            preference === option.value
              ? "bg-accent text-accent-contrast"
              : "text-secondary hover:text-primary"
          }`}
          onClick={() => setPreference(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
