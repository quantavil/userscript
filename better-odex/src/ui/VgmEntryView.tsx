import {
  CARGO_LABELS,
  IMO_CLASSES,
  SIZE_LABELS,
  SIZE_SHORT,
  TYPE_LABELS,
  TYPE_SHORT,
} from '../core/constants';
import { createEmptyRow } from '../core/storage';
import {
  formatWeight,
  fromDatetimeLocal,
  isOverCscLimit,
  isValidContainerNo,
  toDatetimeLocal,
} from '../core/validators';
import type {
  CargoTypeCode,
  ContainerSizeCode,
  ContainerTypeCode,
  CustomerRecord,
  ShippingLineOption,
  VgmBatch,
  VgmContainerRow,
  WeighbridgeRecord,
  WorkspaceTab,
} from '../types';
import { Icons } from './icons';

interface VgmEntryViewProps {
  batch: VgmBatch;
  shippingLines: ShippingLineOption[];
  customers: CustomerRecord[];
  weighbridges: WeighbridgeRecord[];
  onUpdateBatch: (updater: (prev: VgmBatch) => VgmBatch) => void;
  onUpdateRow: (index: number, patch: Partial<VgmContainerRow>) => void;
  onSwitchTab: (tab: WorkspaceTab) => void;
}

export function VgmEntryView({
  batch,
  shippingLines,
  customers,
  weighbridges,
  onUpdateBatch,
  onUpdateRow,
  onSwitchTab,
}: VgmEntryViewProps) {
  const activeIndex = Math.min(batch.activeIndex, Math.max(0, batch.rows.length - 1));
  const activeRow = batch.rows[activeIndex] ?? batch.rows[0];
  const multi = batch.rows.length > 1;

  const containerValid = isValidContainerNo(activeRow.containerNo);
  const overCsc = isOverCscLimit(activeRow.vgmWt, activeRow.cscMaxWt);

  const totalTare = batch.rows.reduce((s, r) => s + (Number(r.tareWt) || 0), 0);
  const totalCargo = batch.rows.reduce((s, r) => s + (Number(r.cargoWt) || 0), 0);
  const totalVgm = batch.rows.reduce((s, r) => s + (Number(r.vgmWt) || 0), 0);
  const filledCount = batch.rows.filter((r) => r.fillStatus === 'filled').length;

  const handleAddRow = () => {
    onUpdateBatch((prev) => ({
      ...prev,
      rows: [
        ...prev.rows,
        createEmptyRow({
          bookingNo: activeRow.bookingNo,
          sizeCode: activeRow.sizeCode,
          typeCode: activeRow.typeCode,
          cscMaxWt: activeRow.cscMaxWt,
        }),
      ],
      activeIndex: prev.rows.length,
    }));
  };

  const handleDuplicateRow = () => {
    onUpdateBatch((prev) => {
      const clone: VgmContainerRow = {
        ...activeRow,
        id: crypto.randomUUID(),
        containerNo: '',
        slipNo: '',
        fillStatus: 'pending',
      };
      const rows = [...prev.rows];
      rows.splice(activeIndex + 1, 0, clone);
      return { ...prev, rows, activeIndex: activeIndex + 1 };
    });
  };

  const handleRemoveRow = (index: number) => {
    if (batch.rows.length <= 1) return;
    onUpdateBatch((prev) => {
      const rows = prev.rows.filter((_, idx) => idx !== index);
      return {
        ...prev,
        rows,
        activeIndex: Math.min(prev.activeIndex, rows.length - 1),
      };
    });
  };

  const handleApplyBookingToAll = () => {
    const bkg = activeRow.bookingNo.trim().toUpperCase();
    if (!bkg) return;
    onUpdateBatch((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => ({ ...r, bookingNo: bkg })),
    }));
  };

  const handleNextPending = () => {
    const nextIdx = batch.rows.findIndex(
      (r, idx) => idx > activeIndex && r.fillStatus !== 'filled',
    );
    const wrapIdx =
      nextIdx !== -1
        ? nextIdx
        : batch.rows.findIndex((r) => r.fillStatus !== 'filled');
    if (wrapIdx !== -1) {
      onUpdateBatch((prev) => ({ ...prev, activeIndex: wrapIdx }));
    }
  };

  return (
    <>
      <div class="status-strip">
        <div class="status-label">
          {multi ? `Batch (${batch.rows.length})` : 'Single Container'}
          {multi && (
            <span class="status-sub">
              {' '}
              • {filledCount}/{batch.rows.length} filled
            </span>
          )}
        </div>
        {!multi && (
          <button type="button" class="mini-btn primary" onClick={handleAddRow}>
            <Icons.Plus />
            <span>Add Container</span>
          </button>
        )}
      </div>

      <div class="section-card">
        <div class="section-title">Shipment Details</div>

        <div class="grid-2">
          <label class="field">
            <span>Shipping Line</span>
            <select
              value={batch.shippingLineId}
              onChange={(e) => {
                const sel = e.target as HTMLSelectElement;
                onUpdateBatch((p) => ({
                  ...p,
                  shippingLineId: sel.value,
                  shippingLineName: sel.options[sel.selectedIndex]?.text ?? '',
                }));
              }}
            >
              <option value="">Select</option>
              {shippingLines.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.name}
                </option>
              ))}
            </select>
          </label>

          <label class="field">
            <span>Shipper Type</span>
            <select
              value={batch.shipperType}
              onChange={(e) =>
                onUpdateBatch((p) => ({
                  ...p,
                  shipperType: (e.target as HTMLSelectElement).value as 'S' | 'O',
                }))
              }
            >
              <option value="O">Third Party</option>
              <option value="S">Self</option>
            </select>
          </label>
        </div>

        <div class="grid-2">
          <label class="field">
            <div class="field-label-row">
              <span>Customer</span>
              <button
                type="button"
                class="link-btn"
                onClick={() => onSwitchTab('customers')}
              >
                <span>Manage</span>
                <Icons.ArrowRight />
              </button>
            </div>
            <select
              value={batch.customerId}
              onChange={(e) =>
                onUpdateBatch((p) => ({
                  ...p,
                  customerId: (e.target as HTMLSelectElement).value,
                }))
              }
            >
              {customers.length === 0 ? (
                <option value="">None saved</option>
              ) : (
                customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.isSample ? ' (Sample)' : ''}
                  </option>
                ))
              )}
            </select>
          </label>

          <label class="field">
            <div class="field-label-row">
              <span>Weighbridge</span>
              <button
                type="button"
                class="link-btn"
                onClick={() => onSwitchTab('weighbridges')}
              >
                <span>Manage</span>
                <Icons.ArrowRight />
              </button>
            </div>
            <select
              value={batch.weighbridgeId}
              onChange={(e) =>
                onUpdateBatch((p) => ({
                  ...p,
                  weighbridgeId: (e.target as HTMLSelectElement).value,
                }))
              }
            >
              {weighbridges.length === 0 ? (
                <option value="">None saved</option>
              ) : (
                weighbridges.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                    {w.isSample ? ' (Sample)' : ''}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        <div class="grid-2">
          <label class="field">
            <span>Cargo Type</span>
            <select
              value={batch.cargoType}
              onChange={(e) =>
                onUpdateBatch((p) => ({
                  ...p,
                  cargoType: (e.target as HTMLSelectElement).value as CargoTypeCode,
                }))
              }
            >
              {Object.entries(CARGO_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label class="field">
            <span>Method</span>
            <select
              value={batch.method}
              onChange={(e) =>
                onUpdateBatch((p) => ({
                  ...p,
                  method: (e.target as HTMLSelectElement).value as 'M1' | 'M2',
                }))
              }
            >
              <option value="M1">Method 1</option>
              <option value="M2">Method 2</option>
            </select>
          </label>
        </div>

        {batch.cargoType === 'HAZ' && (
          <div class="grid-2">
            <label class="field">
              <span>IMO Class</span>
              <select
                value={batch.imoNo}
                onChange={(e) =>
                  onUpdateBatch((p) => ({
                    ...p,
                    imoNo: (e.target as HTMLSelectElement).value,
                  }))
                }
              >
                <option value="">Select</option>
                {IMO_CLASSES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label class="field">
              <span>UN No.</span>
              <input
                type="text"
                placeholder="1203"
                value={batch.unNo}
                onInput={(e) =>
                  onUpdateBatch((p) => ({ ...p, unNo: (e.target as HTMLInputElement).value }))
                }
              />
            </label>
          </div>
        )}
      </div>

      {multi && (
        <div class="section-card">
          <div class="section-head">
            <span class="section-title">Containers ({batch.rows.length})</span>
            <div class="btn-row">
              {filledCount < batch.rows.length && (
                <button type="button" class="mini-btn" onClick={handleNextPending}>
                  <span>Next</span>
                  <Icons.ArrowRight />
                </button>
              )}
              <button type="button" class="mini-btn" onClick={handleDuplicateRow}>
                <Icons.Copy />
                <span>Clone</span>
              </button>
              <button type="button" class="mini-btn primary" onClick={handleAddRow}>
                <Icons.Plus />
                <span>Add</span>
              </button>
            </div>
          </div>

          <div class="batch-summary">
            <div class="stat-chip">
              <div class="stat-label">Count</div>
              <div class="stat-val">{batch.rows.length}</div>
            </div>
            <div class="stat-chip">
              <div class="stat-label">Tare</div>
              <div class="stat-val">{formatWeight(totalTare)}</div>
            </div>
            <div class="stat-chip">
              <div class="stat-label">Cargo</div>
              <div class="stat-val">{formatWeight(totalCargo)}</div>
            </div>
            <div class="stat-chip">
              <div class="stat-label">Total VGM</div>
              <div class="stat-val">{formatWeight(totalVgm)} KG</div>
            </div>
          </div>

          <div class="roster-table-wrap">
            <table class="roster-table">
              <thead>
                <tr>
                  <th style="width:30px;">#</th>
                  <th>Container No.</th>
                  <th>Size</th>
                  <th class="num-col">VGM (KG)</th>
                  <th>Status</th>
                  <th style="width:38px;"></th>
                </tr>
              </thead>
              <tbody>
                {batch.rows.map((r, idx) => (
                  <tr
                    key={r.id}
                    class={`roster-row ${idx === activeIndex ? 'active' : ''}`}
                    onClick={() => onUpdateBatch((p) => ({ ...p, activeIndex: idx }))}
                  >
                    <td>{idx + 1}</td>
                    <td>
                      <strong>{r.containerNo || '—'}</strong>
                    </td>
                    <td>
                      {SIZE_SHORT[r.sizeCode]} {TYPE_SHORT[r.typeCode]}
                    </td>
                    <td class="num-col">{formatWeight(r.vgmWt)}</td>
                    <td>
                      <span class={`badge ${r.fillStatus}`}>
                        {r.fillStatus === 'filled' ? 'Filled' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        class="mini-btn danger icon-only"
                        title="Remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveRow(idx);
                        }}
                      >
                        <Icons.Trash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div class="section-card white">
        <div class="section-head">
          <span class="section-title">
            {multi ? `Container #${activeIndex + 1} of ${batch.rows.length}` : 'Container Details'}
          </span>
          {multi && activeRow.bookingNo.trim() && (
            <button type="button" class="link-btn" onClick={handleApplyBookingToAll}>
              Apply Booking # to All
            </button>
          )}
        </div>

        <div class="grid-2">
          <label class="field">
            <span>Booking No. *</span>
            <input
              type="text"
              placeholder="EBKG19519591"
              value={activeRow.bookingNo}
              onInput={(e) =>
                onUpdateRow(activeIndex, {
                  bookingNo: (e.target as HTMLInputElement).value.toUpperCase(),
                })
              }
            />
          </label>

          <label class="field">
            <span>Container No. *</span>
            <input
              type="text"
              class={!containerValid ? 'invalid' : ''}
              placeholder="TXGU8834456"
              maxLength={11}
              value={activeRow.containerNo}
              onInput={(e) =>
                onUpdateRow(activeIndex, {
                  containerNo: (e.target as HTMLInputElement).value.toUpperCase(),
                })
              }
            />
            {!containerValid && <span class="warn-txt">4 letters + 7 digits</span>}
          </label>
        </div>

        <div class="grid-3">
          <label class="field">
            <span>Size</span>
            <select
              value={activeRow.sizeCode}
              onChange={(e) =>
                onUpdateRow(activeIndex, {
                  sizeCode: (e.target as HTMLSelectElement).value as ContainerSizeCode,
                })
              }
            >
              {Object.entries(SIZE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label class="field">
            <span>Type</span>
            <select
              value={activeRow.typeCode}
              onChange={(e) =>
                onUpdateRow(activeIndex, {
                  typeCode: (e.target as HTMLSelectElement).value as ContainerTypeCode,
                })
              }
            >
              {Object.entries(TYPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label class="field">
            <span>CSC Max (KG)</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="32500"
              value={activeRow.cscMaxWt}
              onInput={(e) =>
                onUpdateRow(activeIndex, {
                  cscMaxWt: (e.target as HTMLInputElement).value,
                })
              }
            />
          </label>
        </div>

        <div class="grid-3">
          <label class="field">
            <span>Tare (KG)</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="3700"
              value={activeRow.tareWt}
              onInput={(e) =>
                onUpdateRow(activeIndex, {
                  tareWt: (e.target as HTMLInputElement).value,
                })
              }
            />
          </label>

          <label class="field">
            <span>Cargo (KG)</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="5010"
              value={activeRow.cargoWt}
              onInput={(e) =>
                onUpdateRow(activeIndex, {
                  cargoWt: (e.target as HTMLInputElement).value,
                })
              }
            />
          </label>

          <label class="field">
            <span>VGM (KG) *</span>
            <input
              type="text"
              inputMode="decimal"
              class={overCsc ? 'invalid' : ''}
              placeholder="8710"
              value={activeRow.vgmWt}
              onInput={(e) =>
                onUpdateRow(activeIndex, {
                  vgmWt: (e.target as HTMLInputElement).value,
                })
              }
            />
            {overCsc && <span class="warn-txt">Exceeds CSC Max</span>}
          </label>
        </div>

        <div class="grid-2">
          <label class="field">
            <span>Slip No.</span>
            <input
              type="text"
              placeholder="57884"
              value={activeRow.slipNo}
              onInput={(e) =>
                onUpdateRow(activeIndex, {
                  slipNo: (e.target as HTMLInputElement).value,
                })
              }
            />
          </label>

          <label class="field">
            <span>Weighing Date &amp; Time</span>
            <input
              type="datetime-local"
              value={toDatetimeLocal(activeRow.weighingDateTime)}
              onChange={(e) =>
                onUpdateRow(activeIndex, {
                  weighingDateTime: fromDatetimeLocal(
                    (e.target as HTMLInputElement).value,
                  ),
                })
              }
            />
          </label>
        </div>
      </div>
    </>
  );
}
