import type { HotkeySpec } from '../types'
import { CONFIG, STORE_KEYS, state, GMX, BUILTIN_PROMPTS, DEFAULT_DICT, isBuiltinEnabled, normalizeDict } from '../config'
import { $, $$, debounce, clamp, escHtml, genId, captureContext, getContextOrFallback, makeEditor, renderTemplate, hotkeyStr, captureHotkey } from '../core'
import { verifyApiKey } from '../api'
import { notify } from './notify'
import { mountAbbrevEditor } from './components'
import { paletteHTML, settingsHTML, promptItemHTML, promptEditFormHTML } from './templates'

// ─────────────────────────────────────────────────────────────
// Module State
// ─────────────────────────────────────────────────────────────

let paletteEl: HTMLDivElement | null = null
let prevOverflow = ''

// Internal references (set after palette creation)
let listEl: HTMLDivElement
let settingsEl: HTMLDivElement
let searchEl: HTMLInputElement
let panelEl: HTMLDivElement
let backBtn: HTMLButtonElement

// ─────────────────────────────────────────────────────────────
// List Rendering
// ─────────────────────────────────────────────────────────────

function renderList(filter = ''): void {
  const q = filter.toLowerCase()
  const keys = Object.keys(state.dict).sort()
  const items = q
    ? keys.filter(k => k.includes(q) || state.dict[k].toLowerCase().includes(q))
    : keys

  state.paletteIndex = clamp(state.paletteIndex, 0, Math.max(0, items.length - 1))

  if (!items.length) {
    listEl.innerHTML = '<div class="sae-empty">No abbreviations found</div>'
    return
  }

  listEl.innerHTML = items.map((k, i) => `
    <div class="sae-item${i === state.paletteIndex ? ' active' : ''}" data-key="${escHtml(k)}" role="option">
      <div class="sae-key">${escHtml(k)}</div>
      <div class="sae-val">${escHtml(state.dict[k])}</div>
      <div class="sae-item-actions">
        <button data-action="edit">Edit</button>
        <button data-action="delete">Del</button>
      </div>
    </div>
  `).join('')
}

function updateActive(items: HTMLDivElement[]): void {
  items.forEach((item, i) => item.classList.toggle('active', i === state.paletteIndex))
  items[state.paletteIndex]?.scrollIntoView({ block: 'nearest' })
}

// ─────────────────────────────────────────────────────────────
// Dictionary Operations
// ─────────────────────────────────────────────────────────────

function saveAndRender(msg: string): void {
  GMX.set(STORE_KEYS.dict, state.dict)
  renderList(searchEl.value)
  notify.toast(msg)
}

function addNew(): void {
  searchEl.value = ''
  renderList()

  const temp = document.createElement('div')
  temp.className = 'sae-item editing'
  listEl.insertBefore(temp, listEl.firstChild)

  mountAbbrevEditor(temp, '', '', (k, v) => {
    if (!k || !v) {
      notify.toast('Both fields required')
      return
    }
    state.dict[k] = v
    saveAndRender('Added')
  }, () => {
    temp.remove()
    renderList()
  })
}

function editAbbrev(item: HTMLDivElement, key: string): void {
  item.classList.add('editing')
  mountAbbrevEditor(item, key, state.dict[key], (nk, nv) => {
    if (!nk || !nv) {
      notify.toast('Both fields required')
      return
    }
    if (nk !== key) delete state.dict[key]
    state.dict[nk] = nv
    saveAndRender('Saved')
  }, () => renderList(searchEl.value))
}

function deleteAbbrev(key: string): void {
  if (!confirm(`Delete "${key}"?`)) return
  delete state.dict[key]
  saveAndRender('Deleted')
}

async function insertAbbrev(key: string): Promise<void> {
  closePalette()
  const tmpl = state.dict[key]
  if (!tmpl) return

  const ctx = getContextOrFallback()
  if (!ctx) {
    notify.toast('No editable field')
    return
  }

  const rendered = await renderTemplate(tmpl)
  makeEditor(captureContext() || ctx)?.replace(rendered.text)
}

// ─────────────────────────────────────────────────────────────
// Settings Rendering
// ─────────────────────────────────────────────────────────────

