import { describe, expect, test } from 'bun:test';
import { CHECK_RE, parseCheck } from '../src/failure';

const wa = {
  state: 'SUCCESS',
  status_msg: 'Wrong Answer',
  last_testcase: '[3,3]\n6',
  expected_output: '[0,1]',
  code_output: '[]',
  std_output: '',
  total_correct: 56,
  total_testcases: 62,
};

describe('CHECK_RE', () => {
  test.each([
    ['/submissions/detail/123456789/check/', true],
    ['https://leetcode.com/submissions/detail/1/check/?x=1', true],
    ['/submissions/detail/123/check', true],
    ['/submissions/detail/runcode_abc/check/', false],
    ['/graphql/', false],
  ])('%s', (url, ok) => expect(CHECK_RE.test(url)).toBe(ok));
});

describe('parseCheck', () => {
  test('ignores pending / malformed responses', () => {
    expect(parseCheck('s', { state: 'PENDING' })).toBeNull();
    expect(parseCheck('s', null)).toBeNull();
    expect(parseCheck('s', 'x')).toBeNull();
    expect(parseCheck('s', { state: 'SUCCESS' })).toBeNull();
  });
  test('accepted clears', () =>
    expect(parseCheck('s', { state: 'SUCCESS', status_msg: 'Accepted' })).toEqual({ kind: 'accepted' }));
  test('wrong answer', () => {
    expect(parseCheck('two-sum', wa, 5)).toEqual({
      kind: 'fail',
      record: {
        slug: 'two-sum',
        status: 'Wrong Answer',
        input: '[3,3]\n6',
        expected: '[0,1]',
        output: '[]',
        stdout: '',
        error: '',
        passed: '56 / 62',
        time: 5,
      },
    });
  });
  test('compile error has no input but is kept, ANSI stripped', () => {
    const r = parseCheck('s', {
      state: 'SUCCESS',
      status_msg: 'Compile Error',
      full_compile_error: '\u001b[31merror:\u001b[0m x',
    });
    expect(r).toMatchObject({
      kind: 'fail',
      record: { status: 'Compile Error', input: '', error: 'error: x', passed: '' },
    });
  });
  test('array fields are joined', () => {
    const r = parseCheck('s', { ...wa, std_output: ['a', 'b'] });
    expect(r).toMatchObject({ record: { stdout: 'a\nb' } });
  });
  test('failure with neither input nor error is ignored', () => {
    expect(parseCheck('s', { state: 'SUCCESS', status_msg: 'Internal Error' })).toBeNull();
  });
});
