import type { EnhancerSettings, SeenMode } from "./types.ts";

const SETTINGS_KEY = "ope_settings";
const SEEN_PLUGINS_KEY = "ope_seen_plugins";

export const DEFAULT_SETTINGS: EnhancerSettings = {
  autoPagerEnabled: true,
  seenMode: "collapse",
  markSeenOnScroll: true,
  seenPluginIds: [],
};

// Safe GM storage wrapper with localStorage fallback
function storageGet<T>(key: string, defaultValue: T): T {
  try {
    if (typeof GM_getValue === "function") {
      return GM_getValue(key, defaultValue);
    }
  } catch {
    // Fallback
  }

  try {
    if (typeof localStorage !== "undefined") {
      const item = localStorage.getItem(key);
      if (item !== null) {
        return JSON.parse(item) as T;
      }
    }
  } catch {
    // Fallback
  }

  return defaultValue;
}

function storageSet<T>(key: string, value: T): void {
  try {
    if (typeof GM_setValue === "function") {
      GM_setValue(key, value);
      return;
    }
  } catch {
    // Fallback
  }

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // Fallback
  }
}

class StorageManager {
  private settings: EnhancerSettings;
  private seenSet: Set<string>;
  private listeners: Set<(settings: EnhancerSettings) => void> = new Set();

  constructor() {
    const rawSettings = storageGet<Record<string, unknown>>(SETTINGS_KEY, {});
    let seenMode: SeenMode = "collapse";
    if (rawSettings.seenMode === "dim" || rawSettings.seenMode === "collapse" || rawSettings.seenMode === "off") {
      seenMode = rawSettings.seenMode;
    } else if (rawSettings.dimSeenEnabled === false) {
      seenMode = "off";
    }

    this.settings = {
      autoPagerEnabled: typeof rawSettings.autoPagerEnabled === "boolean" ? rawSettings.autoPagerEnabled : DEFAULT_SETTINGS.autoPagerEnabled,
      seenMode,
      markSeenOnScroll: typeof rawSettings.markSeenOnScroll === "boolean" ? rawSettings.markSeenOnScroll : DEFAULT_SETTINGS.markSeenOnScroll,
      seenPluginIds: [],
    };

    const storedSeen = storageGet<string[]>(SEEN_PLUGINS_KEY, []);
    this.seenSet = new Set(storedSeen);
  }

  public getSettings(): EnhancerSettings {
    return {
      ...this.settings,
      seenPluginIds: Array.from(this.seenSet),
    };
  }

  public updateSettings(partial: Partial<EnhancerSettings>): void {
    this.settings = { ...this.settings, ...partial };
    storageSet(SETTINGS_KEY, {
      autoPagerEnabled: this.settings.autoPagerEnabled,
      seenMode: this.settings.seenMode,
      markSeenOnScroll: this.settings.markSeenOnScroll,
    });
    this.notify();
  }

  public isPluginSeen(id: string): boolean {
    return this.seenSet.has(id);
  }

  public markPluginSeen(id: string): boolean {
    if (!id || this.seenSet.has(id)) return false;
    this.seenSet.add(id);
    this.persistSeen();
    return true;
  }

  public unmarkPluginSeen(id: string): boolean {
    if (!id || !this.seenSet.has(id)) return false;
    this.seenSet.delete(id);
    this.persistSeen();
    return true;
  }

  public clearSeenPlugins(): void {
    this.seenSet.clear();
    this.persistSeen();
  }

  public getSeenCount(): number {
    return this.seenSet.size;
  }

  public onSettingsChange(callback: (settings: EnhancerSettings) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private persistSeen(): void {
    storageSet(SEEN_PLUGINS_KEY, Array.from(this.seenSet));
    this.notify();
  }

  private notify(): void {
    const current = this.getSettings();
    for (const listener of this.listeners) {
      try {
        listener(current);
      } catch (err) {
        console.error("[Omarchy Enhancer] Listener error:", err);
      }
    }
  }
}

export const storage = new StorageManager();
