import type { HotkeySpec } from '../types'
import { CONFIG, STORE_KEYS, state, GMX, BUILTIN_PROMPTS, DEFAULT_DICT, isBuiltinEnabled, normalizeDict } from '../config'
import { $, $$, debounce, clamp, escHtml, genId, captureContext, getContextOrFallback, makeEditor, renderTemplate, hotkeyStr, captureHotkey } from '../core'
import { verifyApiKey } from '../api'
import { notify } from './notify'
import { mountAbbrevEditor } from './components'
import { paletteHTML, settingsHTML, promptItemHTML, promptEditFormHTML } from './templates'

let paletteEl: HTMLDivElement | null = null
let prevOverflow = ''
let listEl: HTMLDivElement, settingsEl: HTMLDivElement, searchEl: HTMLInputElement, panelEl: HTMLDivElement, backBtn: HTMLButtonElement, settingsBtn: HTMLButtonElement

// ── List ─────────────────────────────────────────────────────

function renderList(filter = ''): void {
  const q = filter.toLowerCase()
  const keys = Object.keys(state.dict).sort()
  const items = q ? keys.filter(k => k.includes(q) || state.dict[k].toLowerCase().includes(q)) : keys
  state.paletteIndex = clamp(state.paletteIndex, 0, Math.max(0, items.length - 1))

  if (!items.length) { listEl.innerHTML = '<div class="sae-empty">No abbreviations found</div>'; return }

  listEl.innerHTML = items.map((k, i) => `
    <div class="sae-item${i === state.paletteIndex ? ' active' : ''}" data-key="${escHtml(k)}" role="option">
      <div class="sae-key">${escHtml(k)}</div>
      <div class="sae-val">${escHtml(state.dict[k])}</div>
      <div class="sae-item-actions">
        <button data-action="edit">Edit</button>
        <button data-action="delete">Del</button>
      </div>
    </div>`).join('')
}

function updateActive(items: HTMLDivElement[], scroll = true): void {
  items.forEach((el, i) => el.classList.toggle('active', i === state.paletteIndex))
  if (scroll) items[state.paletteIndex]?.scrollIntoView({ block: 'nearest' })
}

// ── Dict Ops ─────────────────────────────────────────────────

function save(msg: string): void {
  GMX.set(STORE_KEYS.dict, state.dict); renderList(searchEl.value); notify.toast(msg)
}

function addNew(): void {
  searchEl.value = ''; renderList()
  const t = document.createElement('div'); t.className = 'sae-item editing'
  listEl.insertBefore(t, listEl.firstChild)
  mountAbbrevEditor(t, '', '', (k, v) => {
    if (!k || !v) { notify.toast('Both fields required'); return }
    state.dict[k] = v; save('Added')
  }, () => { t.remove(); renderList() })
}

function editAbbrev(item: HTMLDivElement, key: string): void {
  item.classList.add('editing')
  mountAbbrevEditor(item, key, state.dict[key], (nk, nv) => {
    if (!nk || !nv) { notify.toast('Both fields required'); return }
    if (nk !== key) delete state.dict[key]
    state.dict[nk] = nv; save('Saved')
  }, () => renderList(searchEl.value))
}

function deleteAbbrev(key: string): void {
  if (!confirm(`Delete "${key}"?`)) return
  delete state.dict[key]; save('Deleted')
}

async function insertAbbrev(key: string): Promise<void> {
  closePalette()
  const tmpl = state.dict[key]; if (!tmpl) return
  const ctx = getContextOrFallback(); if (!ctx) { notify.toast('No editable field'); return }
  makeEditor(captureContext() || ctx)?.replace((await renderTemplate(tmpl)).text)
}

// ── Settings ─────────────────────────────────────────────────

function showSettings(show: boolean): void {
  panelEl.classList.toggle('settings-open', show)
  backBtn.style.display = show ? 'flex' : 'none'
  settingsBtn.style.display = show ? 'none' : 'flex'
  show ? renderSettings() : searchEl.focus()
}

