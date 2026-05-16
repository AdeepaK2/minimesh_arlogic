"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode | "system";
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "minimesh-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode | "system">(() => {
    if (typeof window === "undefined") {
      return "system";
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }

    return "system";
  });

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      const resolved = mode === "system" ? (media.matches ? "dark" : "light") : mode;
      root.dataset.theme = resolved;
      root.style.colorScheme = resolved;
    }

    applyTheme();
    media.addEventListener("change", applyTheme);

    return () => media.removeEventListener("change", applyTheme);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      setMode: (nextMode: ThemeMode) => {
        window.localStorage.setItem(STORAGE_KEY, nextMode);
        setModeState(nextMode);
      },
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider.");
  }

  return value;
}
