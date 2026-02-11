import { notify } from './notify'

const VALID_KEY_PATTERN = /^[\w-]+$/i

export function mountAbbrevEditor(
  container: HTMLDivElement,
  key: string,
  val: string,
  onSave: (k: string, v: string) => void,
  onCancel: () => void
): void {
  // Clear container first
  container.innerHTML = ''

  const keyInput = document.createElement('input')
  keyInput.className = 'sae-input'
  keyInput.placeholder = 'abbreviation'
  keyInput.value = key
  keyInput.dataset.field = 'key'
  keyInput.style.maxWidth = '140px'
  keyInput.ariaLabel = 'Abbreviation'

  const valInput = document.createElement('input')
  valInput.className = 'sae-input'
  valInput.placeholder = 'expansion (supports {{templates}})'
  valInput.value = val
  valInput.dataset.field = 'val'
  valInput.ariaLabel = 'Expansion'

  const actionsDiv = document.createElement('div')
  actionsDiv.className = 'sae-item-actions'

  const saveBtn = document.createElement('button')
  saveBtn.dataset.action = 'save'
  saveBtn.textContent = 'Save'

  const cancelBtn = document.createElement('button')
  cancelBtn.dataset.action = 'cancel'
  cancelBtn.textContent = 'Cancel'

  actionsDiv.appendChild(saveBtn)
  actionsDiv.appendChild(cancelBtn)

  container.appendChild(keyInput)
  container.appendChild(valInput)
  container.appendChild(actionsDiv)

  const save = () => {
    const k = keyInput.value.trim().toLowerCase()
    if (!VALID_KEY_PATTERN.test(k)) {
      notify.toast('Invalid: letters, numbers, -, _ only')
      return
    }
    onSave(k, valInput.value)
  }

  saveBtn.onclick = save
  cancelBtn.onclick = onCancel

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.target === keyInput ? valInput.focus() : save()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  keyInput.addEventListener('keydown', handleKey)
  valInput.addEventListener('keydown', handleKey)

  // Focus logic
  requestAnimationFrame(() => {
    keyInput.focus()
    keyInput.select?.()
  })
}