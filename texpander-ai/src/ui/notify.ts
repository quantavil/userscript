let toastEl: HTMLDivElement | null = null
let toastTimer: ReturnType<typeof setTimeout> | null = null

export const notify = {
  toast(msg: string, ms = 2200): void {
    this.close()
    toastEl = document.createElement('div')
    toastEl.className = 'sae-toast'
    toastEl.textContent = msg
    document.documentElement.appendChild(toastEl)
    toastTimer = setTimeout(() => this.close(), ms)
  },

  close(): void {
    if (toastTimer) clearTimeout(toastTimer)
    toastEl?.remove()
    toastEl = toastTimer = null
  },
}