function renderSettings(): void {
  settingsEl.innerHTML = settingsHTML(state.apiKey, hotkeyStr(state.hotkeys.palette), hotkeyStr(state.hotkeys.aiMenu))

  // API key
  const apiIn = $<HTMLInputElement>('#sae-api', settingsEl)!
  const verBtn = $<HTMLButtonElement>('#sae-verify', settingsEl)!
  apiIn.onchange = () => { state.apiKey = apiIn.value.trim(); GMX.set(STORE_KEYS.apiKey, state.apiKey) }
  verBtn.onclick = async () => {
    const k = apiIn.value.split(';')[0]?.trim()
    if (!k) { notify.toast('Enter key first'); return }
    verBtn.disabled = true; verBtn.textContent = '...'
    const ok = await verifyApiKey(k)
    verBtn.textContent = ok ? '✓' : '✗'
    if (ok) { state.apiKey = apiIn.value.trim(); GMX.set(STORE_KEYS.apiKey, state.apiKey); notify.toast('Valid') }
    else notify.toast('Invalid')
    setTimeout(() => { verBtn.textContent = 'Verify'; verBtn.disabled = false }, 1800)
  }

  // Hotkeys
  $$<HTMLButtonElement>('[data-hk]', settingsEl).forEach(btn => {
    btn.onclick = async () => {
      notify.toast('Press new hotkey...')
      const spec = await captureHotkey(); if (!spec) return
      const name = btn.dataset.hk as 'palette' | 'aiMenu'
      state.hotkeys[name] = spec
      const keys = GMX.get<Record<string, HotkeySpec>>(STORE_KEYS.keys, {}); keys[name] = spec; GMX.set(STORE_KEYS.keys, keys)
      renderSettings(); notify.toast(`Set: ${hotkeyStr(spec)}`)
    }
  })

  renderBuiltins(); renderCustoms()
  $<HTMLButtonElement>('#sae-add-prompt', settingsEl)!.onclick = addPrompt
  $<HTMLButtonElement>('#sae-export', settingsEl)!.onclick = exportDict
  $<HTMLButtonElement>('#sae-import', settingsEl)!.onclick = importDict
  $<HTMLButtonElement>('#sae-reset', settingsEl)!.onclick = resetDict
}

// ── Prompts ──────────────────────────────────────────────────

function wireToggles(container: HTMLElement, getIdx: (el: HTMLElement) => string, toggle: (id: string) => void): void {
  container.querySelectorAll<HTMLDivElement>('[data-toggle]').forEach(t => {
    t.onclick = () => { toggle(getIdx(t.closest<HTMLElement>('.sae-p-item')!)); }
  })
}

function renderBuiltins(): void {
  const c = $<HTMLDivElement>('#sae-builtins', settingsEl)!
  c.innerHTML = BUILTIN_PROMPTS.map(p => promptItemHTML(p, 0, true, isBuiltinEnabled(p.id))).join('')
  wireToggles(c, el => el.dataset.id!, id => {
    const i = state.disabledBuiltins.indexOf(id)
    i >= 0 ? state.disabledBuiltins.splice(i, 1) : state.disabledBuiltins.push(id)
    GMX.set(STORE_KEYS.disabledBuiltins, state.disabledBuiltins); renderBuiltins()
  })
}

function renderCustoms(): void {
  const c = $<HTMLDivElement>('#sae-customs', settingsEl)!
  if (!state.customPrompts.length) { c.innerHTML = '<div class="sae-empty">No custom prompts</div>'; return }
  c.innerHTML = state.customPrompts.map((p, i) => promptItemHTML(p, i, false, p.enabled !== false)).join('')

  wireToggles(c, el => el.dataset.idx!, idx => {
    state.customPrompts[+idx].enabled = !state.customPrompts[+idx].enabled
    GMX.set(STORE_KEYS.customPrompts, state.customPrompts); renderCustoms()
  })
  c.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach(b => {
    b.onclick = () => editPrompt(+b.closest<HTMLElement>('.sae-p-item')!.dataset.idx!)
  })
  c.querySelectorAll<HTMLButtonElement>('[data-del]').forEach(b => {
    b.onclick = () => {
      const i = +b.closest<HTMLElement>('.sae-p-item')!.dataset.idx!
      if (!confirm(`Delete "${state.customPrompts[i].label}"?`)) return
      state.customPrompts.splice(i, 1); GMX.set(STORE_KEYS.customPrompts, state.customPrompts)
      renderCustoms(); notify.toast('Deleted')
    }
  })
}

function addPrompt(): void {
  const c = $<HTMLDivElement>('#sae-customs', settingsEl)!
  c.querySelector('.sae-empty')?.remove()
  const el = document.createElement('div'); el.className = 'sae-p-item editing'
  el.innerHTML = promptEditFormHTML('', '')
  c.insertBefore(el, c.firstChild)
  setupPromptForm(el, (label, prompt) => {
    state.customPrompts.push({ id: genId(), label, prompt, enabled: true })
    GMX.set(STORE_KEYS.customPrompts, state.customPrompts); renderCustoms(); notify.toast('Added')
  })
}

function editPrompt(idx: number): void {
  const p = state.customPrompts[idx]; if (!p) return
  const el = $<HTMLDivElement>(`[data-idx="${idx}"]`, settingsEl)!
  el.className = 'sae-p-item editing'
  el.innerHTML = promptEditFormHTML(p.label, p.prompt)
  setupPromptForm(el, (label, prompt) => {
    Object.assign(p, { label, prompt })
    GMX.set(STORE_KEYS.customPrompts, state.customPrompts); renderCustoms(); notify.toast('Saved')
  })
}

function setupPromptForm(el: HTMLDivElement, onSave: (l: string, p: string) => void): void {
  const [lb, pr] = [$<HTMLInputElement>('#pl', el)!, $<HTMLTextAreaElement>('#pp', el)!]
  $<HTMLButtonElement>('#ps', el)!.onclick = () => {
    const l = lb.value.trim(), p = pr.value.trim()
    if (!l || !p) { notify.toast('Required'); return }
    onSave(l, p)
  }
  $<HTMLButtonElement>('#pc', el)!.onclick = () => renderCustoms()
  requestAnimationFrame(() => lb.focus())
}

