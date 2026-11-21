import { describe, expect, it } from 'bun:test';
import { buildMultiVgmHtml, buildSingleVgmHtml } from '../src/pdf/templates';
import type { CustomerRecord, VgmBatch, VgmContainerRow, WeighbridgeRecord } from '../src/types';

describe('templates', () => {
  const customer: CustomerRecord = {
    id: 'c1',
    name: 'VISHAL LOGISTICS SOLUTIONS',
    regType: 'IEC No',
    regNo: '0512345678',
    authorizedOfficial: 'VIKRAM SHARMA - MANAGER',
    contactNo: '9820098200',
    footerText: 'Factory: Mundra Port SEZ, Gujarat',
  };

  const weighbridge: WeighbridgeRecord = {
    id: 'wb1',
    regNo: 'WB-GUJ-9921',
    name: 'MUNDRA PORT WEIGHBRIDGE',
    address: 'GATE 2, SEZ AREA, MUNDRA',
  };

  const row1: VgmContainerRow = {
    id: 'r1',
    bookingNo: 'EBKG990011',
    containerNo: 'TXGU8834456',
    sizeCode: '1X40',
    typeCode: 'HC',
    cscMaxWt: '32500',
    tareWt: '3800',
    cargoWt: '21500',
    vgmWt: '25300',
    weighingDateTime: '20-11-2026 14:00',
    slipNo: 'WB-99120',
    fillStatus: 'pending',
  };

  const row2: VgmContainerRow = {
    id: 'r2',
    bookingNo: 'EBKG990011',
    containerNo: 'MSKU1122334',
    sizeCode: '1X20',
    typeCode: 'GPC',
    cscMaxWt: '24000',
    tareWt: '2200',
    cargoWt: '18000',
    vgmWt: '20200',
    weighingDateTime: '20-11-2026 14:15',
    slipNo: 'WB-99121',
    fillStatus: 'filled',
  };

  const batch: VgmBatch = {
    shippingLineId: 'LINE1',
    shippingLineName: 'MAERSK',
    shipperType: 'O',
    customerId: 'c1',
    weighbridgeId: 'wb1',
    cargoType: 'GEN',
    imoNo: '',
    unNo: '',
    method: 'M1',
    authName: 'VIKRAM SHARMA',
    authDesignation: 'MANAGER',
    authMobile: '9820098200',
    rows: [row1, row2],
    activeIndex: 0,
  };

  describe('buildSingleVgmHtml', () => {
    it('generates valid Annexure-1 declaration HTML for single container', () => {
      const html = buildSingleVgmHtml(batch, row1, customer, weighbridge);
      expect(html).toContain('ANNEXURE-1 • VGM');
      expect(html).toContain('VISHAL LOGISTICS SOLUTIONS');
      expect(html).toContain('TXGU8834456');
      expect(html).toContain('25,300 KG');
      expect(html).toContain('MUNDRA PORT WEIGHBRIDGE');
      expect(html).toContain('WB-99120');
      expect(html).toContain('SOLAS Chapter VI, Regulation 2');
      expect(html).toContain('Factory: Mundra Port SEZ, Gujarat');
    });
  });

  describe('buildMultiVgmHtml', () => {
    it('generates valid multi-container schedule HTML with summary totals', () => {
      const html = buildMultiVgmHtml(batch, customer, weighbridge);
      expect(html).toContain('ANNEXURE-1 • MULTI-CONTAINER VGM');
      expect(html).toContain('VISHAL LOGISTICS SOLUTIONS');
      expect(html).toContain('TXGU8834456');
      expect(html).toContain('MSKU1122334');
      expect(html).toContain('45,500 KG'); // 25300 + 20200
      expect(html).toContain('2 Containers');
      expect(html).toContain('MUNDRA PORT WEIGHBRIDGE');
    });
  });
});
