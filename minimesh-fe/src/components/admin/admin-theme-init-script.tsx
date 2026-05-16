import Script from "next/script";
import { ADMIN_THEME_STORAGE_KEY } from "@/lib/admin/admin-theme";

/** Applies admin theme before paint to avoid flash on /admin routes. */
export function AdminThemeInitScript() {
  const script = `
(function () {
  var key = ${JSON.stringify(ADMIN_THEME_STORAGE_KEY)};
  var stored = localStorage.getItem(key);
  var dark =
    stored === "dark" ||
    (stored !== "light" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.adminTheme = dark ? "dark" : "light";
})();
`;

  return (
    <Script id="minimesh-admin-theme-init" strategy="beforeInteractive">
      {script}
    </Script>
  );
}