function showSettings(show: boolean): void {
  panelEl.classList.toggle('settings-open', show)
  backBtn.style.display = show ? 'flex' : 'none'
  if (show) {
    renderSettings()
  } else {
    searchEl.focus()
  }
}

function renderSettings(): void {
  settingsEl.innerHTML = settingsHTML(
    state.apiKey,
    hotkeyStr(CONFIG.palette),
    hotkeyStr(CONFIG.aiMenu),
    state.settings.aiMenuInlineCount
  )

  setupApiKeyHandlers()
  setupHotkeyHandlers()
  setupInlineCountHandler()
  renderBuiltins()
  renderCustoms()
  setupDictionaryHandlers()

  $<HTMLButtonElement>('#sae-add-prompt', settingsEl)!.onclick = addPrompt
}

function setupApiKeyHandlers(): void {
  const apiIn = $<HTMLInputElement>('#sae-api', settingsEl)!
  const verifyBtn = $<HTMLButtonElement>('#sae-verify', settingsEl)!
  let verifying = false

  apiIn.onchange = () => {
    state.apiKey = apiIn.value.trim()
    GMX.set(STORE_KEYS.apiKey, state.apiKey)
  }

  verifyBtn.onclick = async () => {
    if (verifying) return
    const key = apiIn.value.split(';')[0]?.trim()
    if (!key) {
      notify.toast('Enter key first')
      return
    }

    verifying = true
    verifyBtn.disabled = true
    verifyBtn.textContent = '...'

    const valid = await verifyApiKey(key)
    verifyBtn.textContent = valid ? '✓' : '✗'

    if (valid) {
      state.apiKey = apiIn.value.trim()
      GMX.set(STORE_KEYS.apiKey, state.apiKey)
      notify.toast('Valid')
    } else {
      notify.toast('Invalid')
    }

    setTimeout(() => {
      verifyBtn.textContent = 'Verify'
      verifyBtn.disabled = false
      verifying = false
    }, 2000)
  }
}

function setupHotkeyHandlers(): void {
  $$<HTMLButtonElement>('[data-hk]', settingsEl).forEach(btn => {
    btn.onclick = async () => {
      notify.toast('Press new hotkey...')
      const spec = await captureHotkey()
      if (!spec) return

      const name = btn.dataset.hk as 'palette' | 'aiMenu'
      Object.assign(CONFIG[name], spec)

      const keys = GMX.get<Record<string, HotkeySpec>>(STORE_KEYS.keys, {})
      keys[name] = spec
      GMX.set(STORE_KEYS.keys, keys)

      renderSettings()
      notify.toast(`Set: ${hotkeyStr(spec)}`)
    }
  })
}

function setupInlineCountHandler(): void {
  $<HTMLInputElement>('#sae-inline', settingsEl)!.onchange = (e) => {
    const el = e.target as HTMLInputElement
    const v = clamp(parseInt(el.value) || 6, 1, 20)
    el.value = String(v)
    state.settings.aiMenuInlineCount = v
    GMX.set(STORE_KEYS.settings, state.settings)
  }
}

function setupDictionaryHandlers(): void {
  $<HTMLButtonElement>('#sae-export', settingsEl)!.onclick = exportDict
  $<HTMLButtonElement>('#sae-import', settingsEl)!.onclick = importDict
  $<HTMLButtonElement>('#sae-reset', settingsEl)!.onclick = resetDict
}

