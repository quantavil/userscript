import type {
  AuthPersonDefaults,
  CustomerRecord,
  VgmBatch,
  VgmContainerRow,
  WeighbridgeRecord,
} from '../types';
import { SAMPLE_CUSTOMER, SAMPLE_WEIGHBRIDGE, STORAGE_KEYS } from './constants';
import { formatOdexTimestamp } from './validators';

/**
 * Loads saved customers. Seeds the deletable dummy customer ONLY on first run,
 * so deleting all customers stays empty instead of resurrecting sample data.
 */
export function loadCustomers(): CustomerRecord[] {
  try {
    const initialized = localStorage.getItem(STORAGE_KEYS.customersInit);
    const raw = localStorage.getItem(STORAGE_KEYS.customers);
    if (!initialized && !raw) {
      const initial = [SAMPLE_CUSTOMER];
      localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(initial));
      localStorage.setItem(STORAGE_KEYS.customersInit, '1');
      return initial;
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomerRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomers(list: CustomerRecord[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(list));
    localStorage.setItem(STORAGE_KEYS.customersInit, '1');
    return true;
  } catch {
    return false;
  }
}

export function loadWeighbridges(): WeighbridgeRecord[] {
  try {
    const initialized = localStorage.getItem(STORAGE_KEYS.weighbridgesInit);
    const raw = localStorage.getItem(STORAGE_KEYS.weighbridges);
    if (!initialized && !raw) {
      const initial = [SAMPLE_WEIGHBRIDGE];
      localStorage.setItem(STORAGE_KEYS.weighbridges, JSON.stringify(initial));
      localStorage.setItem(STORAGE_KEYS.weighbridgesInit, '1');
      return initial;
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WeighbridgeRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveWeighbridges(list: WeighbridgeRecord[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.weighbridges, JSON.stringify(list));
    localStorage.setItem(STORAGE_KEYS.weighbridgesInit, '1');
    return true;
  } catch {
    return false;
  }
}

/** Reads ODeX's pre-filled Authorized Person fields as sensible fallback defaults. */
export function readDomAuthPerson(): AuthPersonDefaults {
  const val = (id: string): string =>
    (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? '';
  return {
    name: val('requestedBy'),
    designation: val('designation'),
    mobile: val('mobNo'),
  };
}

export function loadAuthDefaults(): AuthPersonDefaults {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.authDefaults);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AuthPersonDefaults>;
      const dom = readDomAuthPerson();
      return {
        name: parsed.name ?? dom.name,
        designation: parsed.designation ?? dom.designation,
        mobile: parsed.mobile ?? dom.mobile,
      };
    }
  } catch {
    // fallback to DOM
  }
  return readDomAuthPerson();
}

export function saveAuthDefaults(defaults: AuthPersonDefaults): void {
  try {
    localStorage.setItem(STORAGE_KEYS.authDefaults, JSON.stringify(defaults));
  } catch {
    // ignore quota errors
  }
}

export function createEmptyRow(seed?: Partial<VgmContainerRow>): VgmContainerRow {
  return {
    id: crypto.randomUUID(),
    bookingNo: seed?.bookingNo ?? '',
    containerNo: '',
    sizeCode: seed?.sizeCode ?? '1X40',
    typeCode: seed?.typeCode ?? 'HC',
    cscMaxWt: seed?.cscMaxWt ?? '32500',
    tareWt: '',
    cargoWt: '',
    vgmWt: '',
    weighingDateTime: formatOdexTimestamp(),
    slipNo: '',
    fillStatus: 'pending',
  };
}

export function createDefaultBatch(
  customers: CustomerRecord[],
  weighbridges: WeighbridgeRecord[],
  authDefaults: AuthPersonDefaults,
): VgmBatch {
  return {
    shippingLineId: '',
    shippingLineName: '',
    shipperType: 'O',
    customerId: customers[0]?.id ?? '',
    weighbridgeId: weighbridges[0]?.id ?? '',
    cargoType: 'GEN',
    imoNo: '',
    unNo: '',
    method: 'M1',
    authName: authDefaults.name,
    authDesignation: authDefaults.designation,
    authMobile: authDefaults.mobile,
    rows: [createEmptyRow()],
    activeIndex: 0,
  };
}

export function loadSessionBatch(): VgmBatch | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.sessionBatch);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VgmBatch;
    if (!parsed || !Array.isArray(parsed.rows) || parsed.rows.length === 0) {
      return null;
    }
    return {
      ...parsed,
      rows: parsed.rows.map((r) => ({
        ...r,
        fillStatus: r.fillStatus === 'filled' ? 'filled' : 'pending',
      })),
    };
  } catch {
    return null;
  }
}

export function saveSessionBatch(batch: VgmBatch): void {
  try {
    sessionStorage.setItem(STORAGE_KEYS.sessionBatch, JSON.stringify(batch));
  } catch {
    // ignore storage quota errors
  }
}


/** Downscales uploaded logo/seal images to keep localStorage fast and compact. */
export async function compressImageFile(file: File, maxWidth = 360): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('2D canvas unavailable');
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL('image/png');
}
