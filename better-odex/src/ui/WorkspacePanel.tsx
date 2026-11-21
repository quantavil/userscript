import { useEffect, useMemo, useState } from 'preact/hooks';
import { fillOdexNewVgm, getOdexShippingLines } from '../core/odexAutofill';
import {
  createDefaultBatch,
  loadAuthDefaults,
  loadCustomers,
  loadSessionBatch,
  loadWeighbridges,
  saveAuthDefaults,
  saveCustomers,
  saveSessionBatch,
  saveWeighbridges,
} from '../core/storage';
import { validateRowForSubmission } from '../core/validators';
import { renderElementToPdf } from '../pdf/pdfEngine';
import { buildMultiVgmElement, buildSingleVgmElement } from '../pdf/templates';
import type {
  AuthPersonDefaults,
  CustomerRecord,
  MastersBackupPayload,
  StatusNotice,
  VgmBatch,
  VgmContainerRow,
  WeighbridgeRecord,
  WorkspaceTab,
} from '../types';
import { CustomersView } from './CustomersView';
import { Icons } from './icons';
import { VgmEntryView } from './VgmEntryView';
import { WeighbridgesView } from './WeighbridgesView';

interface WorkspacePanelProps {
  onClose: () => void;
}

export function WorkspacePanel({ onClose }: WorkspacePanelProps) {
  const shippingLines = useMemo(() => getOdexShippingLines(), []);

  const [tab, setTab] = useState<WorkspaceTab>('vgm');
  const [customers, setCustomers] = useState<CustomerRecord[]>(() => loadCustomers());
  const [weighbridges, setWeighbridges] = useState<WeighbridgeRecord[]>(() =>
    loadWeighbridges(),
  );
  const [authDefaults, setAuthDefaults] = useState<AuthPersonDefaults>(() =>
    loadAuthDefaults(),
  );
  const [batch, setBatch] = useState<VgmBatch>(() => {
    const saved = loadSessionBatch();
    if (saved) return saved;
    return createDefaultBatch(loadCustomers(), loadWeighbridges(), loadAuthDefaults());
  });
  const [expanded, setExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem('better_odex_panel_expanded') === '1';
    } catch {
      return false;
    }
  });
  const [downloadOnFill, setDownloadOnFill] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<StatusNotice | null>(null);

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('better_odex_panel_expanded', next ? '1' : '0');
      } catch {
        // ignore localStorage errors
      }
      return next;
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const activeCustomer =
    customers.find((c) => c.id === batch.customerId) ?? customers[0] ?? null;
  const activeWeighbridge =
    weighbridges.find((w) => w.id === batch.weighbridgeId) ?? weighbridges[0] ?? null;
  const activeIndex = Math.min(batch.activeIndex, Math.max(0, batch.rows.length - 1));
  const activeRow = batch.rows[activeIndex] ?? batch.rows[0];
  const isMulti = batch.rows.length > 1;

  const updateBatch = (updater: (prev: VgmBatch) => VgmBatch) => {
    setBatch((prev) => {
      const next = updater(prev);
      saveSessionBatch(next);
      return next;
    });
  };

  const updateRow = (index: number, patch: Partial<VgmContainerRow>) => {
    updateBatch((prev) => {
      const rows = prev.rows.map((r, i) => {
        if (i !== index) return r;
        const updated: VgmContainerRow = { ...r, ...patch };
        if ('tareWt' in patch || 'cargoWt' in patch) {
          const t = Number(updated.tareWt) || 0;
          const c = Number(updated.cargoWt) || 0;
          if (t > 0 || c > 0) {
            updated.vgmWt = String(Number((t + c).toFixed(2)));
          }
        }
        return updated;
      });
      return { ...prev, rows };
    });
  };

  const handleSaveCustomers = (next: CustomerRecord[]): boolean => {
    const ok = saveCustomers(next);
    if (ok) setCustomers(next);
    return ok;
  };

  const handleSaveWeighbridges = (next: WeighbridgeRecord[]): boolean => {
    const ok = saveWeighbridges(next);
    if (ok) setWeighbridges(next);
    return ok;
  };

  const handleSaveAuth = (next: AuthPersonDefaults) => {
    setAuthDefaults(next);
    saveAuthDefaults(next);
    updateBatch((p) => ({
      ...p,
      authName: next.name,
      authDesignation: next.designation,
      authMobile: next.mobile,
    }));
  };

  const handleImportAll = (payload: MastersBackupPayload) => {
    handleSaveCustomers(payload.customers);
    handleSaveWeighbridges(payload.weighbridges);
    if (payload.authDefaults) handleSaveAuth(payload.authDefaults);
    updateBatch((p) => ({
      ...p,
      customerId: payload.customers[0]?.id ?? '',
      weighbridgeId: payload.weighbridges[0]?.id ?? '',
    }));
    setNotice({ type: 'ok', text: 'Backup imported.' });
  };

  const handleExportPdf = async (forceSingle = false) => {
    const isMultiDoc = isMulti && !forceSingle;
    if (!isMultiDoc) {
      const err = validateRowForSubmission(activeRow);
      if (err) {
        setNotice({ type: 'err', text: err });
        return;
      }
    }

    setBusy(true);
    setNotice({ type: 'info', text: 'Generating PDF…' });

    const el = isMultiDoc
      ? buildMultiVgmElement(batch, activeCustomer, activeWeighbridge)
      : buildSingleVgmElement(batch, activeRow, activeCustomer, activeWeighbridge);

    try {
      const refName = isMultiDoc
        ? batch.rows[0]?.bookingNo.trim() || 'BATCH'
        : activeRow.containerNo.trim();
      const filename = isMultiDoc
        ? `VGM_Multi_${refName.toUpperCase()}.pdf`
        : `VGM_Declaration_${refName.toUpperCase()}.pdf`;

      const pdf = await renderElementToPdf({
        element: el,
        filename,
        orientation: isMultiDoc ? 'landscape' : 'portrait',
        widthPx: isMultiDoc ? 1040 : 794,
      });
      pdf.save();
      setNotice({ type: 'ok', text: `Downloaded ${filename}.` });
    } catch {
      setNotice({ type: 'err', text: 'PDF export failed.' });
    } finally {
      el.remove();
      setBusy(false);
    }
  };

  const handleFillOdex = async () => {
    const err = validateRowForSubmission(activeRow);
    if (err) {
      setNotice({ type: 'err', text: err });
      return;
    }

    setBusy(true);
    setNotice({ type: 'info', text: `Filling ${activeRow.containerNo}…` });

    const el = isMulti
      ? buildMultiVgmElement(batch, activeCustomer, activeWeighbridge)
      : buildSingleVgmElement(batch, activeRow, activeCustomer, activeWeighbridge);

    try {
      const filename = isMulti
        ? `VGM_Multi_${(activeRow.bookingNo || 'BATCH').toUpperCase()}.pdf`
        : `VGM_Declaration_${activeRow.containerNo.toUpperCase()}.pdf`;

      const pdf = await renderElementToPdf({
        element: el,
        filename,
        orientation: isMulti ? 'landscape' : 'portrait',
        widthPx: isMulti ? 1040 : 794,
      });

      if (downloadOnFill) pdf.save();

      const { attached, wbLocked } = await fillOdexNewVgm(
        batch,
        activeRow,
        activeCustomer,
        activeWeighbridge,
        pdf.file,
      );

      updateRow(activeIndex, { fillStatus: 'filled' });

      const notes: string[] = [`Filled ${activeRow.containerNo}`];
      notes.push(attached ? 'PDF attached' : 'attach PDF manually');
      if (wbLocked) notes.push('weighbridge locked by liner');
      setNotice({ type: 'ok', text: `${notes.join(' • ')}.` });
    } catch {
      setNotice({ type: 'err', text: 'Failed to fill ODeX form.' });
    } finally {
      el.remove();
      setBusy(false);
    }
  };

  return (
    <aside
      class={`panel-shell ${expanded ? 'expanded' : ''}`}
      aria-label="Better ODeX"
    >
      <header class="panel-header">
        <div class="brand-wrap">
          <span class="brand-icon">
            <Icons.Fab size={18} />
          </span>
          <span class="brand-title">Better ODeX</span>
        </div>
        <div class="header-actions">
          <button
            type="button"
            class="header-btn"
            onClick={toggleExpanded}
            aria-label={expanded ? 'Compact width' : 'Expand width'}
            title={expanded ? 'Compact width' : 'Expand width'}
          >
            {expanded ? <Icons.Shrink size={15} /> : <Icons.Expand size={15} />}
          </button>
          <button
            type="button"
            class="header-btn close-btn"
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
          >
            <Icons.Close size={15} />
          </button>
        </div>
      </header>

      <nav class="tab-bar" aria-label="Workspace Sections">
        <button
          type="button"
          class={`tab-btn ${tab === 'vgm' ? 'active' : ''}`}
          onClick={() => {
            setTab('vgm');
            setNotice(null);
          }}
          role="tab"
          aria-selected={tab === 'vgm'}
        >
          <Icons.File />
          <span>eVGM</span>
          <span class="tab-count">{batch.rows.length}</span>
        </button>
        <button
          type="button"
          class={`tab-btn ${tab === 'customers' ? 'active' : ''}`}
          onClick={() => {
            setTab('customers');
            setNotice(null);
          }}
          role="tab"
          aria-selected={tab === 'customers'}
        >
          <Icons.Users />
          <span>Customers</span>
          <span class="tab-count">{customers.length}</span>
        </button>
        <button
          type="button"
          class={`tab-btn ${tab === 'weighbridges' ? 'active' : ''}`}
          onClick={() => {
            setTab('weighbridges');
            setNotice(null);
          }}
          role="tab"
          aria-selected={tab === 'weighbridges'}
        >
          <Icons.Scale />
          <span>Weighbridges</span>
          <span class="tab-count">{weighbridges.length}</span>
        </button>
      </nav>

      <main class="panel-body">
        {notice && <div class={`notice ${notice.type}`}>{notice.text}</div>}

        {tab === 'vgm' && (
          <VgmEntryView
            batch={batch}
            shippingLines={shippingLines}
            customers={customers}
            weighbridges={weighbridges}
            onUpdateBatch={updateBatch}
            onUpdateRow={updateRow}
            onSwitchTab={(t) => {
              setTab(t);
              setNotice(null);
            }}
          />
        )}

        {tab === 'customers' && (
          <CustomersView
            customers={customers}
            selectedCustomerId={batch.customerId}
            onSaveList={handleSaveCustomers}
            onSelectCustomer={(id, switchToVgm) => {
              updateBatch((p) => ({ ...p, customerId: id }));
              if (switchToVgm) setTab('vgm');
            }}
            onNotice={setNotice}
          />
        )}

        {tab === 'weighbridges' && (
          <WeighbridgesView
            weighbridges={weighbridges}
            selectedWeighbridgeId={batch.weighbridgeId}
            customers={customers}
            authDefaults={authDefaults}
            onSaveWeighbridges={handleSaveWeighbridges}
            onSelectWeighbridge={(id, switchToVgm) => {
              updateBatch((p) => ({ ...p, weighbridgeId: id }));
              if (switchToVgm) setTab('vgm');
            }}
            onSaveAuthDefaults={handleSaveAuth}
            onImportAll={handleImportAll}
            onNotice={setNotice}
          />
        )}
      </main>

      {tab === 'vgm' && (
        <footer class="panel-footer">
          <div class="footer-grid">
            <button
              type="button"
              class="btn-pdf"
              disabled={busy}
              onClick={() => handleExportPdf(false)}
            >
              <Icons.Download />
              <span>{busy ? 'Working…' : isMulti ? 'Export Multi PDF' : 'Export PDF'}</span>
            </button>

            <button
              type="button"
              class="btn-fill"
              disabled={busy}
              onClick={handleFillOdex}
            >
              <Icons.Fill />
              <span>
                {busy
                  ? 'Working…'
                  : isMulti
                    ? `Fill #${activeIndex + 1} + Attach`
                    : 'Fill ODeX + Attach'}
              </span>
            </button>
          </div>

          <div class="footer-sub-row">
            <label class="check-inline">
              <input
                type="checkbox"
                checked={downloadOnFill}
                onChange={(e) =>
                  setDownloadOnFill((e.target as HTMLInputElement).checked)
                }
              />
              <span>Download PDF on Fill</span>
            </label>

            {isMulti && (
              <button
                type="button"
                class="link-btn"
                disabled={busy}
                onClick={() => handleExportPdf(true)}
              >
                <Icons.Download />
                <span>Row #{activeIndex + 1} Single PDF</span>
              </button>
            )}
          </div>
        </footer>
      )}
    </aside>
  );
}
