import {
  CARGO_PDF_LABELS,
  SIZE_LABELS,
  SIZE_SHORT,
  TYPE_LABELS,
  TYPE_SHORT,
} from '../core/constants';
import {
  formatDateDDMMYYYY,
  formatWeight,
  summarizeContainerSizes,
} from '../core/validators';
import type {
  CustomerRecord,
  VgmBatch,
  VgmContainerRow,
  WeighbridgeRecord,
} from '../types';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mountOffscreen(html: string, widthPx: number): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: fixed;
    left: -99999px;
    top: 0;
    width: ${widthPx}px;
    background: #ffffff;
    color: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    padding: 26px 32px;
    box-sizing: border-box;
    z-index: -1;
    -webkit-font-smoothing: antialiased;
  `;
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  return wrapper;
}

function formatHazardous(batch: VgmBatch): string {
  if (batch.cargoType !== 'HAZ') return 'N.A.';
  const parts: string[] = [];
  if (batch.unNo.trim()) parts.push(`UN No: ${batch.unNo.trim()}`);
  if (batch.imoNo.trim()) parts.push(`IMDG Class: ${batch.imoNo.trim()}`);
  return parts.length > 0 ? parts.join(' | ') : 'Hazardous (Details Pending)';
}

function formatWeighbridge(wb: WeighbridgeRecord | null): string {
  if (!wb) return '—';
  const regPrefix =
    wb.regNo.trim() && wb.regNo.trim().toUpperCase() !== 'XXXX'
      ? `Reg. No: ${esc(wb.regNo.trim())} — `
      : '';
  const namePart = `<strong>${esc(wb.name.trim())}</strong>`;
  const addrPart = wb.address.trim()
    ? `<div style="color:#334155;margin-top:2px;">${esc(wb.address.trim())}</div>`
    : '';
  return `${regPrefix}${namePart}${addrPart}`;
}

function formatContact(phone: string): string {
  const clean = phone.trim();
  if (!clean) return '—';
  return clean.startsWith('+') ? clean : `+91 ${clean}`;
}

export function buildSingleVgmHtml(
  batch: VgmBatch,
  row: VgmContainerRow,
  customer: CustomerRecord | null,
  weighbridge: WeighbridgeRecord | null,
): string {
  const today = formatDateDDMMYYYY();
  const methodLabel = batch.method === 'M1' ? 'Method-1 (Weighed Packed Container)' : 'Method-2 (Calculated VGM)';
  const sizeText = `1 × ${SIZE_LABELS[row.sizeCode]} — ${TYPE_LABELS[row.typeCode]}`;
  const hasBreakdown = Number(row.cargoWt) > 0 && Number(row.tareWt) > 0;
  const methodDetail = hasBreakdown
    ? `${methodLabel}<div style="color:#475569;font-size:10.5px;margin-top:2px;">Cargo (${formatWeight(row.cargoWt)} KG) + Tare (${formatWeight(row.tareWt)} KG) = <strong>${formatWeight(row.vgmWt)} KG</strong></div>`
    : methodLabel;

  const shipperName = customer?.name.trim() || '—';
  const shipperRegType = customer?.regType || 'IEC No';
  const shipperRegNo = customer?.regNo.trim() || '—';
  const official = customer?.authorizedOfficial.trim() || '—';
  const contact = formatContact(customer?.contactNo ?? '');

  const tr = (sr: string, label: string, valHtml: string, highlight = false): string => `
    <tr style="${highlight ? 'background:#f0f7ff;' : ''}">
      <td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:center;color:#475569;font-weight:600;width:44px;vertical-align:top;">${sr}</td>
      <td style="border:1px solid #cbd5e1;padding:6px 10px;color:#334155;width:44%;vertical-align:top;">${label}</td>
      <td style="border:1px solid #cbd5e1;padding:6px 10px;color:#0f172a;vertical-align:top;${highlight ? 'font-weight:700;font-size:12.5px;color:#0f2942;' : ''}">${valHtml}</td>
    </tr>`;

  return `
    <div style="font-size:11.5px;line-height:1.42;color:#0f172a;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #0f2942;padding-bottom:12px;margin-bottom:14px;">
        <div style="max-width:58%;">
          ${
            customer?.logoDataUrl
              ? `<img src="${customer.logoDataUrl}" style="max-height:52px;max-width:210px;object-fit:contain;display:block;margin-bottom:4px;" />`
              : `<div style="font-size:15px;font-weight:800;color:#0f2942;letter-spacing:0.01em;">${esc(shipperName)}</div>`
          }
          <div style="font-size:10px;color:#475569;margin-top:2px;">SOLAS Chapter VI, Regulation 2 — Verified Gross Mass Declaration</div>
        </div>
        <div style="text-align:right;">
          <div style="display:inline-block;background:#0f2942;color:#ffffff;font-size:9.5px;font-weight:700;letter-spacing:0.08em;padding:3px 9px;border-radius:3px;">ANNEXURE-1 • VGM</div>
          <div style="font-size:10.5px;color:#334155;margin-top:6px;"><strong>Date:</strong> ${today}</div>
          <div style="font-size:10.5px;color:#334155;"><strong>Booking:</strong> ${esc(row.bookingNo.trim() || '—')}</div>
        </div>
      </div>

      <div style="text-align:center;margin-bottom:12px;">
        <div style="font-size:14px;font-weight:800;color:#0f2942;letter-spacing:0.03em;">INFORMATION ABOUT VERIFIED GROSS MASS OF CONTAINER</div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:11.5px;font-variant-numeric:tabular-nums;">
        <thead>
          <tr style="background:#0f2942;color:#ffffff;">
            <th style="border:1px solid #0f2942;padding:7px 8px;text-align:center;font-weight:700;width:44px;">Sr.</th>
            <th style="border:1px solid #0f2942;padding:7px 10px;text-align:left;font-weight:700;width:44%;">Details of Information</th>
            <th style="border:1px solid #0f2942;padding:7px 10px;text-align:left;font-weight:700;">Particulars</th>
          </tr>
        </thead>
        <tbody>
          ${tr('1', 'Booking No. *', `<strong>${esc(row.bookingNo.trim() || '—')}</strong>`)}
          ${tr('1A', 'Name of the Shipper *', `<strong>${esc(shipperName)}</strong>`)}
          ${tr('2', `Shipper Registration / License No. (${esc(shipperRegType)}) **`, esc(shipperRegNo))}
          ${tr('3', 'Name &amp; Designation of Authorized Official of Shipper *', esc(official))}
          ${tr('4', '24 × 7 Contact Details of Authorized Official *', esc(contact))}
          ${tr('5', 'Container No. *', esc(row.containerNo.trim().toUpperCase() || '—'), true)}
          ${tr('6', 'Container Size &amp; Type (TEU / FEU / Other) *', esc(sizeText))}
          ${tr('7', 'Maximum Permissible Weight as per CSC Plate *', `${formatWeight(row.cscMaxWt)} KG`)}
          ${tr('8', 'Verified Gross Mass (VGM) *', `${formatWeight(row.vgmWt)} KG`, true)}
          ${tr('9', 'Weighing Method (Method-1 / Method-2) *', methodDetail)}
          ${tr('10', 'Date &amp; Time of Weighing *', esc(row.weighingDateTime.trim() || '—'))}
          ${tr('11', 'Weighbridge Slip No. *', esc(row.slipNo.trim() || '—'))}
          ${tr('12', 'Weighbridge Registration No., Name &amp; Address *', formatWeighbridge(weighbridge))}
          ${tr('13', 'Cargo Type (Normal / Reefer / Hazardous / Others) *', esc(CARGO_PDF_LABELS[batch.cargoType]))}
          ${tr('14', 'If Hazardous — UN No. &amp; IMDG Class', esc(formatHazardous(batch)))}
        </tbody>
      </table>

      <div style="margin-top:14px;padding:9px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-left:3px solid #0f2942;border-radius:3px;font-size:10.5px;color:#334155;">
        <strong style="color:#0f2942;">Declaration:</strong> I/We hereby declare that the Verified Gross Mass (VGM) information provided above is true, accurate, and obtained using an approved weighing method in compliance with IMO SOLAS Chapter VI, Regulation 2 and DG Shipping guidelines.
      </div>

      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:18px;">
        <div style="font-size:10px;color:#475569;line-height:1.5;max-width:54%;">
          <div><strong>Date:</strong> ${today}</div>
          <div style="margin-top:4px;">* Mandatory fields as per DG Shipping Annexure-1.</div>
          <div>** Shippers without IEC / CIN may provide PAN (Company) or Aadhaar / Passport (Individual).</div>
        </div>
        <div style="text-align:center;min-width:225px;">
          ${
            customer?.sealDataUrl
              ? `<img src="${customer.sealDataUrl}" style="max-height:84px;max-width:190px;object-fit:contain;display:block;margin:0 auto 4px;" />`
              : `<div style="height:56px;"></div>`
          }
          <div style="font-weight:700;font-size:10.5px;color:#0f2942;border-top:1px solid #334155;padding-top:4px;">
            Signature &amp; Seal of Authorized Official
          </div>
          <div style="font-size:9.5px;color:#475569;margin-top:2px;">For ${esc(shipperName)}</div>
        </div>
      </div>

      ${
        customer?.footerText.trim()
          ? `<div style="margin-top:16px;border-top:1px solid #cbd5e1;padding-top:7px;font-size:9px;color:#64748b;white-space:pre-line;line-height:1.4;">${esc(customer.footerText.trim())}</div>`
          : ''
      }
    </div>
  `;
}

export function buildSingleVgmElement(
  batch: VgmBatch,
  row: VgmContainerRow,
  customer: CustomerRecord | null,
  weighbridge: WeighbridgeRecord | null,
): HTMLElement {
  return mountOffscreen(buildSingleVgmHtml(batch, row, customer, weighbridge), 794);
}

export function buildMultiVgmHtml(
  batch: VgmBatch,
  customer: CustomerRecord | null,
  weighbridge: WeighbridgeRecord | null,
): string {
  const today = formatDateDDMMYYYY();
  const shipperName = customer?.name.trim() || '—';
  const shipperRegType = customer?.regType || 'IEC No';
  const shipperRegNo = customer?.regNo.trim() || '—';
  const official = customer?.authorizedOfficial.trim() || '—';
  const contact = formatContact(customer?.contactNo ?? '');
  const sizeSummary = summarizeContainerSizes(batch.rows);
  const methodLabel = batch.method === 'M1' ? 'Method-1 (Weighed Packed Container)' : 'Method-2 (Calculated VGM)';

  const totalTare = batch.rows.reduce((sum, r) => sum + (Number(r.tareWt) || 0), 0);
  const totalCargo = batch.rows.reduce((sum, r) => sum + (Number(r.cargoWt) || 0), 0);
  const totalVgm = batch.rows.reduce((sum, r) => sum + (Number(r.vgmWt) || 0), 0);

  const uniqueBookings = Array.from(
    new Set(batch.rows.map((r) => r.bookingNo.trim()).filter(Boolean)),
  );
  const bookingDisplay =
    uniqueBookings.length === 1
      ? uniqueBookings[0]
      : uniqueBookings.length > 1
        ? `${uniqueBookings.length} Bookings (See Schedule)`
        : '—';

  const rowsHtml = batch.rows
    .map(
      (r, idx) => `
      <tr style="${idx % 2 === 1 ? 'background:#f8fafc;' : ''}">
        <td style="border:1px solid #cbd5e1;padding:5px 6px;text-align:center;color:#475569;">${idx + 1}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 6px;">${esc(r.bookingNo.trim() || '—')}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 6px;font-weight:700;color:#0f2942;">${esc(r.containerNo.trim().toUpperCase() || '—')}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 6px;text-align:center;">${esc(SIZE_SHORT[r.sizeCode])} ${esc(TYPE_SHORT[r.typeCode])}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 6px;text-align:right;">${formatWeight(r.cscMaxWt)}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 6px;text-align:right;">${formatWeight(r.tareWt)}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 6px;text-align:right;">${formatWeight(r.cargoWt)}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 6px;text-align:right;font-weight:700;color:#0f2942;background:#f0f7ff;">${formatWeight(r.vgmWt)}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 6px;white-space:nowrap;">${esc(r.weighingDateTime.trim() || '—')}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 6px;">${esc(r.slipNo.trim() || '—')}</td>
      </tr>`,
    )
    .join('');

  return `
    <div style="font-size:11px;line-height:1.4;color:#0f172a;font-variant-numeric:tabular-nums;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #0f2942;padding-bottom:10px;margin-bottom:12px;">
        <div style="max-width:56%;">
          ${
            customer?.logoDataUrl
              ? `<img src="${customer.logoDataUrl}" style="max-height:48px;max-width:210px;object-fit:contain;display:block;margin-bottom:3px;" />`
              : `<div style="font-size:15px;font-weight:800;color:#0f2942;">${esc(shipperName)}</div>`
          }
          <div style="font-size:10px;color:#475569;">Consolidated SOLAS Chapter VI, Regulation 2 — Verified Gross Mass Declaration</div>
        </div>
        <div style="text-align:right;">
          <div style="display:inline-block;background:#0f2942;color:#ffffff;font-size:9.5px;font-weight:700;letter-spacing:0.08em;padding:3px 10px;border-radius:3px;">ANNEXURE-1 • MULTI-CONTAINER VGM</div>
          <div style="font-size:10.5px;color:#334155;margin-top:5px;">
            <strong>Containers:</strong> ${batch.rows.length} &nbsp;|&nbsp;
            <strong>Total VGM:</strong> ${formatWeight(totalVgm)} KG &nbsp;|&nbsp;
            <strong>Date:</strong> ${today}
          </div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:14px;">
        <tbody>
          <tr>
            <td style="border:1px solid #cbd5e1;padding:5px 8px;background:#f8fafc;font-weight:600;color:#334155;width:19%;">1* Shipper Name</td>
            <td style="border:1px solid #cbd5e1;padding:5px 8px;font-weight:700;width:33%;">${esc(shipperName)}</td>
            <td style="border:1px solid #cbd5e1;padding:5px 8px;background:#f8fafc;font-weight:600;color:#334155;width:19%;">2* Reg. No (${esc(shipperRegType)})</td>
            <td style="border:1px solid #cbd5e1;padding:5px 8px;width:29%;">${esc(shipperRegNo)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #cbd5e1;padding:5px 8px;background:#f8fafc;font-weight:600;color:#334155;">3* Authorized Official</td>
            <td style="border:1px solid #cbd5e1;padding:5px 8px;">${esc(official)}</td>
            <td style="border:1px solid #cbd5e1;padding:5px 8px;background:#f8fafc;font-weight:600;color:#334155;">4* 24 × 7 Contact</td>
            <td style="border:1px solid #cbd5e1;padding:5px 8px;">${esc(contact)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #cbd5e1;padding:5px 8px;background:#f8fafc;font-weight:600;color:#334155;">5* Container Summary</td>
            <td style="border:1px solid #cbd5e1;padding:5px 8px;font-weight:600;">${esc(sizeSummary)} &nbsp;(${esc(bookingDisplay)})</td>
            <td style="border:1px solid #cbd5e1;padding:5px 8px;background:#f8fafc;font-weight:600;color:#334155;">8* Weighing Method</td>
            <td style="border:1px solid #cbd5e1;padding:5px 8px;">${esc(methodLabel)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #cbd5e1;padding:5px 8px;background:#f8fafc;font-weight:600;color:#334155;">7* Weighbridge Details</td>
            <td style="border:1px solid #cbd5e1;padding:5px 8px;" colspan="3">${formatWeighbridge(weighbridge)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #cbd5e1;padding:5px 8px;background:#f8fafc;font-weight:600;color:#334155;">12* Cargo Type</td>
            <td style="border:1px solid #cbd5e1;padding:5px 8px;">${esc(CARGO_PDF_LABELS[batch.cargoType])}</td>
            <td style="border:1px solid #cbd5e1;padding:5px 8px;background:#f8fafc;font-weight:600;color:#334155;">13* Hazardous (UN / IMDG)</td>
            <td style="border:1px solid #cbd5e1;padding:5px 8px;">${esc(formatHazardous(batch))}</td>
          </tr>
        </tbody>
      </table>

      <div style="font-size:11.5px;font-weight:800;color:#0f2942;margin-bottom:6px;letter-spacing:0.02em;">
        CONTAINER-WISE VERIFIED GROSS MASS SCHEDULE (WEIGHTS IN KG)
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
        <thead>
          <tr style="background:#0f2942;color:#ffffff;">
            <th style="border:1px solid #0f2942;padding:6px 5px;text-align:center;width:36px;">Sr.</th>
            <th style="border:1px solid #0f2942;padding:6px 6px;text-align:left;">Booking No.</th>
            <th style="border:1px solid #0f2942;padding:6px 6px;text-align:left;">Container No.</th>
            <th style="border:1px solid #0f2942;padding:6px 6px;text-align:center;">Size / Type</th>
            <th style="border:1px solid #0f2942;padding:6px 6px;text-align:right;">CSC Max</th>
            <th style="border:1px solid #0f2942;padding:6px 6px;text-align:right;">Tare (KG)</th>
            <th style="border:1px solid #0f2942;padding:6px 6px;text-align:right;">Cargo (KG)</th>
            <th style="border:1px solid #0f2942;padding:6px 6px;text-align:right;">VGM (KG)</th>
            <th style="border:1px solid #0f2942;padding:6px 6px;text-align:left;">Weighing Date &amp; Time</th>
            <th style="border:1px solid #0f2942;padding:6px 6px;text-align:left;">Slip No.</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr style="background:#e2e8f0;font-weight:700;color:#0f2942;">
            <td colspan="5" style="border:1px solid #94a3b8;padding:6px 8px;text-align:right;">TOTAL (${batch.rows.length} Containers):</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:right;">${formatWeight(totalTare)}</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:right;">${formatWeight(totalCargo)}</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:right;background:#dbeafe;">${formatWeight(totalVgm)} KG</td>
            <td colspan="2" style="border:1px solid #94a3b8;padding:6px;font-size:9.5px;font-weight:500;color:#475569;">All weights verified in Kilograms (KG)</td>
          </tr>
        </tbody>
      </table>

      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:14px;gap:24px;">
        <div style="flex:1;padding:8px 11px;background:#f8fafc;border:1px solid #e2e8f0;border-left:3px solid #0f2942;border-radius:3px;font-size:10px;color:#334155;">
          <div style="font-weight:700;color:#0f2942;margin-bottom:3px;">DECLARATION &amp; CERTIFICATION</div>
          <div>I/We hereby declare that the Verified Gross Mass (VGM) details provided in the schedule above are accurate and obtained using an approved weighing method as per IMO SOLAS regulations and DG Shipping guidelines.</div>
          <div style="margin-top:5px;color:#475569;"><strong>Authorized Signatory:</strong> ${esc(official)} &nbsp;|&nbsp; <strong>For:</strong> ${esc(shipperName)} &nbsp;|&nbsp; <strong>Date:</strong> ${today}</div>
        </div>
        <div style="text-align:center;min-width:210px;">
          ${
            customer?.sealDataUrl
              ? `<img src="${customer.sealDataUrl}" style="max-height:74px;max-width:175px;object-fit:contain;display:block;margin:0 auto 4px;" />`
              : `<div style="height:48px;"></div>`
          }
          <div style="font-weight:700;font-size:10px;color:#0f2942;border-top:1px solid #334155;padding-top:4px;">
            Signature &amp; Seal of Authorized Official
          </div>
        </div>
      </div>

      ${
        customer?.footerText.trim()
          ? `<div style="margin-top:12px;border-top:1px solid #cbd5e1;padding-top:6px;font-size:9px;color:#64748b;white-space:pre-line;line-height:1.35;">${esc(customer.footerText.trim())}</div>`
          : ''
      }
    </div>
  `;
}

export function buildMultiVgmElement(
  batch: VgmBatch,
  customer: CustomerRecord | null,
  weighbridge: WeighbridgeRecord | null,
): HTMLElement {
  return mountOffscreen(buildMultiVgmHtml(batch, customer, weighbridge), 1040);
}
