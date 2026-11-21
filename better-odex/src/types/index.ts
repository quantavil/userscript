export type WorkspaceTab = 'vgm' | 'customers' | 'weighbridges';

export type ShipperRegType =
  | 'IEC No'
  | 'CIN No'
  | 'PAN No'
  | 'Aadhaar No'
  | 'Passport No';

export type ContainerSizeCode = '1X20' | '1X40' | '1X45' | '1X53';
export type ContainerTypeCode = 'GPC' | 'HC' | 'RC' | 'OTP' | 'FRC' | 'TC';
export type CargoTypeCode = 'GEN' | 'HAZ' | 'ODC' | 'ONION' | 'REF';
export type VgmMethodCode = 'M1' | 'M2';
export type ShipperTypeCode = 'S' | 'O';
export type RowFillStatus = 'pending' | 'filled';

export interface CustomerRecord {
  id: string;
  name: string;
  regType: ShipperRegType;
  regNo: string;
  authorizedOfficial: string;
  contactNo: string;
  footerText: string;
  logoDataUrl?: string;
  sealDataUrl?: string;
  isSample?: boolean;
}

export interface WeighbridgeRecord {
  id: string;
  regNo: string;
  name: string;
  address: string;
  isSample?: boolean;
}

export interface AuthPersonDefaults {
  name: string;
  designation: string;
  mobile: string;
}

export interface VgmContainerRow {
  id: string;
  bookingNo: string;
  containerNo: string;
  sizeCode: ContainerSizeCode;
  typeCode: ContainerTypeCode;
  cscMaxWt: string;
  tareWt: string;
  cargoWt: string;
  vgmWt: string;
  weighingDateTime: string;
  slipNo: string;
  fillStatus: RowFillStatus;
}

export interface VgmBatch {
  shippingLineId: string;
  shippingLineName: string;
  shipperType: ShipperTypeCode;
  customerId: string;
  weighbridgeId: string;
  cargoType: CargoTypeCode;
  imoNo: string;
  unNo: string;
  method: VgmMethodCode;
  authName: string;
  authDesignation: string;
  authMobile: string;
  rows: VgmContainerRow[];
  activeIndex: number;
}

export interface ShippingLineOption {
  id: string;
  name: string;
}

export interface StatusNotice {
  type: 'ok' | 'err' | 'info';
  text: string;
}

export interface MastersBackupPayload {
  version: number;
  exportedAt: string;
  customers: CustomerRecord[];
  weighbridges: WeighbridgeRecord[];
  authDefaults?: AuthPersonDefaults;
}
