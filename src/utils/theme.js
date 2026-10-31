// src/utils/theme.js

const THEME_SETTING_KEY = "hrms_theme_setting";
const THEME_KEY = "hrms_theme";

/**
 * Get current system OS preference ('light' | 'dark')
 */
export const getSystemPreference = () => {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

/**
 * Get the saved theme setting ('light' | 'dark' | 'system')
 * Defaults to 'system'
 */
export const getThemeSetting = () => {
  if (typeof window === "undefined") return "system";
  try {
    const saved = localStorage.getItem(THEME_SETTING_KEY) || localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
    return "system";
  } catch (_) {
    return "system";
  }
};

/**
 * Resolve setting ('light' | 'dark' | 'system') to effective theme ('light' | 'dark')
 */
export const resolveTheme = (setting = getThemeSetting()) => {
  if (setting === "system") {
    return getSystemPreference();
  }
  return setting === "dark" ? "dark" : "light";
};

/**
 * Get current active effective theme ('light' | 'dark')
 */
export const getActiveTheme = () => {
  return resolveTheme(getThemeSetting());
};

/**
 * Apply resolved theme to DOM without overriding unrelated elements
 */
const applyThemeToDOM = (resolvedTheme, setting) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (resolvedTheme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    root.setAttribute("data-bs-theme", "dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
    root.setAttribute("data-bs-theme", "light");
    root.style.colorScheme = "light";
  }

  // Broadcast event for live cross-component sync
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("hrms-theme-changed", {
        detail: {
          setting,
          theme: resolvedTheme,
          isSystem: setting === "system",
        },
      })
    );
  }
};

/**
 * Set and persist theme setting ('light' | 'dark' | 'system')
 */
export const setTheme = (setting) => {
  const validSetting = setting === "dark" || setting === "light" ? setting : "system";
  try {
    localStorage.setItem(THEME_SETTING_KEY, validSetting);
    localStorage.setItem(THEME_KEY, validSetting);
    localStorage.setItem("theme", validSetting);
  } catch (_) {}

  const resolved = resolveTheme(validSetting);
  applyThemeToDOM(resolved, validSetting);
  return { setting: validSetting, theme: resolved };
};

/**
 * Cycle through theme settings: light -> dark -> system -> light
 */
export const cycleTheme = () => {
  const current = getThemeSetting();
  let next = "dark";
  if (current === "light") next = "dark";
  else if (current === "dark") next = "system";
  else next = "light";

  setTheme(next);
  return next;
};

/**
 * Backward compatibility: toggle between light and dark (or next in cycle)
 */
export const toggleTheme = () => {
  return cycleTheme();
};

/**
 * Apply theme directly (used when resolved theme changes)
 */
export const applyTheme = (themeOrSetting) => {
  return setTheme(themeOrSetting);
};

// Global listener for system theme changes
let mediaQueryListenerAttached = false;

const attachSystemThemeListener = () => {
  if (typeof window === "undefined" || !window.matchMedia || mediaQueryListenerAttached) return;

  try {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      const currentSetting = getThemeSetting();
      if (currentSetting === "system") {
        const nextTheme = e.matches ? "dark" : "light";
        applyThemeToDOM(nextTheme, "system");
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handler);
    }
    mediaQueryListenerAttached = true;
  } catch (_) {}
};

/**
 * Initialize theme on app boot
 */
export const initTheme = () => {
  attachSystemThemeListener();
  const setting = getThemeSetting();
  const resolved = resolveTheme(setting);
  applyThemeToDOM(resolved, setting);
  return resolved;
};

