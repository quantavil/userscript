import * as v from 'valibot';
import { type SiteRule, SiteRuleSchema } from './schema.ts';

/**
 * reCAPTCHA v2 image challenge. The grid lives in Google's challenge iframe (`…/bframe`); the
 * checkbox frame (`…/anchor`) matches the same pattern but has no grid image, so nothing runs or
 * mounts there and the checkbox stays with the human. One image holds the whole 3x3 or 4x4 grid;
 * the blue button keeps its id whether it reads Verify, Next or Skip.
 */
const recaptchaV2 = v.parse(SiteRuleSchema, {
  kind: 'grid',
  captcha: 'img[class^="rc-image-tile-"]',
  tiles: 'td.rc-imageselect-tile',
  instruction: '.rc-imageselect-desc-wrapper',
  submit: '#recaptcha-verify-button',
  gridSize: 0,
});

export const PRESETS: { id: string; label: string; sites: Record<string, SiteRule> }[] = [
  {
    id: 'recaptcha-v2',
    label: 'reCAPTCHA v2 image grid',
    sites: {
      'www.google.com/recaptcha/*': recaptchaV2,
      'www.recaptcha.net/recaptcha/*': recaptchaV2,
    },
  },
];
