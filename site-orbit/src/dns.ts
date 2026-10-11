import { array, number, object, optional, safeParse, string } from 'valibot';
import type { HttpClient } from './gm';
import type { DnsInfo } from './types';

const DohAnswerSchema = object({
  name: string(),
  type: number(),
  data: string(),
  TTL: optional(number()),
});

const DohResponseSchema = object({
  Status: number(),
  Answer: optional(array(DohAnswerSchema)),
});

export function classifyNameserver(nameservers: string[]): string | null {
  const joined = nameservers.join(' ').toLowerCase();
  if (joined.includes('cloudflare.com')) return 'Cloudflare DNS';
  if (joined.includes('awsdns')) return 'AWS Route 53';
  if (joined.includes('nsone.net') || joined.includes('p08.nsone')) return 'NS1 / IBM';
  if (joined.includes('googledomains') || joined.includes('google.com')) return 'Google Cloud DNS';
  if (joined.includes('akam') || joined.includes('akadns')) return 'Akamai Edge DNS';
  if (joined.includes('azure-dns')) return 'Azure DNS';
  if (joined.includes('dynect.net')) return 'Oracle Dyn';
  if (joined.includes('digitalocean.com')) return 'DigitalOcean DNS';
  if (joined.includes('dnsimple.com')) return 'DNSimple';
  if (joined.includes('he.net')) return 'Hurricane Electric';
  if (joined.includes('linode.com')) return 'Linode DNS';
  if (nameservers.length > 0) {
    const first = nameservers[0].replace(/\.$/, '').split('.').slice(-2).join('.');
    return first || null;
  }
  return null;
}

export function classifyMailProvider(mailServers: string[]): string | null {
  const joined = mailServers.join(' ').toLowerCase();
  if (joined.includes('google.com') || joined.includes('googlemail.com') || joined.includes('aspmx')) {
    return 'Google Workspace';
  }
  if (
    joined.includes('outlook.com') ||
    joined.includes('microsoft.com') ||
    joined.includes('protection.outlook')
  ) {
    return 'Microsoft 365';
  }
  if (joined.includes('protonmail') || joined.includes('proton.me')) {
    return 'Proton Mail';
  }
  if (joined.includes('zoho.com') || joined.includes('zoho.eu')) {
    return 'Zoho Mail';
  }
  if (joined.includes('fastmail.com')) {
    return 'Fastmail';
  }
  if (joined.includes('mimecast.com')) {
    return 'Mimecast Secure Mail';
  }
  if (joined.includes('cf-emailsecurity') || joined.includes('cloudflare')) {
    return 'Cloudflare Email';
  }
  if (joined.includes('messagelabs.com')) {
    return 'Symantec MessageLabs';
  }
  if (joined.includes('amazonaws.com') || joined.includes('amazon-smtp')) {
    return 'Amazon SES';
  }
  if (mailServers.length > 0) {
    const first = mailServers[0]
      .replace(/^\d+\s+/, '')
      .replace(/\.$/, '')
      .split('.')
      .slice(-2)
      .join('.');
    return first || null;
  }
  return null;
}

export async function fetchDnsInfo(domain: string, http: HttpClient): Promise<DnsInfo | null> {
  const dohUrl = (type: string) =>
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`;

  const [nsRes, mxRes, aaaaRes] = await Promise.allSettled([
    http.get(dohUrl('NS'), 8_000),
    http.get(dohUrl('MX'), 8_000),
    http.get(dohUrl('AAAA'), 8_000),
  ]);

  const parseDoh = (res: PromiseSettledResult<{ status: number; text: string }>) => {
    if (res.status !== 'fulfilled' || res.value.status !== 200) return [];
    try {
      const parsed = JSON.parse(res.value.text);
      const val = safeParse(DohResponseSchema, parsed);
      return val.success && val.output.Answer ? val.output.Answer.map((a) => a.data) : [];
    } catch {
      return [];
    }
  };

  const nsRecords = parseDoh(nsRes).map((s) => s.replace(/\.$/, ''));
  const mxRecords = parseDoh(mxRes).map((s) => s.replace(/^\d+\s+/, '').replace(/\.$/, ''));
  const aaaaRecords = parseDoh(aaaaRes);

  if (!nsRecords.length && !mxRecords.length && !aaaaRecords.length) {
    return null;
  }

  return {
    nameservers: nsRecords,
    nameserverProvider: classifyNameserver(nsRecords),
    mailServers: mxRecords,
    mailProvider: classifyMailProvider(mxRecords),
    hasIpv6: aaaaRecords.length > 0,
  };
}
