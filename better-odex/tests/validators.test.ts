import { describe, expect, it } from 'bun:test';
import {
  findDuplicateCustomer,
  formatDateDDMMYYYY,
  formatOdexTimestamp,
  formatWeight,
  fromDatetimeLocal,
  isOverCscLimit,
  isValidContainerNo,
  normalizeKey,
  splitAddressLines,
  summarizeContainerSizes,
  toDatetimeLocal,
  validateRowForSubmission,
} from '../src/core/validators';
import type {
  CustomerRecord,
  RowFillStatus,
  ShipperTypeCode,
  VgmContainerRow,
  VgmMethodCode,
} from '../src/types';

describe('validators', () => {
  describe('isValidContainerNo', () => {
    it('accepts valid 11-char ISO container numbers (4 letters + 7 digits)', () => {
      expect(isValidContainerNo('TXGU8834456')).toBe(true);
      expect(isValidContainerNo('msku1234567')).toBe(true);
      expect(isValidContainerNo('  MEDU9876543  ')).toBe(true);
    });

    it('allows empty string for in-progress typing', () => {
      expect(isValidContainerNo('')).toBe(true);
      expect(isValidContainerNo('   ')).toBe(true);
    });

    it('rejects invalid patterns', () => {
      expect(isValidContainerNo('TXG8834456')).toBe(false); // 3 letters
      expect(isValidContainerNo('TXGU883445')).toBe(false); // 6 digits
      expect(isValidContainerNo('TXGU88344567')).toBe(false); // 8 digits
      expect(isValidContainerNo('12348834456')).toBe(false); // digits prefix
      expect(isValidContainerNo('CONTAINER12')).toBe(false);
    });
  });

  describe('isOverCscLimit', () => {
    it('detects when VGM weight exceeds CSC max plate limit', () => {
      expect(isOverCscLimit('33000', '32500')).toBe(true);
      expect(isOverCscLimit('32500', '32500')).toBe(false);
      expect(isOverCscLimit('28000', '32500')).toBe(false);
      expect(isOverCscLimit('0', '32500')).toBe(false);
      expect(isOverCscLimit('', '32500')).toBe(false);
    });
  });

  describe('normalizeKey', () => {
    it('collapses spaces and uppercases strings', () => {
      expect(normalizeKey('  Acme   Exports  Private   Limited  ')).toBe(
        'ACME EXPORTS PRIVATE LIMITED',
      );
    });
  });

  describe('findDuplicateCustomer', () => {
    const list: CustomerRecord[] = [
      {
        id: 'c-1',
        name: 'ACME EXPORTS PVT LTD',
        regType: 'IEC No',
        regNo: '0123456789',
        authorizedOfficial: 'JOHN DOE',
        contactNo: '9876543210',
        footerText: '',
      },
      {
        id: 'c-2',
        name: 'BETA LOGISTICS',
        regType: 'IEC No',
        regNo: '9876543210',
        authorizedOfficial: 'JANE DOE',
        contactNo: '9876543211',
        footerText: '',
      },
    ];

    it('detects duplicate customer name', () => {
      const dup = findDuplicateCustomer(list, {
        name: 'acme  exports  pvt  ltd',
        regNo: 'NEWREG99',
      });
      expect(dup).not.toBeNull();
      expect(dup?.field).toBe('name');
      expect(dup?.existing.id).toBe('c-1');
    });

    it('detects duplicate registration number', () => {
      const dup = findDuplicateCustomer(list, {
        name: 'GAMMA TRADERS',
        regNo: '0123456789',
      });
      expect(dup).not.toBeNull();
      expect(dup?.field).toBe('regNo');
      expect(dup?.existing.id).toBe('c-1');
    });

    it('ignores the record when excluding by id (editing existing)', () => {
      const dup = findDuplicateCustomer(
        list,
        {
          name: 'ACME EXPORTS PVT LTD',
          regNo: '0123456789',
        },
        'c-1',
      );
      expect(dup).toBeNull();
    });
  });

  describe('splitAddressLines', () => {
    it('splits long addresses into at most 3 lines of 35 chars without breaking words', () => {
      const addr =
        'PLOT NO 14 SECTOR 2 INDUSTRIAL AREA NEAR PORT GATE NH 8 SAMPLE CITY GUJARAT 370201';
      const [l1, l2, l3] = splitAddressLines(addr, 35);
      expect(l1.length).toBeLessThanOrEqual(35);
      expect(l2.length).toBeLessThanOrEqual(35);
      expect(l3.length).toBeLessThanOrEqual(35);
      expect(l1).toBe('PLOT NO 14 SECTOR 2 INDUSTRIAL AREA');
      expect(l2).toBe('NEAR PORT GATE NH 8 SAMPLE CITY');
      expect(l3).toBe('GUJARAT 370201');
    });
  });

  describe('formatWeight', () => {
    it('formats numbers with comma grouping', () => {
      expect(formatWeight(32500)).toBe('32,500');
      expect(formatWeight('8710')).toBe('8,710');
      expect(formatWeight('12345.67')).toBe('12,345.67');
      expect(formatWeight(0)).toBe('—');
      expect(formatWeight('')).toBe('—');
      expect(formatWeight('invalid')).toBe('—');
    });
  });

  describe('summarizeContainerSizes', () => {
    it('groups container sizes correctly', () => {
      const rows: VgmContainerRow[] = [
        {
          id: '1',
          bookingNo: 'B1',
          containerNo: 'C1',
          sizeCode: '1X40',
          typeCode: 'HC',
          cscMaxWt: '32500',
          tareWt: '3700',
          cargoWt: '5000',
          vgmWt: '8700',
          weighingDateTime: '01-01-2026 12:00',
          slipNo: 'S1',
          fillStatus: 'pending',
        },
        {
          id: '2',
          bookingNo: 'B1',
          containerNo: 'C2',
          sizeCode: '1X40',
          typeCode: 'HC',
          cscMaxWt: '32500',
          tareWt: '3700',
          cargoWt: '5000',
          vgmWt: '8700',
          weighingDateTime: '01-01-2026 12:00',
          slipNo: 'S2',
          fillStatus: 'pending',
        },
        {
          id: '3',
          bookingNo: 'B1',
          containerNo: 'C3',
          sizeCode: '1X20',
          typeCode: 'GPC',
          cscMaxWt: '24000',
          tareWt: '2200',
          cargoWt: '10000',
          vgmWt: '12200',
          weighingDateTime: '01-01-2026 12:00',
          slipNo: 'S3',
          fillStatus: 'pending',
        },
      ];
      expect(summarizeContainerSizes(rows)).toBe("2 × 40' HC, 1 × 20' GP");
    });
  });

  describe('date and timestamp conversion', () => {
    it('converts between odex string and datetime-local input string', () => {
      const odex = '20-11-2026 14:35';
      const iso = toDatetimeLocal(odex);
      expect(iso).toBe('2026-11-20T14:35');
      expect(fromDatetimeLocal(iso)).toBe(odex);
    });

    it('formats date to DD-MM-YYYY', () => {
      const d = new Date(2026, 10, 20); // month is 0-indexed, 10 = Nov
      expect(formatDateDDMMYYYY(d)).toBe('20-11-2026');
    });

    it('formats timestamp to DD-MM-YYYY HH:mm', () => {
      const d = new Date(2026, 10, 20, 15, 45);
      expect(formatOdexTimestamp(d)).toBe('20-11-2026 15:45');
    });
  });

  describe('validateRowForSubmission', () => {
    const baseRow: VgmContainerRow = {
      id: '1',
      bookingNo: 'BKG123',
      containerNo: 'TXGU8834456',
      sizeCode: '1X40',
      typeCode: 'HC',
      cscMaxWt: '32500',
      tareWt: '3700',
      cargoWt: '5000',
      vgmWt: '8700',
      weighingDateTime: '20-11-2026 12:00',
      slipNo: 'S123',
      fillStatus: 'pending',
    };

    it('passes for a valid row', () => {
      expect(validateRowForSubmission(baseRow)).toBeNull();
    });

    it('fails if booking number is missing', () => {
      expect(validateRowForSubmission({ ...baseRow, bookingNo: '  ' })).toBe(
        'Enter Booking No. first.',
      );
    });

    it('fails if container number is missing or invalid', () => {
      expect(validateRowForSubmission({ ...baseRow, containerNo: '' })).toBe(
        'Enter Container No. first.',
      );
      expect(validateRowForSubmission({ ...baseRow, containerNo: 'INVALID' })).toBe(
        'Container No. must match ISO format (4 letters + 7 digits, e.g. TXGU8834456).',
      );
    });

    it('fails if VGM weight is missing or invalid', () => {
      expect(validateRowForSubmission({ ...baseRow, vgmWt: '0' })).toBe(
        'Enter a valid VGM weight (KG).',
      );
      expect(validateRowForSubmission({ ...baseRow, vgmWt: '' })).toBe(
        'Enter a valid VGM weight (KG).',
      );
    });

    it('fails if VGM exceeds CSC Max limit', () => {
      expect(validateRowForSubmission({ ...baseRow, vgmWt: '35000', cscMaxWt: '32500' })).toBe(
        'VGM (35000 KG) exceeds CSC Max Limit (32500 KG).',
      );
    });

    it('handles typed status, shipper, and method codes', () => {
      const method: VgmMethodCode = 'M1';
      const shipper: ShipperTypeCode = 'O';
      const status: RowFillStatus = 'filled';
      expect(method).toBe('M1');
      expect(shipper).toBe('O');
      expect(status).toBe('filled');
    });
  });
});
