// src/types.ts

/** Which list a domain belongs to */
export type DomainMatch = 'liked' | 'disliked' | 'normal';

/** What happens to disliked results */
export type DislikeMode = 'fade' | 'hide';

export type AccentColor = 'emerald' | 'indigo' | 'blue' | 'teal' | 'rose' | 'amber';

export interface AccentDetails {
    primary: string;
    glow: string;
    bg: string;
    bgHover: string;
    border: string;
    statusBg: string;
    dotGlow: string;
}

const ACCENT_RAW: Record<AccentColor, { hex: string; rgb: string }> = {
    emerald: { hex: '#10b981', rgb: '16, 185, 129' },
    indigo:  { hex: '#6366f1', rgb: '99, 102, 241' },
    blue:    { hex: '#3b82f6', rgb: '59, 130, 246' },
    teal:    { hex: '#06b6d4', rgb: '6, 182, 212' },
    rose:    { hex: '#f43f5e', rgb: '244, 63, 94' },
    amber:   { hex: '#f59e0b', rgb: '245, 158, 11' }
};

export const ACCENT_COLORS = (Object.keys(ACCENT_RAW) as AccentColor[]).reduce((acc, key) => {
    const { hex, rgb } = ACCENT_RAW[key];
    acc[key] = {
        primary: hex,
        glow: `rgba(${rgb}, 0.15)`,
        bg: `rgba(${rgb}, 0.04)`,
        bgHover: `rgba(${rgb}, 0.08)`,
        border: `rgba(${rgb}, 0.25)`,
        statusBg: `rgba(${rgb}, 0.1)`,
        dotGlow: `rgba(${rgb}, 0.6)`
    };
    return acc;
}, {} as Record<AccentColor, AccentDetails>);

export const ACCENT_VARS = [
    '--svf-primary',
    '--svf-primary-glow',
    '--svf-primary-bg',
    '--svf-primary-bg-hover',
    '--svf-primary-border',
    '--svf-primary-status-bg'
] as const;

export function applyAccentVariables(el: HTMLElement, accent: AccentColor): void {
    const current = ACCENT_COLORS[accent] || ACCENT_COLORS.emerald;
    el.style.setProperty('--svf-primary', current.primary);
    el.style.setProperty('--svf-primary-glow', current.glow);
    el.style.setProperty('--svf-primary-bg', current.bg);
    el.style.setProperty('--svf-primary-bg-hover', current.bgHover);
    el.style.setProperty('--svf-primary-border', current.border);
    el.style.setProperty('--svf-primary-status-bg', current.statusBg);
}

export function removeAccentVariables(el: HTMLElement): void {
    for (const key of ACCENT_VARS) {
        el.style.removeProperty(key);
    }
}

/** Persisted user settings */
export interface Settings {
    liked: string[];
    disliked: string[];
    dislikeMode: DislikeMode;
    showTrigger: boolean;
    accent: AccentColor;
    gistToken: string;
    gistId: string;
    syncEnabled: boolean;
}

/** Per-engine DOM query config */
export interface EngineConfig {
    name: string;
    /** CSS selector for the container that directly wraps result cards */
    containerSelector: string;
    /** CSS selector for individual result cards (children of container) */
    itemSelector: string;
    /**
     * Extract the canonical result URL from a result item.
     * Returns null if the item isn't a real organic result.
     */
    extractUrl(item: Element): string | null;
    /** Optional check to verify if the engine should activate on the current page */
    shouldActivate?(url: URL): boolean;
}

/** Internal record stored per scanned result item */
export interface ItemRecord {
    id: string;
    domain: string;
    match: DomainMatch;
}
