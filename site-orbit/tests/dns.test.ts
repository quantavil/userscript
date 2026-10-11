import { describe, expect, test } from 'bun:test';
import { classifyMailProvider, classifyNameserver, fetchDnsInfo } from '../src/dns';
import type { HttpClient } from '../src/gm';

describe('dns intelligence', () => {
  test('classifies nameserver providers correctly', () => {
    expect(classifyNameserver(['ns1.cloudflare.com', 'ns2.cloudflare.com'])).toBe('Cloudflare DNS');
    expect(classifyNameserver(['ns-1029.awsdns-00.org', 'ns-1887.awsdns-43.co.uk'])).toBe('AWS Route 53');
    expect(classifyNameserver(['dns1.p08.nsone.net'])).toBe('NS1 / IBM');
    expect(classifyNameserver(['ns1.googledomains.com'])).toBe('Google Cloud DNS');
  });

  test('classifies mail server providers correctly', () => {
    expect(classifyMailProvider(['10 aspmx.l.google.com', '20 alt1.aspmx.l.google.com'])).toBe(
      'Google Workspace',
    );
    expect(classifyMailProvider(['0 github-com.mail.protection.outlook.com'])).toBe('Microsoft 365');
    expect(classifyMailProvider(['10 mail.protonmail.ch'])).toBe('Proton Mail');
    expect(classifyMailProvider(['10 mx.zoho.com'])).toBe('Zoho Mail');
  });

  test('fetchDnsInfo queries DoH and builds DnsInfo', async () => {
    const fakeHttp: HttpClient = {
      get: async (url: string) => {
        if (url.includes('type=NS')) {
          return {
            status: 200,
            text: JSON.stringify({
              Status: 0,
              Answer: [{ name: 'github.com', type: 2, data: 'ns-1283.awsdns-32.org.' }],
            }),
          };
        }
        if (url.includes('type=MX')) {
          return {
            status: 200,
            text: JSON.stringify({
              Status: 0,
              Answer: [{ name: 'github.com', type: 15, data: '0 github-com.mail.protection.outlook.com.' }],
            }),
          };
        }
        if (url.includes('type=AAAA')) {
          return {
            status: 200,
            text: JSON.stringify({
              Status: 0,
              Answer: [{ name: 'github.com', type: 28, data: '2600:1f18:2489:8200::10' }],
            }),
          };
        }
        return { status: 404, text: '' };
      },
    };

    const info = await fetchDnsInfo('github.com', fakeHttp);
    expect(info).not.toBeNull();
    expect(info?.nameserverProvider).toBe('AWS Route 53');
    expect(info?.mailProvider).toBe('Microsoft 365');
    expect(info?.hasIpv6).toBe(true);
  });
});
