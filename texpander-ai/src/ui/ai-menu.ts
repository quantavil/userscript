import type { EditContext, AIPrompt } from '../types'
import { CONFIG, state, BUILTIN_PROMPTS, isBuiltinEnabled, isCustomEnabled, getAllPrompts } from '../config'
import { $, safeFocus, captureContext, makeEditor } from '../core'
import { callGemini } from '../api'
import { notify } from './notify'
import { aiMenuHTML } from './templates'

interface AIMenuState { ctx: EditContext; text: string; expanded: boolean }

let menuEl: HTMLDivElement | null = null
let menuState: AIMenuState | null = null
let keyH: ((e: KeyboardEvent) => void) | null = null
let clickH: ((e: MouseEvent) => void) | null = null
let scrollH: ((e: Event) => void) | null = null

function truncMid(s: string, max: number): string {
  if (s.length <= max) return s
  const h = (max * .6) | 0, t = max - h - 3
  return s.slice(0, h) + ' … ' + s.slice(-t)
}

function ensureMenu(): HTMLDivElement {
  if (menuEl) return menuEl
  menuEl = document.createElement('div')
  menuEl.className = 'sae-ai-menu'
  menuEl.setAttribute('role', 'menu')
  menuEl.innerHTML = aiMenuHTML()
  document.documentElement.appendChild(menuEl)
  clickH = (e: MouseEvent) => {
    if (menuEl?.classList.contains('open') && !menuEl.contains(e.target as Node)) closeAIMenu()
  }
  document.addEventListener('mousedown', clickH, true)
  return menuEl
}

function pills(): HTMLButtonElement[] {
  if (!menuEl || !menuState) return []
  const p = [...menuEl.querySelectorAll<HTMLButtonElement>('.sae-ai-pills.primary .sae-ai-pill')]
  if (!menuState.expanded) return p
  return [...p,
  ...menuEl.querySelectorAll<HTMLButtonElement>('.sae-ai-pills.secondary .sae-ai-pill'),
  ...menuEl.querySelectorAll<HTMLButtonElement>('.sae-ai-pills.custom .sae-ai-pill')]
}

function mkPill(p: AIPrompt, i: number): HTMLButtonElement {
  const b = document.createElement('button')
  b.className = 'sae-ai-pill'
  b.dataset.id = p.id
  b.setAttribute('role', 'menuitem')
  b.innerHTML = `<span class="label-text">${p.label}</span><span class="key">${i}</span>`
  b.onclick = () => exec(p.id)
  return b
}

function render(): void {
  if (!menuEl || !menuState) return

  // preview
  $<HTMLDivElement>('.sae-ai-preview', menuEl)!.textContent = truncMid(menuState.text, CONFIG.ui.previewMaxChars)

  // pills
  const pri = $<HTMLDivElement>('.sae-ai-pills.primary', menuEl)!
  const sec = $<HTMLDivElement>('.sae-ai-pills.secondary', menuEl)!
  const cw = $<HTMLDivElement>('.sae-ai-custom', menuEl)!
  const cp = $<HTMLDivElement>('.sae-ai-pills.custom', menuEl)!
  const more = $<HTMLDivElement>('.sae-ai-more', menuEl)!
  const tog = $<HTMLDivElement>('.sae-ai-toggle', menuEl)!

  const bi = BUILTIN_PROMPTS.filter(p => isBuiltinEnabled(p.id))
  const cu = state.customPrompts.filter(isCustomEnabled)
  const n = CONFIG.ui.inlinePrompts

  let idx = 1
  pri.replaceChildren(...bi.slice(0, n).map(p => mkPill(p, idx++)))
  sec.replaceChildren(...bi.slice(n).map(p => mkPill(p, idx++)))

  if (cu.length) { cp.replaceChildren(...cu.map(p => mkPill(p, idx++))); cw.style.display = 'block' }
  else { cp.innerHTML = ''; cw.style.display = 'none' }

  const mc = bi.length - n + cu.length
  tog.style.display = mc > 0 ? 'flex' : 'none'
  more.style.display = menuState.expanded ? 'block' : 'none'
  tog.textContent = menuState.expanded ? '▴ Less' : `▾ More (${mc})`
  tog.onclick = () => {
    if (!menuState) return
    menuState.expanded = !menuState.expanded
    more.style.display = menuState.expanded ? 'block' : 'none'
    tog.textContent = menuState.expanded ? '▴ Less' : `▾ More (${mc})`
    markActive()
  }
  markActive()
}

