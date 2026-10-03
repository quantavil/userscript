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
export type SolveBy = 'image' | 'audio';

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
    /** Grid only: build the picture from the tiles (each tile is its own image, e.g. hCaptcha). */
    compose: v.optional(v.boolean(), false),
    /** Grid only: answer the pictures, or switch the challenge to audio. The user's choice, not a fallback. */
    solveBy: v.optional(v.picklist(['image', 'audio']), 'image'),
    /** Audio: button that switches the challenge to audio. */
    audioButton: optionalSelector,
    /** Audio: button that switches back to pictures. */
    imageButton: optionalSelector,
    /** Audio: the <audio>/<source> element or download link holding the clip. */
    audioSource: optionalSelector,
    /** Audio: text box for what was heard. */
    audioInput: optionalSelector,
    /** Checkbox that opens the challenge ("I'm not a robot"); lives in its own frame. Used for pass stats. */
    checkbox: optionalSelector,
    /** Tick that checkbox automatically. Off by default: it can raise the site's suspicion. */
    autoCheckbox: v.optional(v.boolean(), false),
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
  // Errors land on the field itself so the editor can show them in place.
  v.forward(
    v.partialCheck(
      [['kind'], ['solveBy'], ['audioSource']],
      (r) => r.kind !== 'grid' || r.solveBy !== 'audio' || Boolean(r.audioSource),
      'Required for audio',
    ),
    ['audioSource'],
  ),
  v.forward(
    v.partialCheck(
      [['kind'], ['solveBy'], ['audioInput']],
      (r) => r.kind !== 'grid' || r.solveBy !== 'audio' || Boolean(r.audioInput),
      'Required for audio',
    ),
    ['audioInput'],
  ),
);
export type SiteRule = v.InferOutput<typeof SiteRuleSchema>;
export type SiteRuleInput = v.InferInput<typeof SiteRuleSchema>;

const providerId = v.picklist(PROVIDER_IDS);

const position = {
  x: v.optional(v.number()),
  y: v.optional(v.number()),
};

export const SettingsSchema = v.object({
  provider: v.optional(providerId, 'gemini'),
  keys: v.optional(v.record(providerId, v.string()), {}),
  models: v.optional(v.record(providerId, v.string()), {}),
  /** Speech-to-text model per provider (audio captchas). Empty = the provider's default. */
  audioModels: v.optional(v.record(providerId, v.string()), {}),
  /** Only used by the custom OpenAI-compatible endpoint (`openai`). */
  openaiBaseUrl: v.optional(v.string(), ''),
  autoSolve: v.optional(v.boolean(), true),
  ui: v.optional(
    v.object({
      minimized: v.optional(v.boolean(), false),
      ...position,
      /** Widget state inside iframes (challenge popups are small), kept apart from the page's. */
      frame: v.optional(v.object({ minimized: v.optional(v.boolean(), true), ...position }), {}),
    }),
    {},
  ),
});
export type Settings = v.InferOutput<typeof SettingsSchema>;
export type WidgetUi = { minimized: boolean; x?: number; y?: number };

export const ExportSchema = v.object({
  app: v.literal('universal-captcha-solver'),
  version: v.literal(2),
  sites: v.record(v.string(), v.unknown()),
});

export const defaultSettings = (): Settings => v.parse(SettingsSchema, {});

const count = v.optional(v.pipe(v.number(), v.minValue(0)), 0);
export const StatSchema = v.object({
  /** Requests sent: one per grid round, audio clip or text captcha. */
  tries: count,
  /** Answers filled in or clicked. */
  answered: count,
  errors: count,
  /** Confirmed passes (reCAPTCHA: the checkbox turned green). */
  passes: count,
  /** Total time of answered tries, for the average. */
  ms: count,
});
export type Stat = v.InferOutput<typeof StatSchema>;
/** pattern -> model -> counters */
export const StatsSchema = v.record(v.string(), v.record(v.string(), StatSchema));
export type Stats = v.InferOutput<typeof StatsSchema>;