function exportDict(): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify(state.dict, null, 2)], { type: 'application/json' }))
  a.download = `texpander-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  notify.toast('Exported')
}

async function importDict(): Promise<void> {
  const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.json' })
  inp.onchange = async () => {
    try {
      let o = JSON.parse(await inp.files![0].text())
      if (o.dict) o = o.dict
      const imp = normalizeDict(o)
      if (!Object.keys(imp).length) {
        notify.toast('No entries')
        return
      }
      Object.assign(state.dict, imp)
      GMX.set(STORE_KEYS.dict, state.dict)
      renderList()
      notify.toast(`Imported ${Object.keys(imp).length}`)
    } catch {
      notify.toast('Invalid JSON')
    }
  }
  inp.click()
}

function resetDict(): void {
  if (!confirm('Reset to defaults?')) return
  state.dict = normalizeDict(DEFAULT_DICT)
  GMX.set(STORE_KEYS.dict, state.dict)
  renderList()
  notify.toast('Reset')
}

// ─────────────────────────────────────────────────────────────
// Prompt Management
// ─────────────────────────────────────────────────────────────

function renderBuiltins(): void {
  const container = $<HTMLDivElement>('#sae-builtins', settingsEl)!
  container.innerHTML = BUILTIN_PROMPTS
    .map(p => promptItemHTML(p, 0, true, isBuiltinEnabled(p.id)))
    .join('')

  container.querySelectorAll<HTMLDivElement>('[data-toggle]').forEach(t => {
    t.onclick = () => {
      const id = t.closest<HTMLDivElement>('.sae-prompt-item')!.dataset.id!
      const i = state.disabledBuiltins.indexOf(id)
      if (i >= 0) {
        state.disabledBuiltins.splice(i, 1)
      } else {
        state.disabledBuiltins.push(id)
      }
      GMX.set(STORE_KEYS.disabledBuiltins, state.disabledBuiltins)
      renderBuiltins()
    }
  })
}

function renderCustoms(): void {
  const container = $<HTMLDivElement>('#sae-customs', settingsEl)!

  if (!state.customPrompts.length) {
    container.innerHTML = '<div class="sae-empty">No custom prompts</div>'
    return
  }

  container.innerHTML = state.customPrompts
    .map((p, i) => promptItemHTML(p, i, false, p.enabled !== false))
    .join('')

  // Toggle handlers
  container.querySelectorAll<HTMLDivElement>('[data-toggle]').forEach(t => {
    t.onclick = () => {
      const i = +t.closest<HTMLDivElement>('.sae-prompt-item')!.dataset.idx!
      state.customPrompts[i].enabled = !state.customPrompts[i].enabled
      GMX.set(STORE_KEYS.customPrompts, state.customPrompts)
      renderCustoms()
    }
  })

  // Edit handlers
  container.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach(b => {
    b.onclick = () => editPrompt(+b.closest<HTMLDivElement>('.sae-prompt-item')!.dataset.idx!)
  })

  // Delete handlers
  container.querySelectorAll<HTMLButtonElement>('[data-del]').forEach(b => {
    b.onclick = () => {
      const i = +b.closest<HTMLDivElement>('.sae-prompt-item')!.dataset.idx!
      if (!confirm(`Delete "${state.customPrompts[i].label}"?`)) return
      state.customPrompts.splice(i, 1)
      GMX.set(STORE_KEYS.customPrompts, state.customPrompts)
      renderCustoms()
      notify.toast('Deleted')
    }
  })
}

function addPrompt(): void {
  const container = $<HTMLDivElement>('#sae-customs', settingsEl)!
  container.querySelector('.sae-empty')?.remove()

  const el = document.createElement('div')
  el.className = 'sae-prompt-item editing'
  el.innerHTML = promptEditFormHTML('⚡', '', '')
  container.insertBefore(el, container.firstChild)

  setupPromptForm(el, (icon, label, prompt) => {
    state.customPrompts.push({ id: genId(), icon, label, prompt, enabled: true })
    GMX.set(STORE_KEYS.customPrompts, state.customPrompts)
    renderCustoms()
    notify.toast('Added')
  })
}

function editPrompt(idx: number): void {
  const p = state.customPrompts[idx]
  if (!p) return

  const container = $<HTMLDivElement>('#sae-customs', settingsEl)!
  const el = container.querySelector<HTMLDivElement>(`[data-idx="${idx}"]`)!
  el.className = 'sae-prompt-item editing'
  el.innerHTML = promptEditFormHTML(p.icon || '⚡', p.label, p.prompt)

  setupPromptForm(el, (icon, label, prompt) => {
    Object.assign(p, { icon, label, prompt })
    GMX.set(STORE_KEYS.customPrompts, state.customPrompts)
    renderCustoms()
    notify.toast('Saved')
  })
}

function setupPromptForm(el: HTMLDivElement, onSave: (icon: string, label: string, prompt: string) => void): void {
  const iconIn = $<HTMLInputElement>('#pi', el)!
  const labelIn = $<HTMLInputElement>('#pl', el)!
  const promptIn = $<HTMLTextAreaElement>('#pp', el)!

  $<HTMLButtonElement>('#ps', el)!.onclick = () => {
    const icon = iconIn.value.trim() || '⚡'
    const label = labelIn.value.trim()
    const prompt = promptIn.value.trim()
    if (!label || !prompt) {
      notify.toast('Required')
      return
    }
    onSave(icon, label, prompt)
  }

  $<HTMLButtonElement>('#pc', el)!.onclick = () => renderCustoms()
  labelIn.focus()
}

// ─────────────────────────────────────────────────────────────
// Palette Initialization
// ─────────────────────────────────────────────────────────────

function ensurePalette(): HTMLDivElement {
  if (paletteEl) return paletteEl

  paletteEl = document.createElement('div')
  paletteEl.className = 'sae-palette'
  paletteEl.innerHTML = paletteHTML()
  document.documentElement.appendChild(paletteEl)

  // Cache element references
  panelEl = $<HTMLDivElement>('.sae-panel', paletteEl)!
  searchEl = $<HTMLInputElement>('.sae-search', paletteEl)!
  listEl = $<HTMLDivElement>('.sae-list', paletteEl)!
  settingsEl = $<HTMLDivElement>('.sae-settings', paletteEl)!
  backBtn = $<HTMLButtonElement>('[data-action="back"]', paletteEl)!

  // Event handlers
  paletteEl.addEventListener('click', e => {
    if (e.target === paletteEl) closePalette()
  })

  $<HTMLButtonElement>('[data-action="close"]', paletteEl)!.onclick = closePalette
  $<HTMLButtonElement>('[data-action="settings"]', paletteEl)!.onclick = () => showSettings(true)
  backBtn.onclick = () => showSettings(false)
  $<HTMLButtonElement>('[data-action="add"]', paletteEl)!.onclick = addNew

  // Search handler
  const renderDebounced = debounce(() => renderList(searchEl.value), CONFIG.searchDebounceMs)
  searchEl.addEventListener('input', renderDebounced)

  // Keyboard navigation
  paletteEl.addEventListener('keydown', handlePaletteKey)

  // List click handler
  listEl.addEventListener('click', handleListClick)

  return paletteEl
}

function handlePaletteKey(e: KeyboardEvent): void {
  if (panelEl.classList.contains('settings-open')) {
    if (e.key === 'Escape') {
      e.preventDefault()
      showSettings(false)
    }
    return
  }

  if ((e.target as HTMLElement).closest('.sae-item.editing')) return

  if (e.key === 'Escape') {
    e.preventDefault()
    closePalette()
    return
  }

  if (e.key === 'Enter') {
    e.preventDefault()
    const active = listEl.querySelector<HTMLDivElement>('.sae-item.active:not(.editing)')
    if (active?.dataset.key) insertAbbrev(active.dataset.key)
    return
  }

  const items = $$<HTMLDivElement>('.sae-item:not(.editing)', listEl)
  if (!items.length) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    state.paletteIndex = Math.min(items.length - 1, state.paletteIndex + 1)
    updateActive(items)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    state.paletteIndex = Math.max(0, state.paletteIndex - 1)
    updateActive(items)
  }
}

function handleListClick(e: MouseEvent): void {
  const item = (e.target as HTMLElement).closest<HTMLDivElement>('.sae-item')
  if (!item || item.classList.contains('editing')) return

  const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action
  const key = item.dataset.key!

  if (action === 'edit') {
    editAbbrev(item, key)
  } else if (action === 'delete') {
    deleteAbbrev(key)
  } else {
    insertAbbrev(key)
  }
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

export function openPalette(): void {
  const p = ensurePalette()
  p.classList.add('open')

  prevOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'

  panelEl.classList.remove('settings-open')
  backBtn.style.display = 'none'

  searchEl.value = ''
  state.paletteIndex = 0
  renderList()
  searchEl.focus()
}

export function closePalette(): void {
  if (!paletteEl) return
  paletteEl.classList.remove('open')
  document.body.style.overflow = prevOverflow
  prevOverflow = ''
}

export function rerenderPalette(): void {
  if (paletteEl) renderList()
}

export const isPaletteOpen = (): boolean => paletteEl?.classList.contains('open') ?? false