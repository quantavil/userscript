import { IDS } from './config';
import { ICON } from './dom';
import { getStoredTheme, setStoredTheme } from './storage';

/**
 * `auto` is not resolved in JS — the stylesheet maps it onto GitHub's own Primer
 * variables, so the panel tracks light, dark, dimmed and high-contrast for free
 * and needs no observer on `data-color-mode`.
 */
export type Theme = 'auto' | 'light' | 'dark';

const CYCLE: Theme[] = ['auto', 'light', 'dark'];

export const LABEL: Record<Theme, string> = {
  auto: 'Theme: matches GitHub',
  light: 'Theme: light',
  dark: 'Theme: dark'
};

export const THEME_ICON: Record<Theme, string> = {
  auto: ICON.desktop,
  light: ICON.sun,
  dark: ICON.moon
};

export function getTheme(): Theme {
  const stored = getStoredTheme();
  return CYCLE.includes(stored as Theme) ? (stored as Theme) : 'auto';
}

export function applyTheme(theme: Theme) {
  setStoredTheme(theme);
  for (const id of [IDS.panel, IDS.fab]) {
    const node = document.getElementById(id);
    if (node) node.dataset.theme = theme;
  }
}

/** Cycles auto → light → dark → auto, so an override is always releasable. */
export const nextTheme = (theme: Theme): Theme => CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length]!;
