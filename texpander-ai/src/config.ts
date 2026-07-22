import { GM_getValue, GM_setValue, GM_registerMenuCommand, GM_xmlhttpRequest } from '$'
import type { Config, AIPrompt, State, GMRequestOptions, GMResponse, HotkeySpec } from './types'

export const STORE_KEYS = {
  dict: 'sae.dict.v1',
  keys: 'sae.keys.v1',
  apiKey: 'sae.gemini.apiKey.v1',
  customPrompts: 'sae.prompts.v1',
  disabledBuiltins: 'sae.disabledBuiltins.v1',
} as const

export const CONFIG: Config = {
  trigger: { code: 'Space', shift: true },
  palette: { code: 'KeyP', alt: true },
  aiMenu: { code: 'KeyG', alt: true },
  maxAbbrevLen: 80,
  styleId: 'sae-styles',
  clipboardReadTimeoutMs: 350,
  searchDebounceMs: 50,
  toast: { defaultMs: 2200, shortMs: 1200 },
  ui: {
    menuWidth: 360,
    menuHeight: 260,
    previewMaxChars: 120,
    spacing: { sm: 8, md: 16 },
    inlinePrompts: 4,
  },
  gemini: {
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    model: 'gemini-2.5-flash-lite',
    temperature: 0.15,
    timeoutMs: 20000,
    maxInputChars: 32000,
  },
}

export const BUILTIN_PROMPTS: readonly AIPrompt[] = [
  { id: 'grammar', label: 'Fix Grammar', prompt: 'Fix grammar, spelling, and punctuation. Improve clarity. Preserve meaning and original language. Return only the corrected text, no explanations.' },
  { id: 'expand', label: 'Expand', prompt: 'Expand this text with more detail, examples, and depth. Maintain the original tone. Return only the expanded text.' },
  { id: 'summarize', label: 'Summarize', prompt: 'Summarize this text concisely in 2-3 sentences. Capture key points. Return only the summary.' },
  { id: 'formal', label: 'Formal', prompt: 'Rewrite in a formal, professional tone suitable for business communication. Return only the rewritten text.' },
  { id: 'friendly', label: 'Friendly', prompt: 'Rewrite in a warm, friendly, conversational tone. Return only the rewritten text.' },
  { id: 'concise', label: 'Concise', prompt: 'Make this shorter and more direct. Remove unnecessary words. Return only the concise text.' },
]

export const DEFAULT_DICT: Record<string, string> = {
  brb: 'Be right back.',
  ty: 'Thank you!',
  hth: 'Hope this helps!',
  opt: 'Optional: {{cursor}}',
  log: 'Log Entry - {{date:iso}} {{time}}: {{cursor}}',
  track: 'The tracking number for your order is {{clipboard}}. {{cursor}}',
  dt: 'Today is {{day}}, {{date:long}} at {{time}}.',
}

export const GMX = {
  get: <T>(key: string, def: T): T => GM_getValue(key, def),
  set: <T>(key: string, val: T): void => GM_setValue(key, val),
  menu: (title: string, fn: () => void) => GM_registerMenuCommand(title, fn),
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

export const state: State = {
  dict: {},
  apiKey: '',
  apiKeyIndex: 0,
  customPrompts: [],
  disabledBuiltins: [],
  lastEditableEl: null,
  paletteIndex: 0,
  aiMenuIndex: 0,
  hotkeys: { palette: { ...CONFIG.palette }, aiMenu: { ...CONFIG.aiMenu } },
}

export const isBuiltinEnabled = (id: string): boolean => !state.disabledBuiltins.includes(id)
export const isCustomEnabled = (p: AIPrompt): boolean => p.enabled !== false
export const getAllPrompts = (): AIPrompt[] => [...BUILTIN_PROMPTS, ...state.customPrompts]

export function normalizeDict(obj: unknown): Record<string, string> {
  if (!obj || typeof obj !== 'object') return {}
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([k, v]) => typeof k === 'string' && typeof v === 'string' && k.trim())
      .map(([k, v]) => [k.trim().toLowerCase(), v as string])
  )
}

export function loadState(): void {
  state.dict = normalizeDict(GMX.get(STORE_KEYS.dict, DEFAULT_DICT))
  if (!Object.keys(state.dict).length) state.dict = normalizeDict(DEFAULT_DICT)

  state.apiKey = GMX.get(STORE_KEYS.apiKey, '')
  state.customPrompts = GMX.get<AIPrompt[]>(STORE_KEYS.customPrompts, [])
    .map(p => ({ ...p, enabled: p.enabled !== false }))
  state.disabledBuiltins = GMX.get(STORE_KEYS.disabledBuiltins, [])

  const saved = GMX.get<Partial<Record<string, HotkeySpec>>>(STORE_KEYS.keys, {})
  if (saved.palette) state.hotkeys.palette = saved.palette
  if (saved.aiMenu) state.hotkeys.aiMenu = saved.aiMenu
}