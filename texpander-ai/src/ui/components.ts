import { $ } from '../core'
import { notify } from './notify'

const VALID_KEY_PATTERN = /^[\w-]+$/i

export function mountAbbrevEditor(
  container: HTMLDivElement,
  key: string,
  val: string,
  onSave: (k: string, v: string) => void,
  onCancel: () => void
): void {
  container.innerHTML = `
    <input class="sae-input" placeholder="abbreviation" value="${key}" data-field="key" style="max-width:140px" aria-label="Abbreviation" />
    <input class="sae-input" placeholder="expansion (supports {{templates}})" value="${val}" data-field="val" aria-label="Expansion" />
    <div class="sae-item-actions">
      <button data-action="save">Save</button>
      <button data-action="cancel">Cancel</button>
    </div>
  `

  const keyIn = $<HTMLInputElement>('[data-field="key"]', container)!
  const valIn = $<HTMLInputElement>('[data-field="val"]', container)!

  const save = () => {
    const k = keyIn.value.trim().toLowerCase()
    if (!VALID_KEY_PATTERN.test(k)) {
      notify.toast('Invalid: letters, numbers, -, _ only')
      return
    }
    onSave(k, valIn.value)
  }

  $<HTMLButtonElement>('[data-action="save"]', container)!.onclick = save
  $<HTMLButtonElement>('[data-action="cancel"]', container)!.onclick = onCancel

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.target === keyIn ? valIn.focus() : save()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  keyIn.addEventListener('keydown', handleKey)
  valIn.addEventListener('keydown', handleKey)
  keyIn.focus()
  keyIn.select?.()
}