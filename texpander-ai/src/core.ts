import type { EditContext, Editor, TemplateResult, HotkeySpec } from './types'
import { CONFIG, state, GMX } from './config'

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────

export const $ = <T extends Element = Element>(s: string, r: ParentNode = document): T | null =>
  r.querySelector<T>(s)

export const $$ = <T extends Element = Element>(s: string, r: ParentNode = document): T[] =>
  Array.from(r.querySelectorAll<T>(s))

export const debounce = <T extends (...args: unknown[]) => void>(fn: T, ms: number) => {
  let t: ReturnType<typeof setTimeout>
  return (...a: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) }
}

export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v))

const pad2 = (n: number): string => String(n).padStart(2, '0')

const HTML_ENTITIES = Object.freeze<Record<string, string>>({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})

export const escHtml = (s: string): string =>
  String(s).replace(/[&<>"']/g, c => HTML_ENTITIES[c] ?? c)

export const genId = (): string => 'c' + Math.random().toString(36).slice(2, 9)

export const smartTruncate = (text: string, maxLen = 100): string => {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLen) return cleaned
  const half = Math.floor((maxLen - 5) / 2)
  return `${cleaned.slice(0, half).trim()} ... ${cleaned.slice(-half).trim()}`
}

// Word char detection with Unicode
const isWordChar = (() => {
  try { const re = /[\p{L}\p{N}_-]/u; return (c: string) => re.test(c) }
  catch { return (c: string) => /[\w-]/.test(c) }
})()

// ─────────────────────────────────────────────────────────────
// Input Event Dispatch
// ─────────────────────────────────────────────────────────────

export function dispatchInput(el: HTMLElement, data: string): void {
  try {
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data }))
  } catch {
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

// ─────────────────────────────────────────────────────────────
// Editable Detection
// ─────────────────────────────────────────────────────────────

export function getEditable(el: EventTarget | null): HTMLElement | null {
  if (!el || !(el instanceof HTMLElement)) return null

  if (el instanceof HTMLTextAreaElement) return el
  if (el instanceof HTMLInputElement) {
    const t = (el.type || 'text').toLowerCase()
    return ['text', 'search', 'url', 'email', 'tel'].includes(t) ? el : null
  }

  let curr: HTMLElement | null = el
  while (curr) {
    if (curr.nodeType === 1 && curr.isContentEditable) return curr
    curr = curr.parentElement ?? (curr.parentNode instanceof ShadowRoot ? curr.parentNode.host as HTMLElement : null)
    if (!curr || curr === document.documentElement) break
  }
  return null
}

export function captureContext(): EditContext | null {
  let active = document.activeElement as HTMLElement | null
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement as HTMLElement

  const el = getEditable(active)
  if (!el) return null

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return { kind: 'input', el, start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 }
  }

  const sel = window.getSelection?.()
  if (!sel?.rangeCount) return null
  return { kind: 'ce', root: el, range: sel.getRangeAt(0).cloneRange() }
}

export function getContextOrFallback(): EditContext | null {
  let ctx = captureContext()
  if (ctx) return ctx

  if (state.lastEditable) {
    const el = state.lastEditable.kind === 'input' ? state.lastEditable.el : state.lastEditable.root
    if (el?.isConnected) {
      try { el.focus({ preventScroll: true }) } catch {}
      ctx = captureContext()
      if (ctx) return ctx
    }
  }

  if (state._lastFocusedEditable?.isConnected) {
    try { state._lastFocusedEditable.focus({ preventScroll: true }) } catch {}
    return captureContext()
  }
  return null
}

// ─────────────────────────────────────────────────────────────
// Editor Abstraction
// ─────────────────────────────────────────────────────────────

export function makeEditor(ctx: EditContext | null): Editor | null {
  if (!ctx) return null

  if (ctx.kind === 'input') {
    const el = ctx.el
    return {
      getText() {
        const s = el.selectionStart ?? 0, e = el.selectionEnd ?? 0
        return s !== e ? el.value.slice(s, e) : el.value
      },
      replace(text: string) {
        const s = el.selectionStart ?? 0, e = el.selectionEnd ?? 0
        const [start, end] = s !== e ? [s, e] : [0, el.value.length]
        el.setRangeText(text, start, end, 'end')
        dispatchInput(el, text)
      },
    }
  }

  const root = ctx.root
  return {
    getText() {
      const sel = window.getSelection?.()
      if (sel?.rangeCount && !sel.isCollapsed) return sel.toString()
      const r = document.createRange()
      r.selectNodeContents(root)
      return r.toString()
    },
    replace(text: string) {
      const sel = window.getSelection?.()
      if (!sel) return

      if (sel.isCollapsed) {
        const r = document.createRange()
        r.selectNodeContents(root)
        sel.removeAllRanges()
        sel.addRange(r)
      }

      if (!document.execCommand('insertText', false, text)) {
        if (!document.execCommand('insertHTML', false, escHtml(text).replace(/\n/g, '<br>'))) {
          const r = sel.getRangeAt(0)
          r.deleteContents()
          r.insertNode(document.createTextNode(text))
        }
      }
      dispatchInput(root, text)
    },
  }
}

