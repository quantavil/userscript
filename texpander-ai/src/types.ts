// ─────────────────────────────────────────────────────────────
// Core Types
// ─────────────────────────────────────────────────────────────

export interface HotkeySpec {
  code: string
  shift?: boolean
  alt?: boolean
  ctrl?: boolean
  meta?: boolean
}

export interface GeminiConfig {
  readonly endpoint: string
  readonly model: string
  readonly temperature: number
  readonly timeoutMs: number
  readonly maxInputChars: number
}

export interface Config {
  trigger: HotkeySpec
  palette: HotkeySpec
  aiMenu: HotkeySpec
  readonly maxAbbrevLen: number
  readonly styleId: string
  readonly toast: { readonly throttleMs: number }
  readonly clipboardReadTimeoutMs: number
  readonly searchDebounceMs: number
  readonly gemini: GeminiConfig
}

export interface StoreKeys {
  readonly dict: string
  readonly keys: string
  readonly apiKey: string
  readonly customPrompts: string
  readonly disabledBuiltins: string
  readonly settings: string
}

export interface AIPrompt {
  readonly id: string
  icon: string
  label: string
  prompt: string
  enabled?: boolean
}

export interface Settings {
  aiMenuInlineCount: number
}

export interface State {
  dict: Record<string, string>
  apiKey: string
  apiKeyIndex: number
  customPrompts: AIPrompt[]
  disabledBuiltins: string[]
  settings: Settings
  lastEditableEl: HTMLElement | null
  activeIndex: number
}

// ─────────────────────────────────────────────────────────────
// Editor Types
// ─────────────────────────────────────────────────────────────

export interface InputContext {
  readonly kind: 'input'
  readonly el: HTMLInputElement | HTMLTextAreaElement
  readonly start: number
  readonly end: number
}

export interface CEContext {
  readonly kind: 'ce'
  readonly root: HTMLElement
  readonly range: Range
}

export type EditContext = InputContext | CEContext

export interface Editor {
  getText(): string
  replace(text: string): void
}

export interface TemplateResult {
  readonly text: string
  readonly cursor: number
}

// ─────────────────────────────────────────────────────────────
// GM Types
// ─────────────────────────────────────────────────────────────

export interface GMRequestOptions {
  method?: 'GET' | 'POST'
  url: string
  headers?: Record<string, string>
  data?: string
  timeout?: number
}

export interface GMResponse {
  readonly status: number
  readonly text: string
}