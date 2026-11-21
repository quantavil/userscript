import type {
  CustomerRecord,
  ShippingLineOption,
  VgmBatch,
  VgmContainerRow,
  WeighbridgeRecord,
} from '../types';
import { normalizeKey, splitAddressLines } from './validators';

declare global {
  interface Window {
    jQuery?: (selector: unknown) => {
      val: (v: string) => unknown;
      trigger: (event: string) => unknown;
    };
  }
}

export interface AutofillResult {
  attached: boolean;
  wbLocked: boolean;
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Reads unique shipping lines directly from ODeX's #bnfId select. */
export function getOdexShippingLines(): ShippingLineOption[] {
  const sel = document.getElementById('bnfId') as HTMLSelectElement | null;
  if (!sel) return [];

  const seen = new Set<string>();
  const lines: ShippingLineOption[] = [];
  for (const opt of Array.from(sel.options)) {
    if (!opt.value || seen.has(opt.value)) continue;
    seen.add(opt.value);
    lines.push({
      id: opt.value,
      name: opt.textContent?.trim() ?? opt.value,
    });
  }
  return lines;
}

function setInput(id: string, value: string): boolean {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el || el.readOnly || el.disabled) return false;
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function setSelect(id: string, value: string): boolean {
  const el = document.getElementById(id) as HTMLSelectElement | null;
  if (!el || el.disabled) return false;
  el.value = value;
  if (window.jQuery) {
    window.jQuery(el).val(value);
    window.jQuery(el).trigger('chosen:updated');
    window.jQuery(el).trigger('change');
  } else {
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return true;
}

/**
 * Waits up to `maxMs` for ODeX's asynchronous DWR callback after selecting a Shipping Line
 * to unlock `#weighBridgeRegNo` and `#totWt`.
 */
async function waitForOdexFieldsReady(maxMs = 1200): Promise<boolean> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const wbReg = document.getElementById('weighBridgeRegNo') as HTMLInputElement | null;
    const totWt = document.getElementById('totWt') as HTMLInputElement | null;
    if (wbReg && !wbReg.readOnly && totWt && !totWt.readOnly) {
      return true;
    }
    await wait(100);
  }
  const wbReg = document.getElementById('weighBridgeRegNo') as HTMLInputElement | null;
  return Boolean(wbReg && !wbReg.readOnly);
}

/** Matches a registered Third Party shipper in ODeX's hidden #shipperNm select if present. */
function syncRegisteredShipperId(customerName: string): void {
  const sel = document.getElementById('shipperNm') as HTMLSelectElement | null;
  const hiddenId = document.getElementById('shipperId') as HTMLInputElement | null;
  if (!sel || !hiddenId) return;

  const target = normalizeKey(customerName);
  const match = Array.from(sel.options).find((o) => normalizeKey(o.text) === target);
  hiddenId.value = match ? match.value : '';
}