// ─────────────────────────────────────────────────────────────
// Template System
// ─────────────────────────────────────────────────────────────

type TagResult = { text: string; cursor?: boolean }

const formatDate = (d: Date, arg = 'iso'): string => {
  const a = arg.toLowerCase()
  if (a === 'long') return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  if (a === 'short') return d.toLocaleDateString()
  if (a === 'mdy' || a === 'us') return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`
  if (a === 'dmy') return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const formatTime = (d: Date, arg = '12'): string => {
  if (arg === '24' || arg === '24h') return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  let h = d.getHours()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${pad2(h)}:${pad2(d.getMinutes())} ${ampm}`
}

const formatDay = (d: Date, arg = 'long'): string =>
  d.toLocaleDateString(undefined, { weekday: arg.toLowerCase() === 'short' ? 'short' : 'long' })

async function readClipboard(): Promise<string> {
  try {
    if (!navigator.clipboard?.readText) return ''
    return await Promise.race([
      navigator.clipboard.readText(),
      new Promise<string>(r => setTimeout(() => r(''), CONFIG.clipboardReadTimeoutMs)),
    ]) || ''
  } catch { return '' }
}

const TAGS: Readonly<Record<string, (arg: string, now: Date) => Promise<TagResult>>> = Object.freeze({
  cursor: async () => ({ text: '', cursor: true }),
  date: async (arg, now) => ({ text: formatDate(now, arg) }),
  time: async (arg, now) => ({ text: formatTime(now, arg) }),
  day: async (arg, now) => ({ text: formatDay(now, arg) }),
  clipboard: async () => ({ text: await readClipboard() }),
})

export async function renderTemplate(tmpl: string): Promise<TemplateResult> {
  const now = new Date()
  let out = '', cursor = -1, idx = 0
  const re = /\{\{\s*(\w+)(?::([^}]+))?\s*\}\}/g
  let m: RegExpExecArray | null

  while ((m = re.exec(tmpl))) {
    out += tmpl.slice(idx, m.index)
    idx = m.index + m[0].length
    const handler = TAGS[m[1].toLowerCase()]
    if (!handler) { out += m[0]; continue }
    const res = await handler((m[2] || '').trim(), now)
    if (res.cursor && cursor < 0) cursor = out.length
    out += res.text ?? ''
  }
  out += tmpl.slice(idx)
  return { text: out, cursor: cursor >= 0 ? cursor : out.length }
}

// ─────────────────────────────────────────────────────────────
// Abbreviation Expansion
// ─────────────────────────────────────────────────────────────

function lastTextIn(node: Node | null): Text | null {
  if (!node) return null
  if (node.nodeType === 3) return node as Text
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
  let last: Text | null = null, n: Text | null
  while ((n = walker.nextNode() as Text | null)) last = n
  return last
}

function moveRangeBack(range: Range, n: number, root: HTMLElement): void {
  let remaining = n
  while (remaining > 0) {
    const sc = range.startContainer, so = range.startOffset
    if (sc.nodeType === 3) {
      const move = Math.min(so, remaining)
      range.setStart(sc, so - move)
      remaining -= move
      if (remaining === 0) break
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let prev: Text | null = null, node: Text | null
      while ((node = walker.nextNode() as Text | null)) { if (node === sc) break; prev = node }
      if (!prev) break
      range.setStart(prev, prev.nodeValue!.length)
    } else {
      if (so > 0) {
        const child = sc.childNodes[so - 1]
        const textNode = lastTextIn(child)
        if (textNode) range.setStart(textNode, textNode.nodeValue!.length)
        else break
      } else break
    }
  }
}

