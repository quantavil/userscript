import { describe, expect, test } from 'bun:test';
import { domainFromUrl } from '../src/domain';

describe('domainFromUrl', () => {
  test.each([
    ['https://www.example.com/path', 'example.com'],
    ['https://news.bbc.co.uk/story', 'bbc.co.uk'],
    ['https://食狮.com.cn/', 'xn--85x722f.com.cn'],
    ['http://subdomain.github.io/', 'subdomain.github.io'],
    ['https://portal.sydney.nsw.edu.au/student', 'sydney.nsw.edu.au'],
    ['https://transport.nsw.gov.au/roads', 'nsw.gov.au'],
    ['https://highschool.pvt.k12.ma.us/home', 'highschool.pvt.k12.ma.us'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(domainFromUrl(input)).toBe(expected);
  });

  test.each([
    'ftp://example.com/file',
    'http://localhost:3000/',
    'http://127.0.0.1/',
    'http://[::1]/',
    'https://printer.local/',
    'https://tranco-list.eu/list/example.com/',
    'https://co.uk/',
    'not a url',
  ])('rejects ineligible address %s', (input) => {
    expect(domainFromUrl(input)).toBeNull();
  });
});
