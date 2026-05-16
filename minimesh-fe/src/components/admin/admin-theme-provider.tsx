"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  readAdminTheme,
  writeAdminTheme,
  type AdminTheme,
} from "@/lib/admin/admin-theme";

interface AdminThemeContextValue {
  theme: AdminTheme;
  setTheme: (theme: AdminTheme) => void;
  toggleTheme: () => void;
}

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

function applyAdminTheme(theme: AdminTheme) {
  document.documentElement.dataset.adminTheme = theme;
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>(() =>
    typeof window !== "undefined" ? readAdminTheme() : "light",
  );

  useEffect(() => {
    applyAdminTheme(theme);
  }, [theme]);

  useEffect(() => {
    return () => {
      delete document.documentElement.dataset.adminTheme;
    };
  }, []);

  const value = useMemo<AdminThemeContextValue>(
    () => ({
      theme,
      setTheme: (next: AdminTheme) => {
        writeAdminTheme(next);
        setThemeState(next);
        applyAdminTheme(next);
      },
      toggleTheme: () => {
        const next = theme === "dark" ? "light" : "dark";
        writeAdminTheme(next);
        setThemeState(next);
        applyAdminTheme(next);
      },
    }),
    [theme],
  );

  return (
    <AdminThemeContext.Provider value={value}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) {
    throw new Error("useAdminTheme must be used inside AdminThemeProvider.");
  }
  return ctx;
}
