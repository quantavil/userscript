import type { EditContext, Editor, TemplateResult, HotkeySpec } from './types'
import { CONFIG, state } from './config'

// ── DOM ──────────────────────────────────────────────────────

export const $ = <T extends Element = Element>(s: string, r: ParentNode = document): T | null =>
  r.querySelector<T>(s)

export const $$ = <T extends Element = Element>(s: string, r: ParentNode = document): T[] =>
  Array.from(r.querySelectorAll<T>(s))

export const debounce = <T extends (...args: unknown[]) => void>(fn: T, ms: number) => {
  let t: ReturnType<typeof setTimeout>
  return (...a: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) }
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
export const genId = () => 'c' + Math.random().toString(36).slice(2, 9)
const p2 = (n: number) => String(n).padStart(2, '0')

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const escHtml = (s: string) => String(s).replace(/[&<>"']/g, c => ESC[c] ?? c)

// Unicode word char — no try/catch, universal in 2024+
const isWord = (c: string) => /[\p{L}\p{N}_-]/u.test(c)

// ── Focus & Input ────────────────────────────────────────────

export const safeFocus = (el: HTMLElement | null): boolean => {
  if (!el) return false
  try { el.focus({ preventScroll: true }); return true } catch { return false }
}

function dispatchInput(el: HTMLElement, data: string): void {
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data }))
}

// ── Editable Detection ───────────────────────────────────────

const EDITABLE_TYPES = new Set(['text', 'search', 'url', 'email', 'tel'])

export function getEditable(el: EventTarget | null): HTMLElement | null {
  if (!el || !(el instanceof HTMLElement)) return null
  if (el instanceof HTMLTextAreaElement) return el
  if (el instanceof HTMLInputElement) return EDITABLE_TYPES.has((el.type || 'text').toLowerCase()) ? el : null

  let curr: HTMLElement | null = el
  while (curr && curr !== document.documentElement) {
    if (curr.nodeType === 1 && curr.isContentEditable) return curr
    curr = curr.parentElement ?? (curr.parentNode instanceof ShadowRoot ? curr.parentNode.host as HTMLElement : null)
  }
  return null
}

// ── Context Capture ──────────────────────────────────────────

export function captureContext(): EditContext | null {
  let active = document.activeElement as HTMLElement | null
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement as HTMLElement

  const el = getEditable(active)
  if (!el) return null

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)
    return { kind: 'input', el, start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 }

  const sel = window.getSelection()
  if (!sel?.rangeCount) return null
  return { kind: 'ce', root: el, range: sel.getRangeAt(0).cloneRange() }
}

export function getContextOrFallback(): EditContext | null {
  const ctx = captureContext()
  if (ctx) return ctx
  if (state.lastEditableEl?.isConnected) { safeFocus(state.lastEditableEl); return captureContext() }
  return null
}

// ── Editor Abstraction ───────────────────────────────────────

