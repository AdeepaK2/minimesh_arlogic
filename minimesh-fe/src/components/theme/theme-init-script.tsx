import Script from "next/script";
import { THEME_STORAGE_KEY } from "./theme-provider";

/** Runs before paint to avoid wrong-theme flash. */
export function ThemeInitScript() {
  const script = `
(function () {
  var key = ${JSON.stringify(THEME_STORAGE_KEY)};
  var stored = localStorage.getItem(key);
  var dark =
    stored === "dark" ||
    (stored !== "light" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  var resolved = dark ? "dark" : "light";
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
})();
`;

  return (
    <Script id="minimesh-theme-init" strategy="beforeInteractive">
      {script}
    </Script>
  );
}
