import { useMemo, useState } from 'preact/hooks';
import { SHIPPER_REG_TYPES } from '../core/constants';
import { compressImageFile } from '../core/storage';
import { findDuplicateCustomer } from '../core/validators';
import type { CustomerRecord, ShipperRegType, StatusNotice } from '../types';
import { Icons } from './icons';

interface CustomersViewProps {
  customers: CustomerRecord[];
  selectedCustomerId: string;
  onSaveList: (next: CustomerRecord[]) => boolean;
  onSelectCustomer: (id: string, switchToVgm?: boolean) => void;
  onNotice: (notice: StatusNotice) => void;
}

type DraftCustomer = Omit<CustomerRecord, 'id' | 'isSample'>;

const EMPTY_DRAFT: DraftCustomer = {
  name: '',
  regType: 'IEC No',
  regNo: '',
  authorizedOfficial: '',
  contactNo: '',
  footerText: '',
  logoDataUrl: undefined,
  sealDataUrl: undefined,
};

export function CustomersView({
  customers,
  selectedCustomerId,
  onSaveList,
  onSelectCustomer,
  onNotice,
}: CustomersViewProps) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<DraftCustomer>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.regNo.toLowerCase().includes(q) ||
        c.authorizedOfficial.toLowerCase().includes(q),
    );
  }, [customers, search]);

  const startCreate = () => {
    setFormError(null);
    setDraft(EMPTY_DRAFT);
    setEditingId('new');
  };

  const startEdit = (customer: CustomerRecord) => {
    setFormError(null);
    setDraft({
      name: customer.name,
      regType: customer.regType,
      regNo: customer.regNo,
      authorizedOfficial: customer.authorizedOfficial,
      contactNo: customer.contactNo,
      footerText: customer.footerText,
      logoDataUrl: customer.logoDataUrl,
      sealDataUrl: customer.sealDataUrl,
    });
    setEditingId(customer.id);
  };

  const handleImageUpload = async (field: 'logoDataUrl' | 'sealDataUrl', e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file);
      setDraft((prev) => ({ ...prev, [field]: dataUrl }));
    } catch {
      setFormError('Could not read image.');
    } finally {
      input.value = '';
    }
  };

  const handleSave = () => {
    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      setFormError('Customer Name is required.');
      return;
    }

    const dup = findDuplicateCustomer(
      customers,
      { name: trimmedName, regNo: draft.regNo },
      editingId === 'new' ? undefined : editingId ?? undefined,
    );
    if (dup) {
      setFormError(
        dup.field === 'name'
          ? `"${dup.existing.name}" already exists.`
          : `Reg. No. "${dup.existing.regNo}" already belongs to "${dup.existing.name}".`,
      );
      return;
    }

    const cleanRecord: CustomerRecord = {
      id: editingId === 'new' || !editingId ? `cust-${crypto.randomUUID()}` : editingId,
      name: trimmedName,
      regType: draft.regType,
      regNo: draft.regNo.trim().toUpperCase(),
      authorizedOfficial: draft.authorizedOfficial.trim(),
      contactNo: draft.contactNo.trim(),
      footerText: draft.footerText.trim(),
      logoDataUrl: draft.logoDataUrl,
      sealDataUrl: draft.sealDataUrl,
      isSample: false,
    };

    const next =
      editingId === 'new'
        ? [...customers, cleanRecord]
        : customers.map((c) => (c.id === editingId ? cleanRecord : c));

    if (!onSaveList(next)) {
      setFormError('Storage full—remove unused images.');
      return;
    }

    if (editingId === 'new' || !selectedCustomerId) {
      onSelectCustomer(cleanRecord.id, false);
    }

    setEditingId(null);
    setFormError(null);
    onNotice({ type: 'ok', text: `Saved "${cleanRecord.name}".` });
  };

  const handleDelete = (customer: CustomerRecord) => {
    const next = customers.filter((c) => c.id !== customer.id);
    onSaveList(next);
    if (selectedCustomerId === customer.id) {
      onSelectCustomer(next[0]?.id ?? '', false);
    }
    if (editingId === customer.id) setEditingId(null);
    onNotice({ type: 'info', text: `Deleted "${customer.name}".` });
  };

  return (
    <>
      <div class="section-head">
        <div class="section-title">Customers</div>
        {editingId === null && (
          <button type="button" class="mini-btn primary" onClick={startCreate}>
            <Icons.Plus />
            <span>Add Customer</span>
          </button>
        )}
      </div>

      {editingId !== null && (
        <div class="section-card">
          <div class="section-head">
            <span class="section-title">
              {editingId === 'new' ? 'New Customer' : 'Edit Customer'}
            </span>
            <button type="button" class="link-btn" onClick={() => setEditingId(null)}>
              Cancel
            </button>
          </div>

          {formError && <div class="notice err">{formError}</div>}

          <div class="grid-2">
            <label class="field">
              <span>Customer Name *</span>
              <input
                type="text"
                placeholder="ACME EXPORTS PVT LTD"
                value={draft.name}
                onInput={(e) => setDraft((p) => ({ ...p, name: (e.target as HTMLInputElement).value }))}
              />
            </label>

            <label class="field">
              <span>Registration No.</span>
              <div class="inline-pair">
                <select
                  value={draft.regType}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      regType: (e.target as HTMLSelectElement).value as ShipperRegType,
                    }))
                  }
                >
                  {SHIPPER_REG_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="0123456789"
                  value={draft.regNo}
                  onInput={(e) =>
                    setDraft((p) => ({
                      ...p,
                      regNo: (e.target as HTMLInputElement).value.toUpperCase(),
                    }))
                  }
                />
              </div>
            </label>
          </div>

          <div class="grid-2">
            <label class="field">
              <span>Authorized Official</span>
              <input
                type="text"
                placeholder="NAME - DESIGNATION"
                value={draft.authorizedOfficial}
                onInput={(e) =>
                  setDraft((p) => ({
                    ...p,
                    authorizedOfficial: (e.target as HTMLInputElement).value,
                  }))
                }
              />
            </label>

            <label class="field">
              <span>24 × 7 Phone</span>
              <input
                type="text"
                placeholder="9800000000"
                value={draft.contactNo}
                onInput={(e) =>
                  setDraft((p) => ({ ...p, contactNo: (e.target as HTMLInputElement).value }))
                }
              />
            </label>
          </div>

          <label class="field">
            <span>PDF Footer</span>
            <textarea
              rows={2}
              placeholder="CIN & Factory / Office Address"
              value={draft.footerText}
              onInput={(e) =>
                setDraft((p) => ({ ...p, footerText: (e.target as HTMLTextAreaElement).value }))
              }
            />
          </label>

          <div class="grid-2">
            <label class="field">
              <span>Logo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload('logoDataUrl', e)}
              />
              {draft.logoDataUrl && (
                <div class="thumb-row">
                  <img src={draft.logoDataUrl} class="thumb" alt="Logo" />
                  <button
                    type="button"
                    class="mini-btn danger icon-only"
                    title="Remove"
                    onClick={() => setDraft((p) => ({ ...p, logoDataUrl: undefined }))}
                  >
                    <Icons.Trash />
                  </button>
                </div>
              )}
            </label>

            <label class="field">
              <span>Seal &amp; Signature</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload('sealDataUrl', e)}
              />
              {draft.sealDataUrl && (
                <div class="thumb-row">
                  <img src={draft.sealDataUrl} class="thumb" alt="Seal" />
                  <button
                    type="button"
                    class="mini-btn danger icon-only"
                    title="Remove"
                    onClick={() => setDraft((p) => ({ ...p, sealDataUrl: undefined }))}
                  >
                    <Icons.Trash />
                  </button>
                </div>
              )}
            </label>
          </div>

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

      {customers.length > 0 && (
        <label class="field">
          <input
            type="text"
            placeholder="Search customers…"
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          />
        </label>
      )}

      {customers.length === 0 ? (
        <div class="empty-state">
          <div class="empty-title">No customers saved</div>
          <button type="button" class="mini-btn primary" onClick={startCreate}>
            <Icons.Plus />
            <span>Add Customer</span>
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div class="empty-state">
          <div class="empty-title">No matches</div>
        </div>
      ) : (
        <div class="dir-list">
          {filtered.map((c) => {
            const isActive = c.id === selectedCustomerId;
            return (
              <div key={c.id} class={`dir-card ${isActive ? 'selected' : ''}`}>
                <div class="dir-card-main">
                  <div class="dir-card-title">
                    <span>{c.name}</span>
                    {c.isSample && <span class="badge sample">Sample</span>}
                    {isActive && <span class="badge filled">Active</span>}
                  </div>
                  <div class="dir-card-meta">
                    {c.regType}: <strong>{c.regNo || '—'}</strong>
                    {c.authorizedOfficial ? ` • ${c.authorizedOfficial}` : ''}
                    {c.contactNo ? ` • ${c.contactNo}` : ''}
                  </div>
                  {(c.logoDataUrl || c.sealDataUrl) && (
                    <div class="dir-card-tags">
                      {c.logoDataUrl && <span class="badge neutral">Logo</span>}
                      {c.sealDataUrl && <span class="badge neutral">Seal</span>}
                    </div>
                  )}
                </div>
                <div class="dir-card-actions">
                  {!isActive && (
                    <button
                      type="button"
                      class="mini-btn primary"
                      onClick={() => onSelectCustomer(c.id, true)}
                    >
                      Use
                    </button>
                  )}
                  <button
                    type="button"
                    class="mini-btn icon-only"
                    title="Edit"
                    onClick={() => startEdit(c)}
                  >
                    <Icons.Edit />
                  </button>
                  <button
                    type="button"
                    class="mini-btn danger icon-only"
                    title="Delete"
                    onClick={() => handleDelete(c)}
                  >
                    <Icons.Trash />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
