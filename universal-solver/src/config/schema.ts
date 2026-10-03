import * as v from 'valibot';

export const PROVIDER_IDS = ['gemini', 'groq', 'openrouter', 'openai'] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

/** Syntax-only check; returns true outside a DOM (unit tests, workers). */
export function isValidSelector(selector: string): boolean {
  if (typeof document === 'undefined') return true;
  try {
    document.createDocumentFragment().querySelector(selector);
    return true;
  } catch {
    return false;
  }
}

const selector = v.pipe(v.string(), v.trim(), v.nonEmpty('Required'), v.check(isValidSelector, 'Invalid CSS selector'));
const optionalSelector = v.optional(
  v.pipe(
    v.string(),
    v.trim(),
    v.check((s) => !s || isValidSelector(s), 'Invalid CSS selector'),
  ),
  '',
);

export const CAPTCHA_KINDS = ['text', 'math', 'grid'] as const;
export type CaptchaKind = (typeof CAPTCHA_KINDS)[number];

export const SiteRuleSchema = v.pipe(
  v.object({
    captcha: selector,
    /** Text field for the answer. Required for text/math; unused for image grids. */
    input: optionalSelector,
    /** Optional button to click after a successful fill (or the grid's Verify button). Empty = don't submit. */
    submit: optionalSelector,
    kind: v.optional(v.picklist(CAPTCHA_KINDS), 'text'),
    /** Grid only: clickable tiles in reading order. Empty = click by position over the captcha image. */
    tiles: optionalSelector,
    /** Grid only: element whose text says what to select ("Select all images with buses"). */
    instruction: optionalSelector,
    /** Grid only: tiles per side. 0 = infer from the tile count (default 3). */
    gridSize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(8)), 0),
    charset: v.optional(v.picklist(['alnum', 'alpha', 'digits', 'any']), 'alnum'),
    caseMode: v.optional(v.picklist(['keep', 'upper', 'lower']), 'keep'),
    minLength: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(32)), 3),
    /** 0 = unlimited */
    maxLength: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(64)), 0),
    /** Extra free-text instruction appended to the prompt. */
    hint: v.optional(v.pipe(v.string(), v.maxLength(200)), ''),
    auto: v.optional(v.boolean(), true),
    enabled: v.optional(v.boolean(), true),
  }),
  v.forward(
    v.partialCheck([['kind'], ['input']], (r) => r.kind === 'grid' || Boolean(r.input), 'Required'),
    ['input'],
  ),
);
export type SiteRule = v.InferOutput<typeof SiteRuleSchema>;
export type SiteRuleInput = v.InferInput<typeof SiteRuleSchema>;

const providerId = v.picklist(PROVIDER_IDS);

export const SettingsSchema = v.object({
  provider: v.optional(providerId, 'gemini'),
  keys: v.optional(v.record(providerId, v.string()), {}),
  models: v.optional(v.record(providerId, v.string()), {}),
  /** Only used by the custom OpenAI-compatible endpoint (`openai`). */
  openaiBaseUrl: v.optional(v.string(), ''),
  autoSolve: v.optional(v.boolean(), true),
  ui: v.optional(
    v.object({
      minimized: v.optional(v.boolean(), false),
      x: v.optional(v.number()),
      y: v.optional(v.number()),
    }),
    {},
  ),
});
export type Settings = v.InferOutput<typeof SettingsSchema>;

export const ExportSchema = v.object({
  app: v.literal('universal-captcha-solver'),
  version: v.literal(2),
  sites: v.record(v.string(), v.unknown()),
});

export const defaultSettings = (): Settings => v.parse(SettingsSchema, {});
