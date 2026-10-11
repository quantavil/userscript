import type { CatalogResponse, PluginItem } from "./types.ts";

class CatalogService {
  private pluginsMap: Map<string, PluginItem> = new Map();
  private loadPromise: Promise<Map<string, PluginItem>> | null = null;

  public async getCatalog(): Promise<Map<string, PluginItem>> {
    if (this.pluginsMap.size > 0) {
      return this.pluginsMap;
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.fetchCatalog();
    return this.loadPromise;
  }

  public getPlugin(id: string): PluginItem | undefined {
    return this.pluginsMap.get(id);
  }

  public getPluginRepo(id: string): string | undefined {
    const plugin = this.pluginsMap.get(id);
    if (!plugin) return undefined;
    return plugin.repo || plugin.sourceUrl;
  }

  public setCatalogData(plugins: PluginItem[]): void {
    this.pluginsMap.clear();
    for (const plugin of plugins) {
      if (plugin && plugin.id) {
        this.pluginsMap.set(plugin.id, plugin);
      }
    }
  }

  private async fetchCatalog(): Promise<Map<string, PluginItem>> {
    try {
      // Use relative path or absolute URL depending on current context
      const url = typeof window !== "undefined" && window.location?.origin
        ? `${window.location.origin}/catalog.json`
        : "https://plugins.omarchy.org/catalog.json";

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to fetch catalog: ${res.status}`);
      }
      const data = (await res.json()) as CatalogResponse;
      if (Array.isArray(data.plugins)) {
        this.setCatalogData(data.plugins);
      }
    } catch (err) {
      console.warn("[Omarchy Enhancer] Failed to fetch catalog:", err);
    }
    return this.pluginsMap;
  }
}

export const catalogService = new CatalogService();
