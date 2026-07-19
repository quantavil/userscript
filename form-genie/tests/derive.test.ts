import { describe, it, expect } from 'bun:test';
import {
  resolveValue, parseDate, formatDate, computeAge, monthName,
} from '../src/profile/derive';

describe('resolveValue', () => {
  it('composes full name from parts', () => {
    const data = { 'personal.firstName': 'Ravi', 'personal.middleName': 'Kumar', 'personal.lastName': 'Sharma' };
    expect(resolveValue(data, 'personal.fullName')).toBe('Ravi Kumar Sharma');
  });

  it('derives first/last from stored full name', () => {
    const data = { 'personal.fullName': 'Ravi Kumar Sharma' };
    expect(resolveValue(data, 'personal.firstName')).toBe('Ravi');
    expect(resolveValue(data, 'personal.lastName')).toBe('Sharma');
    expect(resolveValue(data, 'personal.middleName')).toBe('Kumar');
  });

  it('mirrors correspondence from permanent when flag set', () => {
    const data = {
      'address.permanent.city': 'Patna',
      'address.correspondence.sameAsPermanent': 'Yes',
    };
    expect(resolveValue(data, 'address.correspondence.city')).toBe('Patna');
  });

  it('permanent wins over a stale own value when flag is set', () => {
    // "Same as permanent = Yes" is authoritative: the editor disables (no longer
    // erases) correspondence inputs, so any leftover own value must not win.
    const data = {
      'address.permanent.city': 'Patna',
      'address.correspondence.city': 'Delhi',
      'address.correspondence.sameAsPermanent': 'Yes',
    };
    expect(resolveValue(data, 'address.correspondence.city')).toBe('Patna');
  });

  it('uses own value when flag is not set', () => {
    const data = {
      'address.permanent.city': 'Patna',
      'address.correspondence.city': 'Delhi',
      'address.correspondence.sameAsPermanent': 'No',
    };
    expect(resolveValue(data, 'address.correspondence.city')).toBe('Delhi');
  });
});

describe('parseDate / formatDate', () => {
  it('parses ISO and DMY', () => {
    expect(parseDate('1998-09-05')).toEqual({ day: '05', month: '09', year: '1998' });
    expect(parseDate('05/09/1998')).toEqual({ day: '05', month: '09', year: '1998' });
    expect(parseDate('5-9-1998')).toEqual({ day: '05', month: '09', year: '1998' });
  });

  it('rejects invalid', () => {
    expect(parseDate('not a date')).toBeNull();
    expect(parseDate('99/99/1998')).toBeNull();
  });

  it('formats in each layout', () => {
    const p = { day: '05', month: '09', year: '1998' };
    expect(formatDate(p, 'DD/MM/YYYY')).toBe('05/09/1998');
    expect(formatDate(p, 'YYYY-MM-DD')).toBe('1998-09-05');
    expect(formatDate(p, 'DD-MM-YYYY')).toBe('05-09-1998');
  });

  it('computes age', () => {
    const p = { day: '05', month: '09', year: '2000' };
    expect(computeAge(p, new Date('2020-09-05'))).toBe(20);
    expect(computeAge(p, new Date('2020-09-04'))).toBe(19);
  });

  it('names months', () => {
    expect(monthName('09')).toBe('September');
  });
});