function markActive(): void {
  if (!menuEl) return
  const v = pills()
  menuEl.querySelectorAll<HTMLButtonElement>('.sae-ai-pill').forEach(p => p.classList.remove('active'))
  v[state.aiMenuIndex]?.classList.add('active')
}

function handleKey(e: KeyboardEvent): void {
  if (!menuEl || !menuState) return
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeAIMenu(); return }
  const v = pills(), num = +e.key
  if (num >= 1 && num <= 9 && v[num - 1]) { e.preventDefault(); e.stopPropagation(); exec(v[num - 1].dataset.id!); return }
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); state.aiMenuIndex = Math.min(v.length - 1, state.aiMenuIndex + 1); markActive() }
  else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); state.aiMenuIndex = Math.max(0, state.aiMenuIndex - 1); markActive() }
  else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (v[state.aiMenuIndex]) exec(v[state.aiMenuIndex].dataset.id!) }
  else if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); menuState.expanded = !menuState.expanded; render() }
}

function position(ctx: EditContext): void {
  if (!menuEl) return
  const rect = ctx.kind === 'input' ? ctx.el.getBoundingClientRect()
    : (window.getSelection?.()?.rangeCount ? window.getSelection()!.getRangeAt(0).getBoundingClientRect() : ctx.root.getBoundingClientRect())
  const { menuWidth: w, menuHeight: h, spacing: sp } = CONFIG.ui
  let top = rect.bottom + sp.sm, left = Math.max(sp.sm, rect.left)
  if (top + h > innerHeight - sp.md) { top = Math.max(sp.sm, rect.top - h - sp.sm); menuEl.classList.add('above'); menuEl.classList.remove('below') }
  else { menuEl.classList.add('below'); menuEl.classList.remove('above') }
  if (left + w > innerWidth - sp.md) left = innerWidth - w - sp.md
  menuEl.style.top = `${top}px`; menuEl.style.left = `${left}px`
}

async function exec(id: string): Promise<void> {
  if (!menuEl || !menuState) return
  const p = getAllPrompts().find(x => x.id === id)
  if (!p) return
  const { ctx, text } = menuState
  menuEl.classList.add('loading')
  $<HTMLSpanElement>('.sae-ai-loading span', menuEl)!.textContent = `${p.label}...`
  try {
    const r = await callGemini(p.prompt, text)
    if (r) {
      closeAIMenu(); safeFocus(ctx.kind === 'input' ? ctx.el : ctx.root)
      makeEditor(captureContext() || ctx)?.replace(r)
      notify.toast(`Done`, CONFIG.toast.shortMs)
    } else { menuEl?.classList.remove('loading'); notify.toast('Set API key in Settings') }
  } catch (err) { console.warn('[texpander] AI err:', err); menuEl?.classList.remove('loading'); notify.toast('AI failed') }
}

export function openAIMenu(ctx: EditContext): void {
  const m = ensureMenu(), ed = makeEditor(ctx)
  if (!ed) return
  const text = ed.getText().trim()
  if (!text) { notify.toast('No text'); return }
  state.aiMenuIndex = 0
  menuState = { ctx, text, expanded: false }
  render(); position(ctx)
  m.classList.add('open'); m.classList.remove('loading')
  keyH = handleKey; document.addEventListener('keydown', keyH, true)
  scrollH = (e: Event) => { if (!menuEl?.contains(e.target as Node)) closeAIMenu() }
  window.addEventListener('scroll', scrollH, true)
}

export function closeAIMenu(): void {
  if (!menuEl) return
  menuEl.classList.remove('open', 'loading')
  if (keyH) { document.removeEventListener('keydown', keyH, true); keyH = null }
  if (scrollH) { window.removeEventListener('scroll', scrollH, true); scrollH = null }
  menuState = null
}

export function destroyAIMenu(): void {
  closeAIMenu()
  if (clickH) { document.removeEventListener('mousedown', clickH, true); clickH = null }
  menuEl?.remove(); menuEl = null
}

export const isAIMenuOpen = (): boolean => menuEl?.classList.contains('open') ?? false