"use client";

import { useAdminTheme } from "./admin-theme-provider";

export function AdminThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useAdminTheme();

  return (
    <div
      className={`inline-flex rounded-full border border-landing bg-landing-card p-0.5 ${className}`}
      role="group"
      aria-label="Theme"
    >
      {(["light", "dark"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={theme === option}
          onClick={() => setTheme(option)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
            theme === option
              ? "admin-theme-toggle-active text-white"
              : "text-landing-muted hover:text-landing-heading"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
