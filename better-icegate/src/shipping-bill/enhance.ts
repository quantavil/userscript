import { isPaginationStorageEvent, paginationChanged, paginationEnabled } from '../settings/pagination';

const initializedForms = new WeakSet<Element>();
const appliedResults = new WeakMap<HTMLSelectElement, boolean>();

function isShippingBill(): boolean {
  const [path, query = ''] = location.hash.slice(1).split('?');
  return path === '/e-copy' && new URLSearchParams(query).get('docType') === 'SB';
}

function enhanceShippingBill() {
  if (!isShippingBill()) return;

  const layout = document.querySelector('app-dec-layout');
  const from = layout?.querySelector<HTMLInputElement>('input[formcontrolname="fromDate"]');
  const to = layout?.querySelector<HTMLInputElement>('input[formcontrolname="toDate"]');
  if (layout && from && to?.value && !initializedForms.has(layout)) {
    initializedForms.add(layout);
    // Use the portal's own date input so its Angular form and validation update too.
    from.value = to.value;
    from.dispatchEvent(new Event('input', { bubbles: true }));
    from.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const select = layout?.querySelector<HTMLSelectElement>('app-dec-details select[name="perPage"]');
  if (select) {
    const enabled = paginationEnabled();
    if (appliedResults.get(select) === enabled) return;
    appliedResults.set(select, enabled);
    const paginator = select.closest<HTMLElement>('.paginator-container');
    const allValue = String(Number.MAX_SAFE_INTEGER);
    if (enabled) {
      if (paginator) paginator.hidden = false;
      if (select.value === allValue) {
        select.value = '10';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      select.querySelector(`option[value="${allValue}"]`)?.remove();
    } else {
      if (!select.querySelector(`option[value="${allValue}"]`)) {
        const all = document.createElement('option');
        all.textContent = 'All';
        all.value = allValue;
        select.add(all);
      }
      select.value = allValue;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const info = paginator?.querySelector('.info-page')?.textContent;
      const counts = info?.match(/Showing\s+\d+\s*-\s*(\d+)\s+of\s+(\d+)/i);
      if (paginator && counts && counts[1] === counts[2]) paginator.hidden = true;
    }
  }
}

export function startShippingBillEnhancements() {
  const observer = new MutationObserver(enhanceShippingBill);
  observer.observe(document.body, { childList: true, subtree: true });
  let timer: number | undefined;
  let timeout: number | undefined;
  const stopRetry = () => {
    clearInterval(timer);
    clearTimeout(timeout);
    timer = undefined;
    timeout = undefined;
  };
  const onRoute = () => {
    stopRetry();
    if (!isShippingBill()) return;
    enhanceShippingBill();
    const layout = document.querySelector('app-dec-layout');
    if (layout && initializedForms.has(layout)) return;
    // Angular may set input values after insertion without a DOM mutation.
    timer = window.setInterval(() => {
      enhanceShippingBill();
      const current = document.querySelector('app-dec-layout');
      if (!isShippingBill() || (current && initializedForms.has(current))) stopRetry();
    }, 250);
    timeout = window.setTimeout(stopRetry, 15000);
  };
  window.addEventListener('hashchange', onRoute);
  window.addEventListener(paginationChanged, enhanceShippingBill);
  window.addEventListener('storage', event => { if (isPaginationStorageEvent(event)) enhanceShippingBill(); });
  onRoute();
}
