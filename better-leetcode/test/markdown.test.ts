import { describe, expect, test } from 'bun:test';
import {
  buildMarkdown,
  fence,
  fenceLang,
  formatTokens,
  htmlToMarkdown,
  pickSnippet,
  splitContent,
  timeAgo,
} from '../src/markdown';
import { DEFAULT_SETTINGS } from '../src/settings';
import type { FailRecord } from '../src/types';
import { OLD_STYLE, question, TWO_SUM } from './fixtures';

const NOW = 1_700_000_000_000;

describe('fence', () => {
  test('uses a longer fence when the code contains backtick runs', () => {
    expect(fence('a ``` b')).toBe('````\na ``` b\n````');
  });
  test('trims trailing whitespace only', () => {
    expect(fence('  x  \n\n', 'ts')).toBe('```ts\n  x\n```');
  });
});

describe('splitContent', () => {
  const parts = splitContent(TWO_SUM);

  test('separates statement, examples, constraints', () => {
    expect(parts.statement).toStartWith('Given an array of integers `nums` and an integer `target`');
    expect(parts.statement).not.toContain('Example 1');
    expect(parts.examples).toStartWith('**Example 1:**');
    expect(parts.examples).toContain('Example 2:');
    expect(parts.constraints).toStartWith('**Constraints:**');
  });

  test('renders sup inside code and keeps top-level follow-up inline', () => {
    expect(parts.constraints).toContain('- `2 <= nums.length <= 10^4`');
    expect(parts.constraints).toContain('- `-10^9 <= nums[i] <= 10^9`');
    expect(parts.constraints).toContain(
      '**Follow-up:** Can you come up with an algorithm that is less than `O(n^2)` time complexity?',
    );
  });

  test('example blocks are fenced and brackets are not escaped', () => {
    expect(parts.examples).toContain('```\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]');
    expect(htmlToMarkdown('<p>nums = [1,2] and a_b * c</p>')).toBe('nums = [1,2] and a_b * c');
  });

  test('keeps an image-only paragraph (was silently dropped before)', () => {
    expect(splitContent(OLD_STYLE).statement).toContain('![](https://assets.leetcode.com/uploads/2020/10/02/grid.jpg)');
  });

  test('keeps <sup> and <br> inside <pre>', () => {
    const ex = splitContent(OLD_STYLE).examples;
    expect(ex).toContain('n = 10^5');
    expect(ex).toContain('2^31-1\nNote:');
  });

  test('does not reflow code fences (a line starting with "-   " survives)', () => {
    expect(splitContent(OLD_STYLE).examples).toContain('Note: -   not a list');
  });

  test('list items use single-space markers and nest by marker width', () => {
    const { statement } = splitContent(OLD_STYLE);
    expect(statement).toContain('1. First `a_b`');
    expect(statement).toContain('2. Second\n   - nested one\n   - nested two');
  });

  test('tables become GFM tables', () => {
    expect(splitContent(OLD_STYLE).statement).toContain('| Col A | Col B |');
  });

  test('top-level text with angle brackets is not re-parsed as HTML', () => {
    const { statement } = splitContent('<p>x</p>a &lt;b&gt; c');
    expect(statement).toContain('a <b> c');
  });

  test('handles content with no headings', () => {
    const p = splitContent('<p>Only text.</p>');
    expect(p).toEqual({ statement: 'Only text.', examples: '', constraints: '' });
  });
});

describe('pickSnippet', () => {
  const q = question();
  test('prefers the toolbar label', () => expect(pickSnippet(q, 'Python3', null)?.langSlug).toBe('python3'));
  test('matches langSlug case-insensitively', () => expect(pickSnippet(q, 'CPP', null)?.langSlug).toBe('cpp'));
  test('falls back to the monaco id with remapping', () =>
    expect(pickSnippet(q, null, 'python')?.langSlug).toBe('python3'));
  test('falls back to the first snippet', () => expect(pickSnippet(q, 'Nope', null)?.langSlug).toBe('cpp'));
  test('null when there are no snippets', () =>
    expect(pickSnippet(question({ codeSnippets: [] }), 'C++', null)).toBeNull());
  test('fence language mapping', () => {
    expect(fenceLang('python3')).toBe('python');
    expect(fenceLang('rust')).toBe('rust');
  });
});

describe('helpers', () => {
  test('timeAgo', () => {
    expect(timeAgo(NOW - 5_000, NOW)).toBe('just now');
    expect(timeAgo(NOW - 5 * 60_000, NOW)).toBe('5 min ago');
    expect(timeAgo(NOW - 3 * 3_600_000, NOW)).toBe('3 h ago');
    expect(timeAgo(NOW - 2 * 86_400_000, NOW)).toBe('2 d ago');
  });
  test('formatTokens', () => {
    expect(formatTokens('x'.repeat(400))).toBe('~100 tokens');
    expect(formatTokens('x'.repeat(6000))).toBe('~1.5k tokens');
  });
});

