import { useState } from 'preact/hooks';
import { splitAddressLines } from '../core/validators';
import type {
  AuthPersonDefaults,
  CustomerRecord,
  MastersBackupPayload,
  StatusNotice,
  WeighbridgeRecord,
} from '../types';
import { Icons } from './icons';

interface WeighbridgesViewProps {
  weighbridges: WeighbridgeRecord[];
  selectedWeighbridgeId: string;
  customers: CustomerRecord[];
  authDefaults: AuthPersonDefaults;
  onSaveWeighbridges: (next: WeighbridgeRecord[]) => boolean;
  onSelectWeighbridge: (id: string, switchToVgm?: boolean) => void;
  onSaveAuthDefaults: (next: AuthPersonDefaults) => void;
  onImportAll: (payload: MastersBackupPayload) => void;
  onNotice: (notice: StatusNotice) => void;
}

type DraftWb = Omit<WeighbridgeRecord, 'id' | 'isSample'>;

const EMPTY_WB: DraftWb = { regNo: '', name: '', address: '' };

export function WeighbridgesView({
  weighbridges,
  selectedWeighbridgeId,
  customers,
  authDefaults,
  onSaveWeighbridges,
  onSelectWeighbridge,
  onSaveAuthDefaults,
  onImportAll,
  onNotice,
}: WeighbridgesViewProps) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<DraftWb>(EMPTY_WB);
  const [formError, setFormError] = useState<string | null>(null);

  const startCreate = () => {
    setFormError(null);
    setDraft(EMPTY_WB);
    setEditingId('new');
  };

  const startEdit = (wb: WeighbridgeRecord) => {
    setFormError(null);
    setDraft({ regNo: wb.regNo, name: wb.name, address: wb.address });
    setEditingId(wb.id);
  };

  const handleSave = () => {
    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      setFormError('Weighbridge Name is required.');
      return;
    }

    const record: WeighbridgeRecord = {
      id: editingId === 'new' || !editingId ? `wb-${crypto.randomUUID()}` : editingId,
      regNo: draft.regNo.trim(),
      name: trimmedName,
      address: draft.address.trim(),
      isSample: false,
    };

    const next =
      editingId === 'new'
        ? [...weighbridges, record]
        : weighbridges.map((w) => (w.id === editingId ? record : w));

    onSaveWeighbridges(next);
    if (editingId === 'new' || !selectedWeighbridgeId) {
      onSelectWeighbridge(record.id, false);
    }
    setEditingId(null);
    setFormError(null);
    onNotice({ type: 'ok', text: `Saved "${record.name}".` });
  };

  const handleDelete = (wb: WeighbridgeRecord) => {
    const next = weighbridges.filter((w) => w.id !== wb.id);
    onSaveWeighbridges(next);
    if (selectedWeighbridgeId === wb.id) {
      onSelectWeighbridge(next[0]?.id ?? '', false);
    }
    if (editingId === wb.id) setEditingId(null);
    onNotice({ type: 'info', text: `Deleted "${wb.name}".` });
  };

  const handleExportJson = () => {
    const payload: MastersBackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      customers,
      weighbridges,
      authDefaults,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'better-odex-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    onNotice({ type: 'ok', text: 'Backup exported.' });
  };

  const handleImportJson = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Partial<MastersBackupPayload>;
      if (!Array.isArray(parsed.customers) && !Array.isArray(parsed.weighbridges)) {
        onNotice({ type: 'err', text: 'Invalid JSON file.' });
        return;
      }
      onImportAll({
        version: parsed.version ?? 1,
        exportedAt: parsed.exportedAt ?? new Date().toISOString(),
        customers: Array.isArray(parsed.customers) ? parsed.customers : customers,
        weighbridges: Array.isArray(parsed.weighbridges) ? parsed.weighbridges : weighbridges,
        authDefaults: parsed.authDefaults,
      });
    } catch {
      onNotice({ type: 'err', text: 'Invalid JSON file.' });
    } finally {
      input.value = '';
    }
  };

  const [ln1, ln2, ln3] = splitAddressLines(draft.address, 35);

  return (
    <>
      <div class="section-head">
        <div class="section-title">Weighbridges</div>
        {editingId === null && (
          <button type="button" class="mini-btn primary" onClick={startCreate}>
            <Icons.Plus />
            <span>Add Weighbridge</span>
          </button>
        )}
      </div>

      {editingId !== null && (
        <div class="section-card">
          <div class="section-head">
            <span class="section-title">
              {editingId === 'new' ? 'New Weighbridge' : 'Edit Weighbridge'}
            </span>
            <button type="button" class="link-btn" onClick={() => setEditingId(null)}>
              Cancel
            </button>
          </div>

          {formError && <div class="notice err">{formError}</div>}

          <div class="grid-2">
            <label class="field">
              <span>Reg. No.</span>
              <input
                type="text"
                placeholder="WB-IND-0001"
                value={draft.regNo}
                onInput={(e) => setDraft((p) => ({ ...p, regNo: (e.target as HTMLInputElement).value }))}
              />
            </label>

            <label class="field">
              <span>Name *</span>
              <input
                type="text"
                placeholder="PORT WEIGHBRIDGE"
                value={draft.name}
                onInput={(e) => setDraft((p) => ({ ...p, name: (e.target as HTMLInputElement).value }))}
              />
            </label>
          </div>

          <label class="field">
            <span>Address</span>
            <input
              type="text"
              placeholder="Plot, Sector, Industrial Area, City"
              value={draft.address}
              onInput={(e) =>
                setDraft((p) => ({ ...p, address: (e.target as HTMLInputElement).value }))
              }
            />
            <span class="preview-line">
              L1: {ln1 || '—'} | L2: {ln2 || '—'} | L3: {ln3 || '—'}
            </span>
          </label>

          <div class="btn-row">
            <button type="button" class="mini-btn primary" onClick={handleSave}>
              <Icons.Check />
              <span>{editingId === 'new' ? 'Save' : 'Update'}</span>
            </button>
            <button type="button" class="mini-btn" onClick={() => setEditingId(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {weighbridges.length === 0 ? (
        <div class="empty-state">
          <div class="empty-title">No weighbridges saved</div>
          <button type="button" class="mini-btn primary" onClick={startCreate}>
            <Icons.Plus />
            <span>Add Weighbridge</span>
          </button>
        </div>
      ) : (
        <div class="dir-list">
          {weighbridges.map((wb) => {
            const isActive = wb.id === selectedWeighbridgeId;
            return (
              <div key={wb.id} class={`dir-card ${isActive ? 'selected' : ''}`}>
                <div class="dir-card-main">
                  <div class="dir-card-title">
                    <span>{wb.name}</span>
                    {wb.isSample && <span class="badge sample">Sample</span>}
                    {isActive && <span class="badge filled">Active</span>}
                  </div>
                  <div class="dir-card-meta">
                    Reg: <strong>{wb.regNo || '—'}</strong>
                    {wb.address ? ` • ${wb.address}` : ''}
                  </div>
                </div>
                <div class="dir-card-actions">
                  {!isActive && (
                    <button
                      type="button"
                      class="mini-btn primary"
                      onClick={() => onSelectWeighbridge(wb.id, true)}
                    >
                      Use
                    </button>
                  )}
                  <button
                    type="button"
                    class="mini-btn icon-only"
                    title="Edit"
                    onClick={() => startEdit(wb)}
                  >
                    <Icons.Edit />
                  </button>
                  <button
                    type="button"
                    class="mini-btn danger icon-only"
                    title="Delete"
                    onClick={() => handleDelete(wb)}
                  >
                    <Icons.Trash />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div class="section-card">
        <div class="section-title">Authorized Person (CHA)</div>
        <div class="grid-3">
          <label class="field">
            <span>Name</span>
            <input
              type="text"
              placeholder="Auto"
              value={authDefaults.name}
              onInput={(e) =>
                onSaveAuthDefaults({
                  ...authDefaults,
                  name: (e.target as HTMLInputElement).value,
                })
              }
            />
          </label>
          <label class="field">
            <span>Designation</span>
            <input
              type="text"
              placeholder="CHA"
              value={authDefaults.designation}
              onInput={(e) =>
                onSaveAuthDefaults({
                  ...authDefaults,
                  designation: (e.target as HTMLInputElement).value,
                })
              }
            />
          </label>
          <label class="field">
            <span>Mobile No.</span>
            <input
              type="text"
              placeholder="10 digits"
              maxLength={10}
              value={authDefaults.mobile}
              onInput={(e) =>
                onSaveAuthDefaults({
                  ...authDefaults,
                  mobile: (e.target as HTMLInputElement).value,
                })
              }
            />
          </label>
        </div>
      </div>

      <div class="section-card">
        <div class="section-head">
          <div class="section-title">Backup &amp; Restore</div>
          <div class="btn-row">
            <button type="button" class="mini-btn" onClick={handleExportJson}>
              <Icons.Download />
              <span>Export JSON</span>
            </button>
            <label class="mini-btn" style="cursor:pointer;">
              <Icons.Upload />
              <span>Import JSON</span>
              <input
                type="file"
                accept="application/json"
                style="display:none;"
                onChange={handleImportJson}
              />
            </label>
          </div>
        </div>
      </div>
    </>
  );
}
