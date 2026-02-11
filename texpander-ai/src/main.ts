import { GM_addStyle } from '$'
import { CONFIG, state, GMX, loadState } from './config'
import { getEditable, captureContext, getContextOrFallback, matchHotkey, peekToken, doExpansion } from './core'
import { STYLES, notify, openPalette, closePalette, openAIMenu, closeAIMenu, isAIMenuOpen, isPaletteOpen } from './ui'

function handleGlobalKey(e: KeyboardEvent): void {
  if (e.isComposing) return

  const target = (e.composedPath()[0] ?? e.target) as HTMLElement

  if (e.key === 'Escape') {
    if (isAIMenuOpen()) { e.preventDefault(); e.stopPropagation(); closeAIMenu() }
    else if (isPaletteOpen()) { e.preventDefault(); e.stopPropagation(); closePalette() }
    return
  }

  // Block all hotkeys when menus are open
  if (isAIMenuOpen() || isPaletteOpen()) return

  // Palette — uses customizable hotkey
  if (matchHotkey(e, state.hotkeys.palette)) {
    e.preventDefault(); e.stopPropagation(); openPalette(); return
  }

  // AI Menu — uses customizable hotkey
  if (matchHotkey(e, state.hotkeys.aiMenu) && getEditable(target)) {
    e.preventDefault(); e.stopPropagation()
    const ctx = captureContext()
    ctx ? openAIMenu(ctx) : notify.toast('No editable field')
    return
  }

  // Expansion trigger — only preventDefault if abbreviation exists
  if (matchHotkey(e, CONFIG.trigger) && getEditable(target)) {
    const ctx = captureContext()
    if (!ctx) return
    const token = peekToken(ctx)
    if (!token || !state.dict[token.toLowerCase()]) return
    e.preventDefault(); e.stopPropagation()
    doExpansion(ctx)
  }
}

function init(): void {
  GM_addStyle(STYLES)
  loadState()

  window.addEventListener('focusin', e => {
    const t = (e.composedPath()[0] ?? e.target) as HTMLElement
    if (t?.closest?.('.sae-palette, .sae-ai-menu')) return
    const el = getEditable(t)
    if (el) state.lastEditableEl = el
  }, true)

  GMX.menu('Open Palette', openPalette)
  GMX.menu('AI Actions', () => {
    const ctx = getContextOrFallback()
    ctx ? openAIMenu(ctx) : notify.toast('No editable field')
  })

  window.addEventListener('keydown', handleGlobalKey, true)
  console.log('[texpander-ai] loaded')
}

init()