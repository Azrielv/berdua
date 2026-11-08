export type ThemePref = "system" | "light" | "dark";
export const THEME_KEY = "berdua-theme";
export const THEME_COLORS = { light: "#fff7f8", dark: "#140d10" } as const;

/**
 * Runs inline in <head> before first paint so there's no flash of the wrong
 * theme. Keep it tiny and dependency-free.
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${THEME_KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`;

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const resolved = dark ? "dark" : "light";
  document.documentElement.dataset.theme = resolved;
  // Keep the browser/status-bar colour in step with the manual choice.
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", THEME_COLORS[resolved]));
}

export function saveThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    // private mode: still applies for this session
  }
  applyTheme(pref);
}
