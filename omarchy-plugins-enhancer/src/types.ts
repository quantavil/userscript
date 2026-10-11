export type SeenMode = "dim" | "collapse" | "off";

export interface PluginItem {
  id: string;
  name: string;
  description: string;
  author: string;
  repo: string;
  category?: string;
  tags?: string[];
  accent?: string;
  stars?: number;
  builtIn?: boolean;
  installAvailable?: boolean;
  installCommand?: string;
  sourceUrl?: string;
  [key: string]: unknown;
}

export interface CatalogResponse {
  version?: string;
  plugins: PluginItem[];
}

export interface EnhancerSettings {
  autoPagerEnabled: boolean;
  seenMode: SeenMode;
  markSeenOnScroll: boolean;
  seenPluginIds: string[];
}
