import { beforeEach, describe, expect, it } from 'bun:test';
import { Window } from 'happy-dom';
import {
  createDefaultBatch,
  createEmptyRow,
  loadAuthDefaults,
  loadCustomers,
  loadSessionBatch,
  loadWeighbridges,
  readDomAuthPerson,
  saveAuthDefaults,
  saveCustomers,
  saveSessionBatch,
  saveWeighbridges,
} from '../src/core/storage';
import type { CustomerRecord, WeighbridgeRecord } from '../src/types';

describe('storage', () => {
  beforeEach(() => {
    const win = new Window({ url: 'https://odexglobal.com/newPyrVGM' });
    Object.assign(globalThis, {
      window: win,
      document: win.document,
      localStorage: win.localStorage,
      sessionStorage: win.sessionStorage,
    });
    localStorage.clear();
    sessionStorage.clear();
  });

  it('seeds sample customer on first run and retains modifications', () => {
    const list1 = loadCustomers();
    expect(list1.length).toBe(1);
    expect(list1[0]?.isSample).toBe(true);

    const custom: CustomerRecord[] = [
      {
        id: 'cust-1',
        name: 'VISHAL EXPORTS',
        regType: 'IEC No',
        regNo: '0123456789',
        authorizedOfficial: 'OFFICIAL',
        contactNo: '9999999999',
        footerText: 'Address',
      },
    ];
    saveCustomers(custom);
    const list2 = loadCustomers();
    expect(list2.length).toBe(1);
    expect(list2[0]?.name).toBe('VISHAL EXPORTS');
  });

  it('seeds sample weighbridge on first run and retains modifications', () => {
    const list1 = loadWeighbridges();
    expect(list1.length).toBe(1);
    expect(list1[0]?.isSample).toBe(true);

    const custom: WeighbridgeRecord[] = [
      {
        id: 'wb-1',
        regNo: 'WB-01',
        name: 'PORT WB',
        address: 'PORT ROAD',
      },
    ];
    saveWeighbridges(custom);
    const list2 = loadWeighbridges();
    expect(list2.length).toBe(1);
    expect(list2[0]?.name).toBe('PORT WB');
  });

  it('manages auth person defaults', () => {
    saveAuthDefaults({
      name: 'RAJESH KUMAR',
      designation: 'EXPORT EXEC',
      mobile: '9876543210',
    });
    const auth = loadAuthDefaults();
    expect(auth.name).toBe('RAJESH KUMAR');
    expect(auth.designation).toBe('EXPORT EXEC');
    expect(auth.mobile).toBe('9876543210');
  });

  it('reads auth person from DOM fallback safely', () => {
    const auth = readDomAuthPerson();
    expect(auth).toHaveProperty('name');
    expect(auth).toHaveProperty('designation');
    expect(auth).toHaveProperty('mobile');
  });

  it('creates empty container row with defaults', () => {
    const row = createEmptyRow();
    expect(row.id).toBeDefined();
    expect(row.sizeCode).toBe('1X40');
    expect(row.typeCode).toBe('HC');
    expect(row.cscMaxWt).toBe('32500');
    expect(row.fillStatus).toBe('pending');
  });

  it('creates default batch and roundtrips through session storage', () => {
    const batch = createDefaultBatch([], [], {
      name: 'AGENT',
      designation: 'CHA',
      mobile: '9000000000',
    });
    expect(batch.rows.length).toBe(1);
    expect(batch.authName).toBe('AGENT');

    saveSessionBatch(batch);
    const loaded = loadSessionBatch();
    expect(loaded).not.toBeNull();
    expect(loaded?.authName).toBe('AGENT');
  });
});
