import type { EditContext, AIPrompt } from '../types'
import { CONFIG, state, BUILTIN_PROMPTS, isBuiltinEnabled, isCustomEnabled, getAllPrompts } from '../config'
import { $, escHtml, safeFocus, captureContext, makeEditor } from '../core'
import { callGemini } from '../api'
import { notify } from './notify'
import { aiMenuHTML } from './templates'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface AIMenuState {
  ctx: EditContext
  text: string
  expanded: boolean
  previewExpanded: boolean
}

// ─────────────────────────────────────────────────────────────
// Module State
// ─────────────────────────────────────────────────────────────

let menuEl: HTMLDivElement | null = null
let menuState: AIMenuState | null = null
let keyHandler: ((e: KeyboardEvent) => void) | null = null
let clickHandler: ((e: MouseEvent) => void) | null = null
let scrollHandler: ((e: Event) => void) | null = null

// ─────────────────────────────────────────────────────────────
// DOM Helpers
// ─────────────────────────────────────────────────────────────

function ensureMenu(): HTMLDivElement {
  if (menuEl) return menuEl

  menuEl = document.createElement('div')
  menuEl.className = 'sae-ai-menu'
  menuEl.setAttribute('role', 'menu')
  menuEl.setAttribute('aria-label', 'AI Actions')
  menuEl.innerHTML = aiMenuHTML()
  document.documentElement.appendChild(menuEl)

  clickHandler = (e: MouseEvent) => {
    if (menuEl?.classList.contains('open') && !menuEl.contains(e.target as Node)) {
      closeAIMenu()
    }
  }
  document.addEventListener('mousedown', clickHandler, true)

  return menuEl
}

function getVisiblePills(): HTMLButtonElement[] {
  if (!menuEl || !menuState) return []

  const primary = [...menuEl.querySelectorAll<HTMLButtonElement>('.sae-ai-pills.primary .sae-ai-pill')]
  if (!menuState.expanded) return primary

  const secondary = [...menuEl.querySelectorAll<HTMLButtonElement>('.sae-ai-pills.secondary .sae-ai-pill')]
  const custom = [...menuEl.querySelectorAll<HTMLButtonElement>('.sae-ai-pills.custom .sae-ai-pill')]
  return [...primary, ...secondary, ...custom]
}

// ─────────────────────────────────────────────────────────────
// Preview Rendering
// ─────────────────────────────────────────────────────────────

function renderPreview(): void {
  if (!menuEl || !menuState) return

  const preview = $<HTMLDivElement>('.sae-ai-preview', menuEl)!
  const toggle = $<HTMLButtonElement>('.sae-ai-preview-toggle', menuEl)!

  const { text, previewExpanded } = menuState
  const { previewMaxChars, previewExpandedChars } = CONFIG.ui
  const isLong = text.length > previewMaxChars

  preview.textContent = previewExpanded
    ? text.slice(0, previewExpandedChars)
    : text.slice(0, previewMaxChars) + (isLong ? '...' : '')

  preview.classList.toggle('expanded', previewExpanded)
  toggle.style.display = isLong ? 'block' : 'none'
  toggle.textContent = previewExpanded ? 'Show less' : 'Show more'

  toggle.onclick = () => {
    if (!menuState) return
    menuState.previewExpanded = !menuState.previewExpanded
    renderPreview()
  }
}

// ─────────────────────────────────────────────────────────────
// Pills Rendering
// ─────────────────────────────────────────────────────────────

function createPillHTML(p: AIPrompt, index: number): string {
  return `
    <button class="sae-ai-pill" data-id="${p.id}" role="menuitem">
      <span class="icon">${p.icon || '⚡'}</span>
      <span>${escHtml(p.label)}</span>
      <span class="key">${index}</span>
    </button>
  `
}

function renderPills(): void {
  if (!menuEl || !menuState) return

  const primary = $<HTMLDivElement>('.sae-ai-pills.primary', menuEl)!
  const secondary = $<HTMLDivElement>('.sae-ai-pills.secondary', menuEl)!
  const customWrap = $<HTMLDivElement>('.sae-ai-custom', menuEl)!
  const customPills = $<HTMLDivElement>('.sae-ai-pills.custom', menuEl)!
  const moreSection = $<HTMLDivElement>('.sae-ai-more', menuEl)!
  const toggle = $<HTMLDivElement>('.sae-ai-toggle', menuEl)!

  const enabledBuiltins = BUILTIN_PROMPTS.filter(p => isBuiltinEnabled(p.id))
  const enabledCustoms = state.customPrompts.filter(isCustomEnabled)

  const inlineCount = CONFIG.ui.inlinePrompts
  const primaryPrompts = enabledBuiltins.slice(0, inlineCount)
  const secondaryPrompts = enabledBuiltins.slice(inlineCount)

  let idx = 1
  primary.innerHTML = primaryPrompts.map(p => createPillHTML(p, idx++)).join('')
  secondary.innerHTML = secondaryPrompts.map(p => createPillHTML(p, idx++)).join('')

  if (enabledCustoms.length) {
    customPills.innerHTML = enabledCustoms.map(p => createPillHTML(p, idx++)).join('')
    customWrap.style.display = 'block'
  } else {
    customWrap.style.display = 'none'
  }

  const moreCount = secondaryPrompts.length + enabledCustoms.length
  toggle.style.display = moreCount ? 'flex' : 'none'
  moreSection.style.display = menuState.expanded ? 'block' : 'none'
  toggle.textContent = menuState.expanded ? '▴ Less' : `▾ More (${moreCount})`

  // Attach click handlers
  menuEl.querySelectorAll<HTMLButtonElement>('.sae-ai-pill').forEach(btn => {
    btn.onclick = () => execute(btn.dataset.id!)
  })

  toggle.onclick = () => {
    if (!menuState) return
    menuState.expanded = !menuState.expanded
    moreSection.style.display = menuState.expanded ? 'block' : 'none'
    toggle.textContent = menuState.expanded ? '▴ Less' : `▾ More (${moreCount})`
    updateActive()
  }

  updateActive()
}

