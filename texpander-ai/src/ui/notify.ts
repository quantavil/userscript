import { CONFIG } from '../config'

let toastEl: HTMLDivElement | null = null
let toastTimer: ReturnType<typeof setTimeout> | null = null

function close(): void {
  if (toastTimer) clearTimeout(toastTimer)
  toastEl?.remove()
  toastEl = toastTimer = null
}

function toast(msg: string, ms = CONFIG.toast.defaultMs): void {
  close()
  toastEl = document.createElement('div')
  toastEl.className = 'sae-toast'
  toastEl.setAttribute('role', 'alert')
  toastEl.setAttribute('aria-live', 'polite')
  toastEl.textContent = msg
  document.documentElement.appendChild(toastEl)
  toastTimer = setTimeout(close, ms)
}

export const notify = { toast, close }