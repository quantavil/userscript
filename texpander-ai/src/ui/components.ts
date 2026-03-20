import { notify } from './notify'

const VALID_KEY = /^[\w-]+$/i

export function mountAbbrevEditor(
  container: HTMLDivElement, key: string, val: string,
  onSave: (k: string, v: string) => void, onCancel: () => void
): void {
  container.innerHTML = ''

  const ki = Object.assign(document.createElement('input'), {
    className: 'sae-input', placeholder: 'abbreviation', value: key,
    ariaLabel: 'Abbreviation',
  })
  ki.style.maxWidth = '140px'

  const vi = Object.assign(document.createElement('input'), {
    className: 'sae-input', placeholder: 'expansion (supports {{templates}})', value: val,
    ariaLabel: 'Expansion',
  })

  const acts = document.createElement('div')
  acts.className = 'sae-item-actions'

  const sBtn = Object.assign(document.createElement('button'), { textContent: 'Save' })
  const cBtn = Object.assign(document.createElement('button'), { textContent: 'Cancel' })
  acts.append(sBtn, cBtn)
  container.append(ki, vi, acts)

  const save = () => {
    const k = ki.value.trim().toLowerCase()
    if (!VALID_KEY.test(k)) { notify.toast('Invalid: letters, numbers, -, _ only'); return }
    onSave(k, vi.value)
  }

  sBtn.onclick = save
  cBtn.onclick = onCancel

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); e.target === ki ? vi.focus() : save() }
    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
  }
  ki.addEventListener('keydown', onKey)
  vi.addEventListener('keydown', onKey)
  requestAnimationFrame(() => { ki.focus(); ki.select?.() })
}