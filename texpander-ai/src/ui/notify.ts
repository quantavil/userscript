let toastEl: HTMLDivElement | null = null
let toastTimer: ReturnType<typeof setTimeout> | null = null

function positionToast(): void {
  if (!toastEl) return
  toastEl.style.left = `${Math.max(8, innerWidth - 320)}px`
  toastEl.style.top = `${Math.max(8, innerHeight - 80)}px`
}

export const notify = {
  toast(msg: string, ms = 2200): void {
    this.close()
    toastEl = document.createElement('div')
    toastEl.className = 'sae-toast'
    toastEl.textContent = msg
    document.documentElement.appendChild(toastEl)
    positionToast()
    toastTimer = setTimeout(() => this.close(), ms)
  },

  close(): void {
    if (toastTimer) clearTimeout(toastTimer)
    toastEl?.remove()
    toastEl = toastTimer = null
  },
}