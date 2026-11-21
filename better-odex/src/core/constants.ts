import type {
  CargoTypeCode,
  ContainerSizeCode,
  ContainerTypeCode,
  CustomerRecord,
  ShipperRegType,
  WeighbridgeRecord,
} from '../types';

export const APP_HOST_ID = 'better-odex-host';
export const PAGE_STYLE_ID = 'better-odex-page-style';

export const STORAGE_KEYS = {
  customers: 'better_odex_customers_v1',
  customersInit: 'better_odex_customers_init_v1',
  weighbridges: 'better_odex_weighbridges_v1',
  weighbridgesInit: 'better_odex_weighbridges_init_v1',
  authDefaults: 'better_odex_auth_defaults_v1',
  sessionBatch: 'better_odex_active_batch_v1',
} as const;

export const EXCLUDE_FROM_PDF_SELECTOR = [
  '.helpPanel',
  '#svcDashboardAdSwiper',
  '.DTTT_container',
  '.dt-buttons',
  '.dataTables_filter',
  '.dataTables_length',
  '.dataTables_paginate',
  '#vgmSerachTable thead tr.border0',
  `#${APP_HOST_ID}`,
].join(', ');

export const SHIPPER_REG_TYPES: ReadonlyArray<{ value: ShipperRegType; label: string }> = [
  { value: 'IEC No', label: 'IEC No.' },
  { value: 'CIN No', label: 'CIN No.' },
  { value: 'PAN No', label: 'PAN No.' },
  { value: 'Aadhaar No', label: 'Aadhaar No.' },
  { value: 'Passport No', label: 'Passport No.' },
];

export const SIZE_LABELS: Record<ContainerSizeCode, string> = {
  '1X20': "20' (TEU)",
  '1X40': "40' (FEU)",
  '1X45': "45'",
  '1X53': "53'",
};

export const SIZE_SHORT: Record<ContainerSizeCode, string> = {
  '1X20': "20'",
  '1X40': "40'",
  '1X45': "45'",
  '1X53': "53'",
};

export const TYPE_LABELS: Record<ContainerTypeCode, string> = {
  GPC: 'General Purpose',
  HC: 'High Cube',
  RC: 'Reefer',
  OTP: 'Open Top',
  FRC: 'Flat Rack',
  TC: 'Tank',
};

export const TYPE_SHORT: Record<ContainerTypeCode, string> = {
  GPC: 'GP',
  HC: 'HC',
  RC: 'RF',
  OTP: 'OT',
  FRC: 'FR',
  TC: 'TK',
};

export const CARGO_LABELS: Record<CargoTypeCode, string> = {
  GEN: 'Normal (GEN)',
  HAZ: 'Hazardous (HAZ)',
  ODC: 'Over-Dimensional (ODC)',
  ONION: 'Onion (ONION)',
  REF: 'Reefer (REF)',
};

export const CARGO_PDF_LABELS: Record<CargoTypeCode, string> = {
  GEN: 'Normal',
  HAZ: 'Hazardous',
  ODC: 'Others (ODC)',
  ONION: 'Others (Onion)',
  REF: 'Reefer',
};

export const IMO_CLASSES: ReadonlyArray<{ value: string; label: string }> = [
  { value: '1.1', label: '1.1 — Explosives (Mass Explosion)' },
  { value: '1.2', label: '1.2 — Explosives (Projection)' },
  { value: '1.3', label: '1.3 — Explosives (Fire)' },
  { value: '1.4', label: '1.4 — Explosives (Minor)' },
  { value: '1.5', label: '1.5 — Explosives (Very Insensitive)' },
  { value: '2.1', label: '2.1 — Flammable Gases' },
  { value: '2.2', label: '2.2 — Non-Flammable Gases' },
  { value: '2.3', label: '2.3 — Toxic Gases' },
  { value: '3', label: '3 — Flammable Liquids' },
  { value: '4.1', label: '4.1 — Flammable Solids' },
  { value: '4.2', label: '4.2 — Spontaneously Combustible' },
  { value: '4.3', label: '4.3 — Dangerous When Wet' },
  { value: '5.1', label: '5.1 — Oxidizing Substances' },
  { value: '5.2', label: '5.2 — Organic Peroxides' },
  { value: '6.1', label: '6.1 — Toxic Substances' },
  { value: '6.2', label: '6.2 — Infectious Substances' },
  { value: '7', label: '7 — Radioactive Material' },
  { value: '8', label: '8 — Corrosives' },
  { value: '9', label: '9 — Miscellaneous Dangerous Goods' },
];

/**
 * Seeded once on first launch so the user sees how a customer record looks.
 * Can be freely edited or permanently deleted.
 */
export const SAMPLE_CUSTOMER: CustomerRecord = {
  id: 'sample-customer-acme',
  name: 'ACME EXPORTS PRIVATE LIMITED',
  regType: 'IEC No',
  regNo: '0123456789',
  authorizedOfficial: 'RAHUL SHARMA - EXPORT MANAGER',
  contactNo: '9800000000',
  footerText:
    'Acme Exports Private Limited | CIN: U00000MH2020PTC000000\nFactory: Plot No. 12, Industrial Area Phase-I, Sample City - 400001, India',
  isSample: true,
};

/**
 * Seeded once on first launch; freely editable or deletable.
 */
export const SAMPLE_WEIGHBRIDGE: WeighbridgeRecord = {
  id: 'sample-wb-port',
  regNo: 'WB-IND-0001',
  name: 'SAMPLE PORT WEIGHBRIDGE',
  address: 'PLOT 14, SECTOR-2, INDUSTRIAL AREA, NEAR PORT GATE, SAMPLE CITY',
  isSample: true,
};
