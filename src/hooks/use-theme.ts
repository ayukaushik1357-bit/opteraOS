/**
 * useTheme — opteraOS Universal Theme Manager
 *
 * Dark/light toggle is available on ALL pages:
 *  - Landing page (/)
 *  - Auth pages (/auth, /register, etc.)
 *  - Authenticated app routes (/dashboard, /crm, etc.)
 *
 * Preference is stored in localStorage under `opteraos_theme` and
 * applied globally via the `.dark` class on `document.documentElement`.
 */

import { useCallback, useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "opteraos_theme";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    return stored === "dark" ? "dark" : "light";
  });

  // Apply on mount (sync with localStorage)
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    const resolved: Theme = stored === "dark" ? "dark" : "light";
    setThemeState(resolved);
    applyTheme(resolved);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, toggleTheme, setTheme, isDark: theme === "dark" };
}