// ── Dict IO ──────────────────────────────────────────────────

function exportDict(): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify(state.dict, null, 2)], { type: 'application/json' }))
  a.download = `texpander-${new Date().toISOString().slice(0, 10)}.json`; a.click(); notify.toast('Exported')
}

async function importDict(): Promise<void> {
  const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.json' })
  inp.onchange = async () => {
    try {
      let o = JSON.parse(await inp.files![0].text()); if (o.dict) o = o.dict
      const imp = normalizeDict(o)
      if (!Object.keys(imp).length) { notify.toast('No entries'); return }
      Object.assign(state.dict, imp); GMX.set(STORE_KEYS.dict, state.dict)
      renderList(); notify.toast(`Imported ${Object.keys(imp).length}`)
    } catch { notify.toast('Invalid JSON') }
  }; inp.click()
}

function resetDict(): void {
  if (!confirm('Reset to defaults?')) return
  state.dict = normalizeDict(DEFAULT_DICT); GMX.set(STORE_KEYS.dict, state.dict); renderList(); notify.toast('Reset')
}

// ── Init & Events ────────────────────────────────────────────

function ensurePalette(): HTMLDivElement {
  if (paletteEl) return paletteEl
  paletteEl = document.createElement('div'); paletteEl.className = 'sae-palette'
  paletteEl.innerHTML = paletteHTML(); document.documentElement.appendChild(paletteEl)

  panelEl = $<HTMLDivElement>('.sae-panel', paletteEl)!
  searchEl = $<HTMLInputElement>('.sae-search', paletteEl)!
  listEl = $<HTMLDivElement>('.sae-list', paletteEl)!
  settingsEl = $<HTMLDivElement>('.sae-settings', paletteEl)!
  backBtn = $<HTMLButtonElement>('[data-action="back"]', paletteEl)!
  settingsBtn = $<HTMLButtonElement>('[data-action="settings"]', paletteEl)!

  paletteEl.addEventListener('click', e => { if (e.target === paletteEl) closePalette() })
  $<HTMLButtonElement>('[data-action="close"]', paletteEl)!.onclick = closePalette
  settingsBtn.onclick = () => showSettings(true)
  backBtn.onclick = () => showSettings(false)
  $<HTMLButtonElement>('[data-action="add"]', paletteEl)!.onclick = addNew

  searchEl.addEventListener('input', debounce(() => renderList(searchEl.value), CONFIG.searchDebounceMs))
  paletteEl.addEventListener('keydown', handlePaletteKey)
  listEl.addEventListener('click', handleListClick)

  listEl.addEventListener('pointermove', (e: PointerEvent) => {
    if (e.movementX === 0 && e.movementY === 0) return
    const item = (e.target as HTMLElement).closest<HTMLDivElement>('.sae-item:not(.editing)')
    if (!item || item.classList.contains('active')) return
    const items = $$<HTMLDivElement>('.sae-item:not(.editing)', listEl)
    const idx = items.indexOf(item)
    if (idx >= 0 && state.paletteIndex !== idx) {
      state.paletteIndex = idx
      updateActive(items, false)
    }
  })

  return paletteEl
}

function handlePaletteKey(e: KeyboardEvent): void {
  if (panelEl.classList.contains('settings-open')) { if (e.key === 'Escape') { e.preventDefault(); showSettings(false) }; return }
  if ((e.target as HTMLElement).closest('.sae-item.editing')) return
  if (e.key === 'Escape') { e.preventDefault(); closePalette(); return }
  if (e.key === 'Enter') {
    e.preventDefault()
    const a = listEl.querySelector<HTMLDivElement>('.sae-item.active:not(.editing)')
    if (a?.dataset.key) insertAbbrev(a.dataset.key); return
  }
  const items = $$<HTMLDivElement>('.sae-item:not(.editing)', listEl); if (!items.length) return
  if (e.key === 'ArrowDown') { e.preventDefault(); state.paletteIndex = Math.min(items.length - 1, state.paletteIndex + 1); updateActive(items) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); state.paletteIndex = Math.max(0, state.paletteIndex - 1); updateActive(items) }
}

function handleListClick(e: MouseEvent): void {
  const item = (e.target as HTMLElement).closest<HTMLDivElement>('.sae-item')
  if (!item || item.classList.contains('editing')) return
  const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action
  const key = item.dataset.key!
  if (action === 'edit') editAbbrev(item, key)
  else if (action === 'delete') deleteAbbrev(key)
  else insertAbbrev(key)
}

// ── Public API ───────────────────────────────────────────────

export function openPalette(): void {
  const p = ensurePalette(); p.classList.add('open')
  prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'
  showSettings(false)
  searchEl.value = ''; state.paletteIndex = 0; renderList(); searchEl.focus()
}

export function closePalette(): void {
  if (!paletteEl) return
  paletteEl.classList.remove('open'); document.body.style.overflow = prevOverflow; prevOverflow = ''
}

export const isPaletteOpen = (): boolean => paletteEl?.classList.contains('open') ?? false