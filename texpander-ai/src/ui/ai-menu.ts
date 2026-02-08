import type { EditContext, AIPrompt } from '../types'
import { CONFIG, state, BUILTIN_PROMPTS, isBuiltinEnabled, isCustomEnabled, getAllPrompts } from '../config'
import { $, escHtml, smartTruncate, captureContext, makeEditor, callGemini } from '../core'
import { notify } from './notify'
import { aiMenuHTML } from './templates'

interface AIMenuState {
  ctx: EditContext
  text: string
  expanded: boolean
  activeIndex: number
  keyHandler: ((e: KeyboardEvent) => void) | null
}

let menuEl: HTMLDivElement | null = null
let menuState: AIMenuState | null = null
let clickHandler: ((e: MouseEvent) => void) | null = null

function ensureMenu(): HTMLDivElement {
  if (menuEl) return menuEl

  menuEl = document.createElement('div')
  menuEl.className = 'sae-ai-menu'
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

  const inlineCount = CONFIG.aiMenuInlineCount
  const primaryPrompts = enabledBuiltins.slice(0, inlineCount)
  const secondaryPrompts = enabledBuiltins.slice(inlineCount)

  let idx = 1
  const pill = (p: AIPrompt) => `
    <button class="sae-ai-pill" data-id="${p.id}">
      <span class="icon">${p.icon}</span>
      <span>${escHtml(p.label)}</span>
      <span class="key">${idx++}</span>
    </button>
  `

  primary.innerHTML = primaryPrompts.map(pill).join('')
  secondary.innerHTML = secondaryPrompts.map(pill).join('')

  if (enabledCustoms.length) {
    customPills.innerHTML = enabledCustoms.map(p => `
      <button class="sae-ai-pill" data-id="${p.id}">
        <span class="icon">${p.icon || '⚡'}</span>
        <span>${escHtml(p.label)}</span>
        <span class="key">${idx++}</span>
      </button>
    `).join('')
    customWrap.style.display = 'block'
  } else {
    customWrap.style.display = 'none'
  }

  const moreCount = secondaryPrompts.length + enabledCustoms.length
  toggle.style.display = moreCount ? 'flex' : 'none'
  moreSection.style.display = menuState.expanded ? 'block' : 'none'
  toggle.textContent = menuState.expanded ? '▴ Less' : `▾ More (${moreCount})`

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
  if (!menuEl || !menuState) return
  menuEl.querySelectorAll<HTMLButtonElement>('.sae-ai-pill')
    .forEach((p, i) => p.classList.toggle('active', i === menuState!.activeIndex))
}

function handleKey(e: KeyboardEvent): void {
  if (!menuEl || !menuState) return

  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    closeAIMenu()
    return
  }

  const visible = [...menuEl.querySelectorAll<HTMLButtonElement>('.sae-ai-pill')]
    .filter(p => p.offsetParent !== null)

  const num = parseInt(e.key)
  if (num >= 1 && num <= 9 && visible[num - 1]) {
    e.preventDefault()
    e.stopPropagation()
    execute(visible[num - 1].dataset.id!)
    return
  }

  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault()
    menuState.activeIndex = Math.min(visible.length - 1, menuState.activeIndex + 1)
    updateActive()
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault()
    menuState.activeIndex = Math.max(0, menuState.activeIndex - 1)
    updateActive()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (visible[menuState.activeIndex]) execute(visible[menuState.activeIndex].dataset.id!)
  } else if (e.key === 'Tab') {
    e.preventDefault()
    menuState.expanded = !menuState.expanded
    renderPills()
  }
}

function position(ctx: EditContext): void {
  if (!menuEl) return

  const rect = ctx.kind === 'input'
    ? ctx.el.getBoundingClientRect()
    : (window.getSelection?.()?.rangeCount
      ? window.getSelection()!.getRangeAt(0).getBoundingClientRect()
      : ctx.root.getBoundingClientRect())

  let top = rect.bottom + 8
  let left = Math.max(8, rect.left)

  if (top + 260 > innerHeight - 16) {
    top = Math.max(8, rect.top - 260 - 8)
    menuEl.classList.add('above')
    menuEl.classList.remove('below')
  } else {
    menuEl.classList.add('below')
    menuEl.classList.remove('above')
  }

  if (left + 360 > innerWidth - 16) left = innerWidth - 360 - 16

  menuEl.style.top = `${top}px`
  menuEl.style.left = `${left}px`
}

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
      try { (ctx.kind === 'input' ? ctx.el : ctx.root).focus({ preventScroll: true }) } catch {}

      const editor = makeEditor(captureContext() || ctx)
      if (editor) {
        editor.replace(result)
        notify.toast(`${prompt.icon} Applied!`, 1200)
      }
    } else {
      menuEl?.classList.remove('loading')
      notify.toast('Set API key in Settings (Alt+P → ⚙️)')
    }
  } catch (err) {
    console.warn('AI error:', err)
    menuEl?.classList.remove('loading')
    notify.toast('AI request failed')
  }
}

export function openAIMenu(ctx: EditContext): void {
  const menu = ensureMenu()
  const editor = makeEditor(ctx)
  if (!editor) return

  const text = editor.getText().trim()
  if (!text) return notify.toast('No text to transform')

  menuState = { ctx, text, expanded: false, activeIndex: 0, keyHandler: null }

  $<HTMLDivElement>('.sae-ai-preview', menu)!.textContent = smartTruncate(text, 120)

  renderPills()
  position(ctx)

  menu.classList.add('open')
  menu.classList.remove('loading')

  menuState.keyHandler = handleKey
  document.addEventListener('keydown', menuState.keyHandler, true)
}

export function closeAIMenu(): void {
  if (!menuEl) return
  menuEl.classList.remove('open', 'loading')
  if (menuState?.keyHandler) {
    document.removeEventListener('keydown', menuState.keyHandler, true)
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