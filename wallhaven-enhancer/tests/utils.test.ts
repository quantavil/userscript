import { mock, describe, expect, it } from 'bun:test';

// Mock the virtual module '$' before importing any source code
mock.module('$', () => ({
  GM_xmlhttpRequest: () => {},
  GM_download: () => {},
  GM_addStyle: () => {}
}));

describe('Utility Helpers', () => {
  it('should format bytes to human readable sizes correctly', async () => {
    const { fmtSz } = await import('../src/cache');
    expect(fmtSz(0)).toBe('');
    expect(fmtSz(500)).toBe('500 B');
    expect(fmtSz(1024)).toBe('1.0 KB');
    expect(fmtSz(1048576)).toBe('1.00 MB');
    expect(fmtSz(5000000)).toBe('4.77 MB');
  });

  it('should escape HTML tags correctly', async () => {
    const { esc } = await import('../src/api');
    expect(esc('<div>Hello & "World"</div>')).toBe('&lt;div&gt;Hello &amp; &quot;World&quot;&lt;/div&gt;');
  });

  it('should convert relative URLs to absolute wallhaven URLs', async () => {
    const { makeAbsolute } = await import('../src/api');
    const inputHtml = `<a href="/user/name">User</a> <img src="/images/img.jpg"> <a href="https://example.com">External</a>`;
    const expectedHtml = `<a href="https://wallhaven.cc/user/name">User</a> <img src="https://wallhaven.cc/images/img.jpg"> <a href="https://example.com">External</a>`;
    expect(makeAbsolute(inputHtml)).toBe(expectedHtml);
  });
});
