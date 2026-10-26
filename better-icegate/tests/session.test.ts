import { expect, test } from 'bun:test';
import { shouldKeepAwake } from '../src/session/keep-awake';

test('keeps an active ICEGATE session awake without reviving an expired or logged-out session', () => {
  expect(shouldKeepAwake('true', '280000', 100000)).toBe(true);
  expect(shouldKeepAwake('false', '280000', 100000)).toBe(false);
  expect(shouldKeepAwake('true', null, 100000)).toBe(false);
  expect(shouldKeepAwake('true', 'invalid', 100000)).toBe(false);
  expect(shouldKeepAwake('true', '99999', 100000)).toBe(false);
});
