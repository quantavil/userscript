import { GM_getValue, GM_setValue, GM_registerMenuCommand, GM_xmlhttpRequest } from '$'
import type { Config, StoreKeys, AIPrompt, State, GMRequestOptions, GMResponse, HotkeySpec } from './types'

// ─────────────────────────────────────────────────────────────
// Store Keys
// ─────────────────────────────────────────────────────────────

export const STORE_KEYS: StoreKeys = Object.freeze({
  dict: 'sae.dict.v1',
  keys: 'sae.keys.v1',
  apiKey: 'sae.gemini.apiKey.v1',
  customPrompts: 'sae.prompts.v1',
  disabledBuiltins: 'sae.disabledBuiltins.v1',
})

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

export const CONFIG: Config = {
  trigger: { code: 'Space', shift: true },
  palette: { code: 'KeyP', alt: true },
  aiMenu: { code: 'KeyG', alt: true },
  maxAbbrevLen: 80,
  styleId: 'sae-styles',
  clipboardReadTimeoutMs: 350,
  searchDebounceMs: 150,
  toast: Object.freeze({
    defaultMs: 2200,
    shortMs: 1200,
  }),
  ui: Object.freeze({
    menuWidth: 360,
    menuHeight: 260,
    previewMaxChars: 150,
    previewExpandedChars: 2000,
    spacing: { sm: 8, md: 16 },
    inlinePrompts: 4,
  }),
  gemini: Object.freeze({
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    model: 'gemini-2.5-flash-lite',
    temperature: 0.15,
    timeoutMs: 20000,
    maxInputChars: 32000,
  }),
}

// ─────────────────────────────────────────────────────────────
// Built-in Prompts & Default Dict
// ─────────────────────────────────────────────────────────────

export const BUILTIN_PROMPTS: readonly AIPrompt[] = Object.freeze([
  { id: 'grammar', icon: '✨', label: 'Fix Grammar', prompt: 'Fix grammar, spelling, and punctuation. Improve clarity. Preserve meaning and original language. Return only the corrected text, no explanations.' },
  { id: 'expand', icon: '📝', label: 'Expand', prompt: 'Expand this text with more detail, examples, and depth. Maintain the original tone. Return only the expanded text.' },
  { id: 'summarize', icon: '📋', label: 'Summarize', prompt: 'Summarize this text concisely in 2-3 sentences. Capture key points. Return only the summary.' },
  { id: 'formal', icon: '💼', label: 'Formal', prompt: 'Rewrite in a formal, professional tone suitable for business communication. Return only the rewritten text.' },
  { id: 'friendly', icon: '😊', label: 'Friendly', prompt: 'Rewrite in a warm, friendly, conversational tone. Return only the rewritten text.' },
  { id: 'concise', icon: '🎯', label: 'Concise', prompt: 'Make this shorter and more direct. Remove unnecessary words. Return only the concise text.' },
])

export const DEFAULT_DICT: Readonly<Record<string, string>> = Object.freeze({
  brb: 'Be right back.',
  ty: 'Thank you!',
  hth: 'Hope this helps!',
  opt: 'Optional: {{cursor}}',
  log: 'Log Entry - {{date:iso}} {{time}}: {{cursor}}',
  track: 'The tracking number for your order is {{clipboard}}. {{cursor}}',
  dt: 'Today is {{day}}, {{date:long}} at {{time}}.',
})

// ─────────────────────────────────────────────────────────────
// GM Abstraction Layer
// ─────────────────────────────────────────────────────────────

export const GMX = {
  get: <T>(key: string, def: T): T => GM_getValue(key, def),
  set: <T>(key: string, val: T): void => GM_setValue(key, val),
  menu: (title: string, fn: () => void): unknown => GM_registerMenuCommand(title, fn),

  request: (opts: GMRequestOptions): Promise<GMResponse> =>
    new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: opts.method ?? 'GET',
        url: opts.url,
        headers: opts.headers ?? {},
        data: opts.data,
        timeout: opts.timeout ?? CONFIG.gemini.timeoutMs,
        onload: (r: { status: number; responseText: string }) =>
          resolve({ status: r.status, text: r.responseText }),
        onerror: () => reject(new Error('Network error')),
        ontimeout: () => reject(new Error('Timeout')),
      })
    }),
}

// ─────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────

export const state: State = {
  dict: {},
  apiKey: '',
  apiKeyIndex: 0,
  customPrompts: [],
  disabledBuiltins: [],
  lastEditableEl: null,
  paletteIndex: 0,
  aiMenuIndex: 0,
}

// ─────────────────────────────────────────────────────────────
// Prompt Helpers
// ─────────────────────────────────────────────────────────────

export const isBuiltinEnabled = (id: string): boolean =>
  !state.disabledBuiltins.includes(id)

export const isCustomEnabled = (p: AIPrompt): boolean =>
  p.enabled !== false

export const getEnabledPrompts = (): AIPrompt[] => [
  ...BUILTIN_PROMPTS.filter(p => isBuiltinEnabled(p.id)),
  ...state.customPrompts.filter(isCustomEnabled),
]

export const getAllPrompts = (): AIPrompt[] =>
  [...BUILTIN_PROMPTS, ...state.customPrompts]

// ─────────────────────────────────────────────────────────────
// State Persistence
// ─────────────────────────────────────────────────────────────

export function normalizeDict(obj: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof k === 'string' && typeof v === 'string' && k.trim()) {
        out[k.trim().toLowerCase()] = v
      }
    }
  }
  return out
}

export function loadState(): void {
  state.dict = normalizeDict(GMX.get(STORE_KEYS.dict, DEFAULT_DICT))
  if (!Object.keys(state.dict).length) state.dict = normalizeDict(DEFAULT_DICT)

  state.apiKey = GMX.get(STORE_KEYS.apiKey, '')
  state.customPrompts = GMX.get<AIPrompt[]>(STORE_KEYS.customPrompts, [])
    .map(p => ({ ...p, enabled: p.enabled !== false }))
  state.disabledBuiltins = GMX.get(STORE_KEYS.disabledBuiltins, [])


  const savedKeys = GMX.get<{ palette?: HotkeySpec; aiMenu?: HotkeySpec }>(STORE_KEYS.keys, {})
  if (savedKeys.palette) Object.assign(CONFIG.palette, savedKeys.palette)
  if (savedKeys.aiMenu) Object.assign(CONFIG.aiMenu, savedKeys.aiMenu)
}