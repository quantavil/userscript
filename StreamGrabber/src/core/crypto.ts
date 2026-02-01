/**
 * AES-128-CBC decryption for HLS segments
 */

/**
 * Convert hex string to Uint8Array
 */
export function hexToU8(hex: string | null | undefined): Uint8Array {
  let cleaned = String(hex || '')
    .replace(/^0x/i, '')
    .replace(/[^0-9a-f]/gi, '');
  
  if (cleaned.length % 2) cleaned = '0' + cleaned;
  
  const out = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(cleaned.substr(i * 2, 2), 16);
  }
  return out;
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

/**
 * Decrypt buffer using AES-128-CBC
 */
export async function aesCbcDecrypt(
  buf: ArrayBuffer,
  keyBytes: Uint8Array,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );
  
  return crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    key,
    buf
  );
}