describe('buildMarkdown', () => {
  const q = question();
  const tpl = q.codeSnippets.find((s) => s.langSlug === 'python3');
  if (!tpl) throw new Error('fixture: python3 snippet missing');
  const base = { comments: [], template: tpl, editor: null, fail: null, now: NOW };
  const fail: FailRecord = {
    slug: 'two-sum',
    status: 'Wrong Answer',
    input: '[3,3]\n6',
    expected: '[0,1]',
    output: '[]',
    stdout: 'dbg',
    error: '',
    passed: '56 / 62',
    time: NOW - 120_000,
  };

  test('default output has the expected sections in order', () => {
    const md = buildMarkdown(q, DEFAULT_SETTINGS, { ...base, fail });
    const heads = md.match(/^#{1,2} .*/gm);
    expect(heads).toEqual([
      '# 1. Two Sum',
      '## Problem',
      '## Examples',
      '## Constraints',
      '## Hints',
      '## Code Template (Python3)',
      '## Last Failed Submission (Wrong Answer, 56 / 62 passed, 2 min ago)',
    ]);
    expect(md).toContain('1. A really brute force');
    expect(md).toContain('2. Use a `HashMap`.\n   Second line.'.replace('\n   Second', '  \n   Second'));
    expect(md).toContain('**Stdout**');
    expect(md.endsWith('\n')).toBe(true);
  });

  test('toggles remove sections; prompt goes first with variables replaced safely', () => {
    const s = {
      ...DEFAULT_SETTINGS,
      title: false,
      hints: false,
      codeTemplate: false,
      statement: false,
      examples: false,
      prompt: 'Solve {{ title }} ({{id}}, {{DIFFICULTY}}, {{language}}) $& {{unknown}}',
    };
    const md = buildMarkdown({ ...q, title: 'T$&' }, s, {
      ...base,
      editor: { code: 'x', label: 'Python3', langSlug: 'python3', partial: false },
    });
    expect(md.startsWith('Solve T$& (1, Easy, Python3) $& {{unknown}}')).toBe(true);
    expect(md).not.toContain('## Hints');
    expect(md).toContain('## Constraints');
  });

  test('tags are opt-in', () => {
    expect(buildMarkdown(q, DEFAULT_SETTINGS, base)).not.toContain('**Topics:**');
    expect(buildMarkdown(q, { ...DEFAULT_SETTINGS, tags: true }, base)).toContain('**Topics:** Array, Hash Table');
  });

  test('untouched template is not pasted twice', () => {
    const md = buildMarkdown(q, DEFAULT_SETTINGS, {
      ...base,
      editor: { code: tpl.code, label: 'Python3', langSlug: 'python3', partial: false },
    });
    expect(md).not.toContain('## My Current Code');
    expect(md).toContain('still contains only this template');
  });

  test('changed code is included; partial reads are flagged', () => {
    const md = buildMarkdown(q, DEFAULT_SETTINGS, {
      ...base,
      editor: { code: 'def f(): pass', label: 'Python3', langSlug: 'python3', partial: true },
    });
    expect(md).toContain('## My Current Code (Python3)');
    expect(md).toContain('Partial:');
    expect(md).toContain('```python\ndef f(): pass\n```');
  });

  test('compile errors (no input) still render', () => {
    const md = buildMarkdown(q, DEFAULT_SETTINGS, {
      ...base,
      fail: {
        ...fail,
        status: 'Compile Error',
        input: '',
        expected: '',
        output: '',
        stdout: '',
        passed: '',
        error: 'line 3: bad',
      },
    });
    expect(md).toContain('## Last Failed Submission (Compile Error, 2 min ago)');
    expect(md).toContain('**Error**');
    expect(md).not.toContain('**Input**');
  });

  test('comments respect the toggle and are truncated', () => {
    const comments = [{ author: 'a', votes: 5, content: 'x'.repeat(2500) }];
    expect(buildMarkdown(q, DEFAULT_SETTINGS, { ...base, comments })).not.toContain('Top Comments');
    const md = buildMarkdown(q, { ...DEFAULT_SETTINGS, comments: true }, { ...base, comments });
    expect(md).toContain('### 1. @a (5 votes)');
    expect(md).toContain(`${'x'.repeat(2000)}...`);
  });

  test('only a prompt when everything else is off', () => {
    const off = {
      ...DEFAULT_SETTINGS,
      title: false,
      statement: false,
      examples: false,
      constraints: false,
      hints: false,
      codeTemplate: false,
      currentCode: false,
      failingTest: false,
      prompt: 'hi',
    };
    expect(buildMarkdown(q, off, base)).toBe('hi\n');
  });
});
