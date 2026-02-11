import { GM_addStyle } from '$'
import { CONFIG, state, GMX, loadState } from './config'
import { getEditable, captureContext, getContextOrFallback, matchHotkey, peekToken, doExpansion } from './core'
import { STYLES, notify, openPalette, closePalette, openAIMenu, closeAIMenu, isAIMenuOpen, isPaletteOpen } from './ui'

// ─────────────────────────────────────────────────────────────
// Global Keyboard Handler
// ─────────────────────────────────────────────────────────────

function handleGlobalKey(e: KeyboardEvent): void {
  if (e.isComposing) return

  const target = (e.composedPath?.()?.[0] || e.target) as EventTarget | null

  // Escape handling
  if (e.key === 'Escape') {
    if (isAIMenuOpen()) {
      e.preventDefault()
      e.stopPropagation()
      closeAIMenu()
      return
    }
    if (isPaletteOpen()) {
      e.preventDefault()
      e.stopPropagation()
      closePalette()
      return
    }
    return
  }

  // Don't handle hotkeys when menus are open
  if (isAIMenuOpen()) return
  if (isPaletteOpen() && (target as HTMLElement)?.closest?.('.sae-palette')) return

  // Palette hotkey
  if (matchHotkey(e, CONFIG.palette)) {
    e.preventDefault()
    e.stopPropagation()
    openPalette()
    return
  }

  // AI Menu hotkey
  if (matchHotkey(e, CONFIG.aiMenu) && getEditable(target)) {
    e.preventDefault()
    e.stopPropagation()
    const ctx = captureContext()
    if (ctx) {
      openAIMenu(ctx)
    } else {
      notify.toast('No editable field')
    }
    return
  }

  // Expansion trigger — only preventDefault if abbreviation exists
  if (matchHotkey(e, CONFIG.trigger) && getEditable(target)) {
    const ctx = captureContext()
    if (!ctx) return

    const token = peekToken(ctx)
    if (!token || !state.dict[token.toLowerCase()]) return // let keystroke through

    e.preventDefault()
    e.stopPropagation()
    doExpansion(ctx)
  }
}

// ─────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────

function init(): void {
  GM_addStyle(STYLES)
  loadState()

  // Track last editable element
  window.addEventListener('focusin', e => {
    const t = (e.composedPath?.()?.[0] || e.target) as HTMLElement
    if (t?.closest?.('.sae-palette, .sae-ai-menu')) return
    const el = getEditable(t)
    if (el) state.lastEditableEl = el
  }, true)

  // Register menu commands
  GMX.menu('Open Palette (Alt+P)', openPalette)
  GMX.menu('AI Actions (Alt+G)', () => {
    const ctx = getContextOrFallback()
    if (ctx) {
      openAIMenu(ctx)
    } else {
      notify.toast('No editable field')
    }
  })

  // Global keyboard handler
  window.addEventListener('keydown', handleGlobalKey, true)

  console.log('[texpander-ai] v3.2 loaded')
}

init()