import type { HotkeySpec } from '../types'
import { CONFIG, STORE_KEYS, state, GMX, BUILTIN_PROMPTS, DEFAULT_DICT, isBuiltinEnabled, normalizeDict } from '../config'
import { $, $$, debounce, clamp, escHtml, genId, captureContext, getContextOrFallback, makeEditor, renderTemplate, hotkeyStr, captureHotkey } from '../core'
import { notify } from './notify'
import { mountAbbrevEditor } from './components'
import { paletteHTML, settingsHTML, promptItemHTML, promptEditFormHTML } from './templates'

let paletteEl: HTMLDivElement | null = null
let prevOverflow = ''
let renderList: (filter?: string) => void

function ensurePalette(): HTMLDivElement {
    if (paletteEl) return paletteEl

    paletteEl = document.createElement('div')
    paletteEl.className = 'sae-palette'
    paletteEl.innerHTML = paletteHTML()
    document.documentElement.appendChild(paletteEl)

    const panel = $<HTMLDivElement>('.sae-panel', paletteEl)!
    const search = $<HTMLInputElement>('.sae-search', paletteEl)!
    const list = $<HTMLDivElement>('.sae-list', paletteEl)!
    const settings = $<HTMLDivElement>('.sae-settings', paletteEl)!
    const backBtn = $<HTMLButtonElement>('[data-action="back"]', paletteEl)!

    paletteEl.addEventListener('click', e => { if (e.target === paletteEl) closePalette() })
    $<HTMLButtonElement>('[data-action="close"]', paletteEl)!.onclick = closePalette
    $<HTMLButtonElement>('[data-action="settings"]', paletteEl)!.onclick = () => showSettings(true)
    backBtn.onclick = () => showSettings(false)
    $<HTMLButtonElement>('[data-action="add"]', paletteEl)!.onclick = addNew

    const renderDebounced = debounce(() => renderList(search.value), CONFIG.searchDebounceMs)
    search.addEventListener('input', renderDebounced)

    paletteEl.addEventListener('keydown', e => {
        if (panel.classList.contains('settings-open')) {
            if (e.key === 'Escape') { e.preventDefault(); showSettings(false) }
            return
        }
        if ((e.target as HTMLElement).closest('.sae-item.editing')) return
        if (e.key === 'Escape') { e.preventDefault(); closePalette(); return }
        if (e.key === 'Enter') {
            e.preventDefault()
            const active = list.querySelector<HTMLDivElement>('.sae-item.active:not(.editing)')
            if (active?.dataset.key) insertAbbrev(active.dataset.key)
            return
        }
        const items = $$<HTMLDivElement>('.sae-item:not(.editing)', list)
        if (!items.length) return
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            state.activeIndex = Math.min(items.length - 1, state.activeIndex + 1)
            updateActive(items)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            state.activeIndex = Math.max(0, state.activeIndex - 1)
            updateActive(items)
        }
    })

    list.addEventListener('click', e => {
        const item = (e.target as HTMLElement).closest<HTMLDivElement>('.sae-item')
        if (!item || item.classList.contains('editing')) return
        const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action
        const key = item.dataset.key!
        if (action === 'edit') editAbbrev(item, key)
        else if (action === 'delete') deleteAbbrev(key)
        else insertAbbrev(key)
    })

    function showSettings(show: boolean): void {
        panel.classList.toggle('settings-open', show)
        backBtn.style.display = show ? 'flex' : 'none'
        show ? renderSettings() : search.focus()
    }

    renderList = (filter = ''): void => {
        const q = filter.toLowerCase()
        const keys = Object.keys(state.dict).sort()
        const items = q ? keys.filter(k => k.includes(q) || state.dict[k].toLowerCase().includes(q)) : keys
        state.activeIndex = clamp(state.activeIndex, 0, Math.max(0, items.length - 1))
        list.innerHTML = items.length ? items.map((k, i) => `
      <div class="sae-item${i === state.activeIndex ? ' active' : ''}" data-key="${escHtml(k)}">
        <div class="sae-key">${escHtml(k)}</div>
        <div class="sae-val">${escHtml(state.dict[k])}</div>
        <div class="sae-item-actions"><button data-action="edit">Edit</button><button data-action="delete">Del</button></div>
      </div>
    `).join('') : '<div class="sae-empty">No abbreviations found</div>'
    }

    function updateActive(items: HTMLDivElement[]): void {
        items.forEach((item, i) => item.classList.toggle('active', i === state.activeIndex))
        items[state.activeIndex]?.scrollIntoView({ block: 'nearest' })
    }

    function addNew(): void {
        search.value = ''
        renderList()
        const temp = document.createElement('div')
        temp.className = 'sae-item editing'
        list.insertBefore(temp, list.firstChild)
        mountAbbrevEditor(temp, '', '', (k, v) => {
            if (!k || !v) return notify.toast('Both fields required')
            state.dict[k] = v
            saveAndRender('Added')
        }, () => { temp.remove(); renderList() })
    }

    function editAbbrev(item: HTMLDivElement, key: string): void {
        item.classList.add('editing')
        mountAbbrevEditor(item, key, state.dict[key], (nk, nv) => {
            if (!nk || !nv) return notify.toast('Both fields required')
            if (nk !== key) delete state.dict[key]
            state.dict[nk] = nv
            saveAndRender('Saved')
        }, () => renderList(search.value))
    }

    function deleteAbbrev(key: string): void {
        if (!confirm(`Delete "${key}"?`)) return
        delete state.dict[key]
        saveAndRender('Deleted')
    }

    function saveAndRender(msg: string): void {
        GMX.set(STORE_KEYS.dict, state.dict)
        renderList(search.value)
        notify.toast(msg)
    }

    async function insertAbbrev(key: string): Promise<void> {
        closePalette()
        const tmpl = state.dict[key]
        if (!tmpl) return
        let ctx = state.lastEditable
        if (!ctx || !(ctx.kind === 'input' ? ctx.el?.isConnected : ctx.root?.isConnected)) {
            ctx = getContextOrFallback()
        }
        if (!ctx) return notify.toast('No editable field')
        try { (ctx.kind === 'input' ? ctx.el : ctx.root).focus({ preventScroll: true }) } catch { }
        const rendered = await renderTemplate(tmpl)
        makeEditor(captureContext() || ctx)?.replace(rendered.text)
    }

    function renderSettings(): void {
        settings.innerHTML = settingsHTML(state.apiKey, hotkeyStr(CONFIG.palette), hotkeyStr(CONFIG.aiMenu), CONFIG.aiMenuInlineCount)

        const apiIn = $<HTMLInputElement>('#sae-api', settings)!
        const verifyBtn = $<HTMLButtonElement>('#sae-verify', settings)!
        let verifying = false

        apiIn.onchange = () => { state.apiKey = apiIn.value.trim(); GMX.set(STORE_KEYS.apiKey, state.apiKey) }

        verifyBtn.onclick = async () => {
            if (verifying) return
            const k = apiIn.value.split(';')[0]?.trim()
            if (!k) return notify.toast('Enter key first')

            verifying = true
            verifyBtn.disabled = true
            verifyBtn.textContent = '...'

            try {
                const r = await GMX.request({ method: 'GET', url: `${CONFIG.gemini.endpoint}?key=${encodeURIComponent(k)}`, timeout: 5000 })
                verifyBtn.textContent = r.status < 300 ? '✓' : '✗'
                if (r.status < 300) {
                    state.apiKey = apiIn.value.trim()
                    GMX.set(STORE_KEYS.apiKey, state.apiKey)
                    notify.toast('Valid')
                } else notify.toast('Invalid')
            } catch {
                verifyBtn.textContent = '✗'
                notify.toast('Failed')
            }
            setTimeout(() => { verifyBtn.textContent = 'Verify'; verifyBtn.disabled = false; verifying = false }, 2000)
        }

        $$<HTMLButtonElement>('[data-hk]', settings).forEach(btn => {
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

        $<HTMLInputElement>('#sae-inline', settings)!.onchange = (e) => {
            const el = e.target as HTMLInputElement
            const v = clamp(parseInt(el.value) || 4, 1, 20)
            el.value = String(v)
            CONFIG.aiMenuInlineCount = v
            state.settings.aiMenuInlineCount = v
            GMX.set(STORE_KEYS.settings, state.settings)
        }

        renderBuiltins()
        renderCustoms()
        $<HTMLButtonElement>('#sae-add-prompt', settings)!.onclick = addPrompt

        $<HTMLButtonElement>('#sae-export', settings)!.onclick = () => {
            const a = document.createElement('a')
            a.href = URL.createObjectURL(new Blob([JSON.stringify(state.dict, null, 2)], { type: 'application/json' }))
            a.download = `texpander-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            notify.toast('Exported')
        }

        $<HTMLButtonElement>('#sae-import', settings)!.onclick = () => {
            const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.json' })
            inp.onchange = async () => {
                try {
                    let o = JSON.parse(await inp.files![0].text())
                    if (o.dict) o = o.dict
                    const imp = normalizeDict(o)
                    if (!Object.keys(imp).length) return notify.toast('No entries')
                    Object.assign(state.dict, imp)
                    GMX.set(STORE_KEYS.dict, state.dict)
                    renderList()
                    notify.toast(`Imported ${Object.keys(imp).length}`)
                } catch { notify.toast('Invalid JSON') }
            }
            inp.click()
        }

        $<HTMLButtonElement>('#sae-reset', settings)!.onclick = () => {
            if (!confirm('Reset to defaults?')) return
            state.dict = normalizeDict(DEFAULT_DICT)
            GMX.set(STORE_KEYS.dict, state.dict)
            renderList()
            notify.toast('Reset')
        }
    }

    function renderBuiltins(): void {
        const c = $<HTMLDivElement>('#sae-builtins', settings)!
        c.innerHTML = BUILTIN_PROMPTS.map(p => promptItemHTML(p, 0, true, isBuiltinEnabled(p.id))).join('')

        c.querySelectorAll<HTMLDivElement>('[data-toggle]').forEach(t => {
            t.onclick = () => {
                const id = t.closest<HTMLDivElement>('.sae-prompt-item')!.dataset.id!
                const i = state.disabledBuiltins.indexOf(id)
                i >= 0 ? state.disabledBuiltins.splice(i, 1) : state.disabledBuiltins.push(id)
                GMX.set(STORE_KEYS.disabledBuiltins, state.disabledBuiltins)
                renderBuiltins()
            }
        })
    }

    function renderCustoms(): void {
        const c = $<HTMLDivElement>('#sae-customs', settings)!
        c.innerHTML = state.customPrompts.length
            ? state.customPrompts.map((p, i) => promptItemHTML(p, i, false, p.enabled !== false)).join('')
            : '<div class="sae-empty">No custom prompts</div>'

        c.querySelectorAll<HTMLDivElement>('[data-toggle]').forEach(t => {
            t.onclick = () => {
                const i = +t.closest<HTMLDivElement>('.sae-prompt-item')!.dataset.idx!
                state.customPrompts[i].enabled = !state.customPrompts[i].enabled
                GMX.set(STORE_KEYS.customPrompts, state.customPrompts)
                renderCustoms()
            }
        })

        c.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach(b => {
            b.onclick = () => editPrompt(+b.closest<HTMLDivElement>('.sae-prompt-item')!.dataset.idx!)
        })

        c.querySelectorAll<HTMLButtonElement>('[data-del]').forEach(b => {
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
        const c = $<HTMLDivElement>('#sae-customs', settings)!
        c.querySelector('.sae-empty')?.remove()
        const el = document.createElement('div')
        el.className = 'sae-prompt-item editing'
        el.innerHTML = promptEditFormHTML('⚡', '', '')
        c.insertBefore(el, c.firstChild)

        $<HTMLButtonElement>('#ps', el)!.onclick = () => {
            const ic = $<HTMLInputElement>('#pi', el)!.value.trim() || '⚡'
            const lb = $<HTMLInputElement>('#pl', el)!.value.trim()
            const pr = $<HTMLTextAreaElement>('#pp', el)!.value.trim()
            if (!lb || !pr) return notify.toast('Required')
            state.customPrompts.push({ id: genId(), icon: ic, label: lb, prompt: pr, enabled: true })
            GMX.set(STORE_KEYS.customPrompts, state.customPrompts)
            renderCustoms()
            notify.toast('Added')
        }
        $<HTMLButtonElement>('#pc', el)!.onclick = () => renderCustoms()
        $<HTMLInputElement>('#pl', el)!.focus()
    }

    function editPrompt(idx: number): void {
        const p = state.customPrompts[idx]
        if (!p) return
        const c = $<HTMLDivElement>('#sae-customs', settings)!
        const el = c.querySelector<HTMLDivElement>(`[data-idx="${idx}"]`)!
        el.className = 'sae-prompt-item editing'
        el.innerHTML = promptEditFormHTML(p.icon || '⚡', p.label, p.prompt)

        $<HTMLButtonElement>('#ps', el)!.onclick = () => {
            const ic = $<HTMLInputElement>('#pi', el)!.value.trim() || '⚡'
            const lb = $<HTMLInputElement>('#pl', el)!.value.trim()
            const pr = $<HTMLTextAreaElement>('#pp', el)!.value.trim()
            if (!lb || !pr) return notify.toast('Required')
            Object.assign(p, { icon: ic, label: lb, prompt: pr })
            GMX.set(STORE_KEYS.customPrompts, state.customPrompts)
            renderCustoms()
            notify.toast('Saved')
        }
        $<HTMLButtonElement>('#pc', el)!.onclick = () => renderCustoms()
    }

    return paletteEl
}

export function openPalette(): void {
    const p = ensurePalette()
    p.classList.add('open')
    prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    $<HTMLDivElement>('.sae-panel', p)!.classList.remove('settings-open')
    $<HTMLButtonElement>('[data-action="back"]', p)!.style.display = 'none'
    const s = $<HTMLInputElement>('.sae-search', p)!
    s.value = ''
    state.activeIndex = 0
    renderList?.()
    s.focus()
}

export function closePalette(): void {
    if (!paletteEl) return
    paletteEl.classList.remove('open')
    document.body.style.overflow = prevOverflow
    prevOverflow = ''
}

export function rerenderPalette(): void {
    renderList?.()
}

export const isPaletteOpen = (): boolean => paletteEl?.classList.contains('open') ?? false