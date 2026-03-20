export interface HotkeySpec {
  code: string
  shift?: boolean
  alt?: boolean
  ctrl?: boolean
  meta?: boolean
}

export interface Config {
  readonly trigger: HotkeySpec
  readonly palette: HotkeySpec
  readonly aiMenu: HotkeySpec
  readonly maxAbbrevLen: number
  readonly styleId: string
  readonly clipboardReadTimeoutMs: number
  readonly searchDebounceMs: number
  readonly toast: { readonly defaultMs: number; readonly shortMs: number }
  readonly gemini: {
    readonly endpoint: string
    readonly model: string
    readonly temperature: number
    readonly timeoutMs: number
    readonly maxInputChars: number
  }
  readonly ui: {
    readonly menuWidth: number
    readonly menuHeight: number
    readonly previewMaxChars: number
    readonly spacing: { readonly sm: number; readonly md: number }
    readonly inlinePrompts: number
  }
}

export interface AIPrompt {
  readonly id: string
  label: string
  prompt: string
  enabled?: boolean
}

export interface State {
  dict: Record<string, string>
  apiKey: string
  apiKeyIndex: number
  customPrompts: AIPrompt[]
  disabledBuiltins: string[]
  lastEditableEl: HTMLElement | null
  paletteIndex: number
  aiMenuIndex: number
  hotkeys: { palette: HotkeySpec; aiMenu: HotkeySpec }
}

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