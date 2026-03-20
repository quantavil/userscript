/**
 * AES-128-CBC decryption for HLS segments
 */

/**
 * Convert hex string to Uint8Array
 */
export function hexToU8(hex: string | null | undefined): Uint8Array {
  const clean = (hex || '').replace(/^0x/i, '').replace(/[^0-9a-f]/gi, '');
  if (clean.length === 0) return new Uint8Array(0);

  // Pad if odd length
  const evenHex = clean.length % 2 === 0 ? clean : '0' + clean;

  // Use modern match safely
  const chunks = evenHex.match(/.{1,2}/g);
  if (!chunks) return new Uint8Array(0);

  return new Uint8Array(chunks.map(b => parseInt(b, 16)));
}

/**
 * Generate IV from segment sequence number
 * HLS spec: 16-byte big-endian integer
 */
export function ivFromSeq(n: number): Uint8Array {
  let seq = BigInt(n >>> 0);
  const iv = new Uint8Array(16);
  for (let i = 15; i >= 0; i--) {
    iv[i] = Number(seq & 0xffn);
    seq >>= 8n;
  }
  return iv;
}

import { once } from '../utils/index';

const keyCache = new Map<string, CryptoKey>();
const keyInflight = new Map<string, Promise<CryptoKey>>();
const MAX_CACHED_KEYS = 10;

function u8ToHex(u8: Uint8Array): string {
  let res = '';
  for (let i = 0; i < u8.length; i++) {
    res += u8[i].toString(16).padStart(2, '0');
  }
  return res;
}

export function clearKeyCache() {
  keyCache.clear();
  keyInflight.clear();
}

export async function aesCbcDecrypt(
  buf: ArrayBuffer,
  keyBytes: Uint8Array,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  const hex = u8ToHex(keyBytes);

  const key = await once(
    keyCache,
    keyInflight,
    hex,
    () => crypto.subtle.importKey(
      'raw',
      keyBytes as any,
      { name: 'AES-CBC' },
      false,
      ['decrypt']
    ),
    MAX_CACHED_KEYS
  );

  return crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: iv as any },
    key,
    buf
  );
}