export function makeEditor(ctx: EditContext | null): Editor | null {
  if (!ctx) return null

  if (ctx.kind === 'input') {
    const el = ctx.el
    return {
      getText() {
        const { selectionStart: s, selectionEnd: e } = el
        return s !== e ? el.value.slice(s!, e!) : el.value
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
      const sel = window.getSelection()
      if (sel?.rangeCount && !sel.isCollapsed) return sel.toString()
      const r = document.createRange(); r.selectNodeContents(root); return r.toString()
    },
    replace(text: string) {
      const sel = window.getSelection()
      if (!sel) return
      if (sel.isCollapsed) {
        const r = document.createRange(); r.selectNodeContents(root)
        sel.removeAllRanges(); sel.addRange(r)
      }
      document.execCommand('insertText', false, text)
      dispatchInput(root, text)
    },
  }
}

// ── Template System ──────────────────────────────────────────

type TagResult = { text: string; cursor?: boolean }

const fmtDate = (d: Date, a = 'iso'): string => {
  const f = a.toLowerCase()
  if (f === 'long') return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  if (f === 'short') return d.toLocaleDateString()
  if (f === 'mdy' || f === 'us') return `${p2(d.getMonth() + 1)}/${p2(d.getDate())}/${d.getFullYear()}`
  if (f === 'dmy') return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}

const fmtTime = (d: Date, a = '12'): string => {
  if (a === '24' || a === '24h') return `${p2(d.getHours())}:${p2(d.getMinutes())}`
  let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12
  return `${p2(h)}:${p2(d.getMinutes())} ${ap}`
}

async function readClip(): Promise<string> {
  try {
    return await Promise.race([
      navigator.clipboard?.readText() ?? Promise.resolve(''),
      new Promise<string>(r => setTimeout(() => r(''), CONFIG.clipboardReadTimeoutMs)),
    ])
  } catch { return '' }
}

const TAGS: Record<string, (arg: string, now: Date) => Promise<TagResult>> = {
  cursor: async () => ({ text: '', cursor: true }),
  date: async (a, n) => ({ text: fmtDate(n, a) }),
  time: async (a, n) => ({ text: fmtTime(n, a) }),
  day: async (a, n) => ({ text: n.toLocaleDateString(undefined, { weekday: a === 'short' ? 'short' : 'long' }) }),
  clipboard: async () => ({ text: await readClip() }),
}

export async function renderTemplate(tmpl: string): Promise<TemplateResult> {
  const re = /\{\{\s*(\w+)(?::([^}]+))?\s*\}\}/g
  const matches = [...tmpl.matchAll(re)]
  if (!matches.length) return { text: tmpl, cursor: tmpl.length }

  const now = new Date()
  const results = await Promise.all(matches.map(m => {
    const handler = TAGS[m[1].toLowerCase()]
    return handler ? handler((m[2] || '').trim(), now) : null
  }))

  let out = '', cursor = -1, idx = 0
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]
    out += tmpl.slice(idx, m.index!)
    idx = m.index! + m[0].length
    const res = results[i]
    if (!res) { out += m[0]; continue }
    if (res.cursor && cursor < 0) cursor = out.length
    out += res.text
  }
  out += tmpl.slice(idx)
  return { text: out, cursor: cursor >= 0 ? cursor : out.length }
}

// ── CE Range Helpers ─────────────────────────────────────────

function getTextBefore(root: HTMLElement, range: Range, max: number): string {
  const r = document.createRange()
  r.setStart(root, 0)
  r.setEnd(range.startContainer, range.startOffset)
  return r.toString().slice(-max)
}

/** Scan backwards from end of string for word chars */
function scanToken(text: string, maxLen: number): string {
  let i = text.length
  while (i > 0 && isWord(text[i - 1]) && text.length - i < maxLen) i--
  return text.slice(i)
}

/** Convert absolute char position to {node, offset} within root's text nodes */
function textPosToNode(root: HTMLElement, pos: number): { node: Node; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let remaining = pos
  let node: Text | null
  while ((node = walker.nextNode() as Text | null)) {
    const len = node.nodeValue!.length
    if (remaining <= len) return { node, offset: remaining }
    remaining -= len
  }
  return null
}

// ── Token Extraction (shared by peekToken & doExpansion) ─────

interface TokenMatch {
  token: string
  /** For input: char index where token starts */
  tokenStart?: number
  /** For CE: range spanning the token */
  tokenRange?: Range
}

