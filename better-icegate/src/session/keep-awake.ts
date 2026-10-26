/** Only extend a currently active portal inactivity deadline. */
export function shouldKeepAwake(loggedIn: string | null, expiry: string | null, now: number): boolean {
  if (loggedIn !== 'true' || !expiry) return false;
  const deadline = Number(expiry);
  return Number.isFinite(deadline) && deadline > now;
}

export function startKeepAwake(): void {
  const interrupt = () => {
    if (shouldKeepAwake(sessionStorage.getItem('loggedIn'), localStorage.getItem('ng2Idle.main.expiry'), Date.now())) {
      // ICEGATE's ng2-idle listens for scroll on the document element. This
      // dispatches an event only; it does not move the page or send credentials.
      document.documentElement.dispatchEvent(new Event('scroll'));
    }
  };
  window.setInterval(interrupt, 60_000);
}
