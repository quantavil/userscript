const handoffPrefix = 'better-icegate-esanchit-';
const dashboard = 'https://foservices.icegate.gov.in/#/role-dashboard/role-dashboardView';

function openNativeService(): boolean {
  const services = document.querySelector('app-role-dashboard-services');
  if (!services) return false;
  const header = services.querySelector<HTMLElement>('mat-expansion-panel-header');
  if (header?.getAttribute('aria-expanded') === 'false') header.click();
  const link = [...services.querySelectorAll<HTMLAnchorElement>('a.change-cursor')]
    .find(a => a.textContent?.trim().toLowerCase() === 'esanchit');
  if (!link) return false;
  link.click();
  return true;
}

export function openEsanchit(target: '_blank' | '_self' = '_blank') {
  if (openNativeService()) return;
  if (target === '_self') {
    window.name = `${handoffPrefix}${Date.now()}`;
    if (location.href === dashboard) {
      window.dispatchEvent(new Event('hashchange'));
    } else {
      location.href = dashboard;
    }
    return;
  }
  // A same-origin dashboard tab inherits ICEGATE's session and runs its SSO action.
  window.open(dashboard, `${handoffPrefix}${Date.now()}`);
}

export function startEsanchitHandoff() {
  const tryHandoff = () => {
    if (!window.name.startsWith(handoffPrefix)) return;
    window.name = '';
    const observer = new MutationObserver(tryOpen);
    const timer = window.setInterval(tryOpen, 500);
    const timeout = window.setTimeout(stop, 30000);
    function stop() { observer.disconnect(); clearInterval(timer); clearTimeout(timeout); }
    function tryOpen() { if (openNativeService()) stop(); }
    observer.observe(document.body, { childList: true, subtree: true });
    tryOpen();
  };
  tryHandoff();
  window.addEventListener('hashchange', tryHandoff);
}
