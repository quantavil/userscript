import * as v from 'valibot';
import { type SiteRule, SiteRuleSchema } from './schema.ts';

/**
 * reCAPTCHA v2. The grid and its audio version live in Google's challenge iframe (`…/bframe`);
 * the checkbox lives in `…/anchor`. One pattern covers both frames: each frame only acts on the
 * elements it actually contains. One image holds the whole 3x3 or 4x4 grid, and the blue button
 * keeps its id whether it reads Verify, Next or Skip.
 */
const recaptchaV2 = v.parse(SiteRuleSchema, {
  kind: 'grid',
  captcha: 'img[class^="rc-image-tile-"]',
  tiles: 'td.rc-imageselect-tile',
  instruction: '.rc-imageselect-desc-wrapper',
  submit: '#recaptcha-verify-button',
  gridSize: 0,
  audioButton: '#recaptcha-audio-button',
  imageButton: '#recaptcha-image-button',
  audioSource: '#audio-source',
  audioInput: '#audio-response',
  checkbox: '#recaptcha-anchor',
});

/**
 * hCaptcha image grid (experimental: selectors not verified against the live widget). Each tile
 * is its own CSS background picture, so the grid is built from the tiles. hCaptcha often serves
 * other challenge types (click a point, drag); those are not handled.
 */
const hcaptcha = v.parse(SiteRuleSchema, {
  kind: 'grid',
  captcha: '.task-grid',
  tiles: '.task-image',
  compose: true,
  instruction: '.prompt-text',
  submit: '.button-submit',
  gridSize: 0,
  checkbox: '#checkbox',
});

export interface Preset {
  id: string;
  label: string;
  /** Selectors not verified against the live widget; shown with a "beta" tag. */
  experimental?: boolean;
  sites: Record<string, SiteRule>;
}

export const PRESETS: Preset[] = [
  {
    id: 'recaptcha-v2',
    label: 'reCAPTCHA v2',
    sites: { 'www.google.com/recaptcha/*': recaptchaV2, 'www.recaptcha.net/recaptcha/*': recaptchaV2 },
  },
  {
    id: 'hcaptcha',
    label: 'hCaptcha',
    experimental: true,
    sites: { 'newassets.hcaptcha.com': hcaptcha },
  },
];

/** Choices the user makes on a preset rule; updating the preset keeps them. */
const USER_FIELDS = ['enabled', 'auto', 'solveBy', 'autoCheckbox', 'hint'] as const;

const comparable = (r: SiteRule) => {
  const copy: Partial<SiteRule> = { ...r };
  for (const k of USER_FIELDS) delete copy[k];
  return JSON.stringify(copy);
};

export type PresetState = 'missing' | 'outdated' | 'current';

export function presetState(preset: Preset, sites: Record<string, SiteRule>): PresetState {
  const entries = Object.entries(preset.sites);
  if (entries.some(([k]) => !sites[k])) return 'missing';
  return entries.every(([k, r]) => comparable(sites[k] as SiteRule) === comparable(r)) ? 'current' : 'outdated';
}

/** The preset's rules, keeping the user's own choices on rules they already have. */
export function presetRules(preset: Preset, sites: Record<string, SiteRule>): Record<string, SiteRule> {
  const out: Record<string, SiteRule> = {};
  for (const [k, r] of Object.entries(preset.sites)) {
    const mine = sites[k];
    const kept = mine ? Object.fromEntries(USER_FIELDS.map((f) => [f, mine[f]])) : {};
    out[k] = { ...r, ...kept };
  }
  return out;
}
