export const ADMIN_THEME_STORAGE_KEY = "minimesh-admin-theme";

export type AdminTheme = "light" | "dark";

export function getBrowserAdminTheme(): AdminTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Stored light/dark, or browser preference when nothing saved yet. */
export function readAdminTheme(): AdminTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return getBrowserAdminTheme();
}

export function writeAdminTheme(theme: AdminTheme): void {
  window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme);
}