function updateActive(): void {
  if (!menuEl) return
  const visible = getVisiblePills()
  menuEl.querySelectorAll<HTMLButtonElement>('.sae-ai-pill').forEach(p => p.classList.remove('active'))
  visible[state.aiMenuIndex]?.classList.add('active')
}

// ─────────────────────────────────────────────────────────────
// Keyboard Handling
// ─────────────────────────────────────────────────────────────

function handleKey(e: KeyboardEvent): void {
  if (!menuEl || !menuState) return

  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    closeAIMenu()
    return
  }

  const visible = getVisiblePills()

  // Number key selection
  const num = parseInt(e.key)
  if (num >= 1 && num <= 9 && visible[num - 1]) {
    e.preventDefault()
    e.stopPropagation()
    execute(visible[num - 1].dataset.id!)
    return
  }

  // Arrow navigation
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault()
    e.stopPropagation()
    state.aiMenuIndex = Math.min(visible.length - 1, state.aiMenuIndex + 1)
    updateActive()
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault()
    e.stopPropagation()
    state.aiMenuIndex = Math.max(0, state.aiMenuIndex - 1)
    updateActive()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
    if (visible[state.aiMenuIndex]) {
      execute(visible[state.aiMenuIndex].dataset.id!)
    }
  } else if (e.key === 'Tab') {
    e.preventDefault()
    e.stopPropagation()
    menuState.expanded = !menuState.expanded
    renderPills()
  }
}

// ─────────────────────────────────────────────────────────────
// Positioning
// ─────────────────────────────────────────────────────────────

function position(ctx: EditContext): void {
  if (!menuEl) return

  const rect = ctx.kind === 'input'
    ? ctx.el.getBoundingClientRect()
    : (window.getSelection?.()?.rangeCount
      ? window.getSelection()!.getRangeAt(0).getBoundingClientRect()
      : ctx.root.getBoundingClientRect())

  const { menuWidth, menuHeight, spacing } = CONFIG.ui

  let top = rect.bottom + spacing.sm
  let left = Math.max(spacing.sm, rect.left)

  if (top + menuHeight > innerHeight - spacing.md) {
    top = Math.max(spacing.sm, rect.top - menuHeight - spacing.sm)
    menuEl.classList.add('above')
    menuEl.classList.remove('below')
  } else {
    menuEl.classList.add('below')
    menuEl.classList.remove('above')
  }

  if (left + menuWidth > innerWidth - spacing.md) {
    left = innerWidth - menuWidth - spacing.md
  }

  menuEl.style.top = `${top}px`
  menuEl.style.left = `${left}px`
}

// ─────────────────────────────────────────────────────────────
// Execution
// ─────────────────────────────────────────────────────────────

async function execute(promptId: string): Promise<void> {
  if (!menuEl || !menuState) return

  const prompt = getAllPrompts().find(p => p.id === promptId)
  if (!prompt) return

  const { ctx, text } = menuState

  menuEl.classList.add('loading')
  $<HTMLSpanElement>('.sae-ai-loading span', menuEl)!.textContent = `${prompt.label}...`

  try {
    const result = await callGemini(prompt.prompt, text)
    if (result) {
      closeAIMenu()
      safeFocus(ctx.kind === 'input' ? ctx.el : ctx.root)

      const editor = makeEditor(captureContext() || ctx)
      if (editor) {
        editor.replace(result)
        notify.toast(`${prompt.icon} Applied!`, CONFIG.toast.shortMs)
      }
    } else {
      menuEl?.classList.remove('loading')
      notify.toast('Set API key in Settings (Alt+P → ⚙️)')
    }
  } catch (err) {
    console.warn('[texpander-ai] AI error:', err)
    menuEl?.classList.remove('loading')
    notify.toast('AI request failed')
  }
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

export function openAIMenu(ctx: EditContext): void {
  const menu = ensureMenu()
  const editor = makeEditor(ctx)
  if (!editor) return

  const text = editor.getText().trim()
  if (!text) {
    notify.toast('No text to transform')
    return
  }

  state.aiMenuIndex = 0
  menuState = { ctx, text, expanded: false, previewExpanded: false }

  renderPreview()
  renderPills()
  position(ctx)

  menu.classList.add('open')
  menu.classList.remove('loading')

  keyHandler = handleKey
  document.addEventListener('keydown', keyHandler, true)

  scrollHandler = (e: Event) => {
    if (menuEl?.contains(e.target as Node)) return
    closeAIMenu()
  }
  window.addEventListener('scroll', scrollHandler, true)
}

export function closeAIMenu(): void {
  if (!menuEl) return

  menuEl.classList.remove('open', 'loading')

  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler, true)
    keyHandler = null
  }
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler, true)
    scrollHandler = null
  }

  menuState = null
}

export function destroyAIMenu(): void {
  closeAIMenu()
  if (clickHandler) {
    document.removeEventListener('mousedown', clickHandler, true)
    clickHandler = null
  }
  menuEl?.remove()
  menuEl = null
}

export const isAIMenuOpen = (): boolean => menuEl?.classList.contains('open') ?? false