function findToken(ctx: EditContext): TokenMatch | null {
  if (ctx.kind === 'input') {
    if (ctx.start !== ctx.end) return null
    const text = ctx.el.value.slice(0, ctx.start)
    const token = scanToken(text, CONFIG.maxAbbrevLen)
    return token ? { token, tokenStart: ctx.start - token.length } : null
  }

  const sel = window.getSelection()
  if (!sel?.rangeCount || !sel.isCollapsed) return null

  const r = sel.getRangeAt(0)
  const text = getTextBefore(ctx.root, r, CONFIG.maxAbbrevLen)
  const token = scanToken(text, CONFIG.maxAbbrevLen)
  if (!token) return null

  // Build range spanning just the token text
  const fullText = getTextBefore(ctx.root, r, Infinity)
  const tokenStartPos = fullText.length - token.length
  const tokenEndPos = fullText.length

  const start = textPosToNode(ctx.root, tokenStartPos)
  const end = textPosToNode(ctx.root, tokenEndPos)
  if (!start || !end) return null

  const tokenRange = document.createRange()
  tokenRange.setStart(start.node, start.offset)
  tokenRange.setEnd(end.node, end.offset)
  return { token, tokenRange }
}

// ── Public: peekToken (sync-ish, fast) ───────────────────────

export function peekToken(ctx: EditContext): string | null {
  const m = findToken(ctx)
  return m?.token && m.token.length <= CONFIG.maxAbbrevLen ? m.token : null
}

// ── Public: doExpansion ──────────────────────────────────────

export async function doExpansion(preCtx?: EditContext): Promise<void> {
  const ctx = preCtx ?? captureContext()
  if (!ctx) return

  const match = findToken(ctx)
  if (!match) return

  const { token } = match
  const tmpl = state.dict[token.toLowerCase()]
  if (!tmpl) return

  // Snapshot for race-condition guard
  const snapshot = ctx.kind === 'input' ? ctx.el.value : null

  const rendered = await renderTemplate(tmpl)

  if (ctx.kind === 'input') {
    if (ctx.el.value !== snapshot) return // content changed during async render
    const start = match.tokenStart!
    ctx.el.setRangeText(rendered.text, start, ctx.start, 'end')
    ctx.el.selectionStart = ctx.el.selectionEnd = start + rendered.cursor
    dispatchInput(ctx.el, rendered.text)
  } else if (match.tokenRange) {
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(match.tokenRange)
    document.execCommand('insertText', false, rendered.text)

    // Position cursor if {{cursor}} was used
    if (rendered.cursor < rendered.text.length) {
      const curSel = window.getSelection()
      if (curSel?.rangeCount) {
        const r = curSel.getRangeAt(0)
        // After insertText, cursor is at end of inserted text
        // We need to go back by (rendered.text.length - rendered.cursor) chars
        const fullText = getTextBefore(ctx.root, r, Infinity)
        const targetPos = fullText.length - (rendered.text.length - rendered.cursor)
        const pos = textPosToNode(ctx.root, targetPos)
        if (pos) {
          r.setStart(pos.node, pos.offset)
          r.collapse(true)
          curSel.removeAllRanges()
          curSel.addRange(r)
        }
      }
    }
    dispatchInput(ctx.root, rendered.text)
  }
}

// ── Hotkey Helpers ───────────────────────────────────────────

export const matchHotkey = (e: KeyboardEvent, spec: HotkeySpec): boolean =>
  e.code === (spec.code || 'Space') &&
  e.shiftKey === !!spec.shift &&
  e.altKey === !!spec.alt &&
  e.ctrlKey === !!spec.ctrl &&
  e.metaKey === !!spec.meta

export const hotkeyStr = (spec: HotkeySpec): string =>
  [spec.ctrl && 'Ctrl', spec.meta && 'Cmd', spec.alt && 'Alt', spec.shift && 'Shift',
    spec.code?.replace(/^Key/, '').replace(/^Digit/, '') || 'Space']
    .filter(Boolean).join('+')

export function captureHotkey(): Promise<HotkeySpec | null> {
  return new Promise(resolve => {
    const ac = new AbortController()
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') { ac.abort(); resolve(null); return }
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return
      e.preventDefault(); ac.abort()
      resolve({ code: e.code, shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey })
    }, { capture: true, signal: ac.signal })
  })
}