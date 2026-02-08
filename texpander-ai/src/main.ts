import { GM_addStyle } from '$'
import { CONFIG, state, GMX, loadState } from './config'
import { getEditable, captureContext, matchHotkey, doExpansion } from './core'
import { STYLES, notify, openPalette, closePalette, openAIMenu, closeAIMenu, isAIMenuOpen, isPaletteOpen } from './ui'

function handleGlobalKey(e: KeyboardEvent): void {
  if (e.isComposing) return
  const target = (e.composedPath?.()?.[0] || e.target) as EventTarget | null

  if (e.key === 'Escape') {
    if (isAIMenuOpen()) { e.preventDefault(); e.stopPropagation(); closeAIMenu(); return }
    if (isPaletteOpen()) { e.preventDefault(); e.stopPropagation(); closePalette(); return }
    return
  }

  if (isAIMenuOpen()) return
  if (isPaletteOpen() && (target as HTMLElement)?.closest?.('.sae-palette')) return

  if (matchHotkey(e, CONFIG.palette)) {
    e.preventDefault()
    e.stopPropagation()
    state.lastEditable = captureContext()
    openPalette()
    return
  }

  if (matchHotkey(e, CONFIG.aiMenu) && getEditable(target)) {
    e.preventDefault()
    e.stopPropagation()
    const ctx = captureContext()
    ctx ? openAIMenu(ctx) : notify.toast('No editable field')
    return
  }

  if (matchHotkey(e, CONFIG.trigger) && getEditable(target)) {
    e.preventDefault()
    e.stopPropagation()
    doExpansion()
  }
}

function init(): void {
  GM_addStyle(STYLES)
  loadState()

  window.addEventListener('focusin', e => {
    const t = (e.composedPath?.()?.[0] || e.target) as HTMLElement
    if (t?.closest?.('.sae-palette, .sae-ai-menu')) return
    const el = getEditable(t)
    if (el) state._lastFocusedEditable = el
  }, true)

  GMX.menu('Open Palette (Alt+P)', () => { state.lastEditable = captureContext(); openPalette() })
  GMX.menu('AI Actions (Alt+G)', () => {
    const ctx = captureContext()
    ctx ? openAIMenu(ctx) : notify.toast('No editable field')
  })

  window.addEventListener('keydown', handleGlobalKey, true)
  console.log('[texpander-ai] v3.0')
}

init()  