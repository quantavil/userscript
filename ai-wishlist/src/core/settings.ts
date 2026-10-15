import { SETTINGS_KEY, writeStored } from "./storage";
export interface AppSettings {
  model: string;
  apiKey: string;
  baseUrl: string;
  accentColor: string;
  autocrawl: boolean;
}
export const DEFAULT_SETTINGS: AppSettings = {
  model: "gemini-3.5-flash-lite",
  apiKey: "",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  accentColor: "#dc2626",
  autocrawl: true,
};
export function isGeminiUrl(baseUrl: string): boolean {
  try {
    return new URL(baseUrl).hostname === "generativelanguage.googleapis.com";
  } catch {
    return false;
  }
}
export function getSettings(): AppSettings {
  const settings = { ...DEFAULT_SETTINGS };
  try {
    const stored = GM_getValue(SETTINGS_KEY, null);
    if (stored && typeof stored === "object" && !Array.isArray(stored)) {
      const value = stored as Record<string, unknown>;
      for (const key of ["model", "apiKey", "baseUrl"] as const) {
        if (typeof value[key] === "string") settings[key] = value[key];
      }
      if (typeof value.autocrawl === "boolean") settings.autocrawl = value.autocrawl;
      if (typeof value.accentColor === "string" && /^#[0-9a-f]{6}$/i.test(value.accentColor))
        settings.accentColor = value.accentColor;
    }
  } catch {
    /* Read failure falls back without rewriting storage. */
  }
  return settings;
}
export function saveSettings(settings: AppSettings): boolean {
  return writeStored(SETTINGS_KEY, settings, "settings-updated");
}