export async function doExpansion(): Promise<void> {
  const ctx = captureContext()
  if (!ctx) return

  let token = '', tokenStart = 0, tokenEnd = 0, tokenRange: Range | null = null

  if (ctx.kind === 'input') {
    const el = ctx.el
    if (ctx.start !== ctx.end) return
    const text = el.value.slice(0, ctx.start)
    let i = text.length
    while (i > 0 && isWordChar(text[i - 1]) && text.length - i < CONFIG.maxAbbrevLen) i--
    token = text.slice(i)
    tokenStart = i
    tokenEnd = ctx.start
  } else {
    const sel = window.getSelection?.()
    if (!sel?.rangeCount || !sel.isCollapsed) return
    const r = sel.getRangeAt(0)
    const prefixRange = document.createRange()
    prefixRange.selectNodeContents(ctx.root)
    try { prefixRange.setEnd(r.startContainer, r.startOffset) } catch { return }
    const prefix = prefixRange.toString()
    let i = prefix.length
    while (i > 0 && isWordChar(prefix[i - 1]) && prefix.length - i < CONFIG.maxAbbrevLen) i--
    token = prefix.slice(i)
    tokenRange = r.cloneRange()
    moveRangeBack(tokenRange, token.length, ctx.root)
  }

  if (!token || token.length > CONFIG.maxAbbrevLen) return
  const tmpl = state.dict[token.toLowerCase()]
  if (!tmpl) return

  try {
    const rendered = await renderTemplate(tmpl)
    if (ctx.kind === 'input') {
      ctx.el.setRangeText(rendered.text, tokenStart, tokenEnd, 'end')
      ctx.el.selectionStart = ctx.el.selectionEnd = tokenStart + rendered.cursor
      dispatchInput(ctx.el, rendered.text)
    } else if (tokenRange) {
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(tokenRange)
      document.execCommand('insertText', false, rendered.text)
      dispatchInput(ctx.root, rendered.text)
    }
  } catch (err) { console.warn('Expand error:', err) }
}

// ─────────────────────────────────────────────────────────────
// Gemini API
// ─────────────────────────────────────────────────────────────

function cleanAIResponse(s: string): string {
  if (!s) return s
  let out = s.trim()
  const m = out.match(/^```\w*\n?([\s\S]*?)\n?```$/)
  if (m) out = m[1].trim()
  if ((out.startsWith('"') && out.endsWith('"')) || (out.startsWith("'") && out.endsWith("'"))) {
    out = out.slice(1, -1)
  }
  return out
}

export async function callGemini(systemPrompt: string, userText: string): Promise<string | null> {
  const keys = (state.apiKey || '').split(';').map(k => k.trim()).filter(Boolean)
  if (!keys.length) return null

  const truncated = userText.slice(0, CONFIG.gemini.maxInputChars)
  const prompt = `${systemPrompt}\n\nText:\n${truncated}`

  for (let i = 0; i < keys.length; i++) {
    const idx = (state.apiKeyIndex + i) % keys.length
    try {
      const res = await GMX.request({
        method: 'POST',
        url: `${CONFIG.gemini.endpoint}/${CONFIG.gemini.model}:generateContent?key=${encodeURIComponent(keys[idx])}`,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: CONFIG.gemini.temperature },
        }),
      })

      if (res.status >= 200 && res.status < 300) {
        const json = JSON.parse(res.text)
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (text) {
          state.apiKeyIndex = idx
          return cleanAIResponse(text)
        }
      }
    } catch { continue }
  }
  return null
}

// ─────────────────────────────────────────────────────────────
// Hotkey Helpers
// ─────────────────────────────────────────────────────────────

export const matchHotkey = (e: KeyboardEvent, spec: HotkeySpec): boolean =>
  e.shiftKey === !!spec.shift &&
  e.altKey === !!spec.alt &&
  e.ctrlKey === !!spec.ctrl &&
  e.metaKey === !!spec.meta &&
  e.code === (spec.code || 'Space')

export const hotkeyStr = (spec: HotkeySpec): string => {
  const parts: string[] = []
  if (spec.ctrl) parts.push('Ctrl')
  if (spec.meta) parts.push('Cmd')
  if (spec.alt) parts.push('Alt')
  if (spec.shift) parts.push('Shift')
  parts.push(spec.code?.replace(/^Key/, '').replace(/^Digit/, '') || 'Space')
  return parts.join('+')
}

export function captureHotkey(): Promise<HotkeySpec | null> {
  return new Promise(resolve => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { cleanup(); resolve(null); return }
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return
      e.preventDefault()
      cleanup()
      resolve({ code: e.code, shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey })
    }
    const cleanup = () => document.removeEventListener('keydown', handler, true)
    document.addEventListener('keydown', handler, true)
  })
}