function attachPdfToOdex(pdfFile: File): boolean {
  const tbody = document.getElementById('table-bodyAttch');
  if (!tbody) return false;

  const findAvailableSlot = (): number => {
    const rows = tbody.querySelectorAll('tr');
    for (let i = 0; i < rows.length; i++) {
      const titleSel = document.getElementById(`attTitle${i}`) as HTMLSelectElement | null;
      const fileInput = document.getElementById(`attFile${i}`) as HTMLInputElement | null;
      if (
        titleSel &&
        fileInput &&
        (!fileInput.files || fileInput.files.length === 0) &&
        (titleSel.value === '' || titleSel.value === 'WT_DECLARATION')
      ) {
        return i;
      }
    }
    return -1;
  };

  let slotIndex = findAvailableSlot();
  if (slotIndex === -1) {
    const addBtn = document.getElementById('attachmentDiv');
    addBtn?.click();
    slotIndex = findAvailableSlot();
  }
  if (slotIndex === -1) return false;

  setSelect(`attTitle${slotIndex}`, 'WT_DECLARATION');
  const descInput = document.getElementById(`attDesc${slotIndex}`) as HTMLInputElement | null;
  if (descInput) {
    descInput.value = 'Weight Declaration - Annexure 1';
  }

  const fileInput = document.getElementById(`attFile${slotIndex}`) as HTMLInputElement | null;
  if (!fileInput) return false;

  const dt = new DataTransfer();
  dt.items.add(pdfFile);
  fileInput.files = dt.files;
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

export async function fillOdexNewVgm(
  batch: VgmBatch,
  row: VgmContainerRow,
  customer: CustomerRecord | null,
  weighbridge: WeighbridgeRecord | null,
  pdfFile?: File,
): Promise<AutofillResult> {
  // 1. Shipping Line (triggers ODeX DWR callback that unlocks weight & weighbridge fields)
  if (batch.shippingLineId) {
    const bnfSel = document.getElementById('bnfId') as HTMLSelectElement | null;
    if (bnfSel && bnfSel.value !== batch.shippingLineId) {
      setSelect('bnfId', batch.shippingLineId);
      await waitForOdexFieldsReady(1200);
    }
  }

  // 2. Shipper Type (Self vs Third Party)
  const radioId = batch.shipperType === 'S' ? 'self' : 'others';
  const radio = document.getElementById(radioId) as HTMLInputElement | null;
  if (radio && !radio.checked) {
    radio.click();
    await wait(120);
  }

  // 3. Booking & Shipper details
  setInput('bookNo', row.bookingNo.trim().toUpperCase());
  if (batch.shipperType === 'O' && customer) {
    syncRegisteredShipperId(customer.name);
    setInput('shipperNm1', customer.name.trim());
    setSelect('shipRegTP', customer.regType);
    setInput('shipRegNo', customer.regNo.trim());
  }

  // 4. Authorized Person (only overwrite if user configured values)
  if (batch.authName.trim()) setInput('requestedBy', batch.authName.trim());
  if (batch.authDesignation.trim()) setInput('designation', batch.authDesignation.trim());
  if (batch.authMobile.trim()) setInput('mobNo', batch.authMobile.trim());

  // 5. VGM Evaluation Method
  const methodId = batch.method === 'M1' ? 'vgmEvalMethod1' : 'vgmEvalMethod2';
  const methodRadio = document.getElementById(methodId) as HTMLInputElement | null;
  if (methodRadio && !methodRadio.disabled && !methodRadio.checked) {
    methodRadio.click();
    await wait(60);
  }

  // 6. Container Details
  setInput('cntnrNo', row.containerNo.trim().toUpperCase());
  setSelect('cntnrSize', row.sizeCode);
  setSelect('cntnrTp', row.typeCode);
  setSelect('cargoTp', batch.cargoType);

  if (batch.cargoType === 'HAZ') {
    await wait(60);
    if (batch.imoNo) setSelect('imoNo1', batch.imoNo);
    if (batch.unNo) setInput('unNo1', batch.unNo.trim());
  }

  setInput('cscPlateMaxWtLimit', row.cscMaxWt.trim());

  if (batch.method === 'M2') {
    if (row.cargoWt.trim()) setInput('cargoWt', row.cargoWt.trim());
    if (row.tareWt.trim()) setInput('tareWt', row.tareWt.trim());
  }
  setInput('totWt', row.vgmWt.trim());

  // 7. Weighbridge Details
  let wbLocked = false;
  if (weighbridge) {
    const wroteReg = setInput('weighBridgeRegNo', weighbridge.regNo.trim());
    if (!wroteReg) {
      const wbEl = document.getElementById('weighBridgeRegNo') as HTMLInputElement | null;
      wbLocked = Boolean(wbEl?.readOnly);
    }
    const [ln1, ln2, ln3] = splitAddressLines(weighbridge.address, 35);
    setInput('weighBridgeAddrLn1', ln1);
    setInput('weighBridgeAddrLn2', ln2);
    setInput('weighBridgeAddrLn3', ln3);
    setInput('weighBridgeNm', weighbridge.name.trim());
  }
  setInput('weighBridgeSlipNo', row.slipNo.trim());
  setInput('weighBridgeWtTs', row.weighingDateTime.trim());

  // 8. Auto-attach generated Annexure-1 PDF if provided
  const attached = pdfFile ? attachPdfToOdex(pdfFile) : false;

  return { attached, wbLocked };
}
