import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hexToU8, ivFromSeq, aesCbcDecrypt, clearKeyCache } from '../src/core/crypto';

describe('hexToU8', () => {
  it('converts hex string to Uint8Array', () => {
    expect(hexToU8('00')).toEqual(new Uint8Array([0]));
    expect(hexToU8('ff')).toEqual(new Uint8Array([255]));
    expect(hexToU8('0102030405')).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
  });

  it('handles 0x prefix', () => {
    expect(hexToU8('0x1234')).toEqual(new Uint8Array([0x12, 0x34]));
  });

  it('handles odd-length strings', () => {
    expect(hexToU8('123')).toEqual(new Uint8Array([0x01, 0x23]));
  });

  it('handles null/undefined', () => {
    expect(hexToU8(null)).toEqual(new Uint8Array([]));
    expect(hexToU8(undefined)).toEqual(new Uint8Array([]));
  });
});

describe('ivFromSeq', () => {
  it('generates 16-byte IV from sequence number', () => {
    const iv = ivFromSeq(0);
    expect(iv.length).toBe(16);
    expect(iv).toEqual(new Uint8Array(16));
  });

  it('encodes sequence in big-endian format', () => {
    const iv = ivFromSeq(1);
    expect(iv[15]).toBe(1);
    expect(iv[14]).toBe(0);

    const iv256 = ivFromSeq(256);
    expect(iv256[15]).toBe(0);
    expect(iv256[14]).toBe(1);
  });

  it('handles large sequence numbers', () => {
    const iv = ivFromSeq(0xFFFFFFFF);
    expect(iv[12]).toBe(0xFF);
    expect(iv[13]).toBe(0xFF);
    expect(iv[14]).toBe(0xFF);
    expect(iv[15]).toBe(0xFF);
  });
});

describe('aesCbcDecrypt', () => {
  beforeEach(() => {
    clearKeyCache();
    vi.restoreAllMocks();
  });

  it('decrypts AES-128-CBC data', async () => {
    // Known test vector
    const key = new Uint8Array([
      0x2b, 0x7e, 0x15, 0x16, 0x28, 0xae, 0xd2, 0xa6,
      0xab, 0xf7, 0x15, 0x88, 0x09, 0xcf, 0x4f, 0x3c,
    ]);
    const iv = new Uint8Array(16);

    // Encrypt some data first
    const plaintext = new Uint8Array(32).fill(0x42);

    const cryptoKey = await crypto.subtle.importKey(
      'raw', key, { name: 'AES-CBC' }, false, ['encrypt']
    );
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv }, cryptoKey, plaintext
    );

    // Now decrypt
    const decrypted = await aesCbcDecrypt(encrypted, key, iv);
    expect(new Uint8Array(decrypted)).toEqual(plaintext);
  });

  it('caches CryptoKey calls', async () => {
    const importSpy = vi.spyOn(crypto.subtle, 'importKey');

    const key = new Uint8Array([
      0x2b, 0x7e, 0x15, 0x16, 0x28, 0xae, 0xd2, 0xa6,
      0xab, 0xf7, 0x15, 0x88, 0x09, 0xcf, 0x4f, 0x3c,
    ]);
    const iv = new Uint8Array(16);

    // 1. First call - should trigger importKey
    // We pass a dummy buffer since we don't care about the decryption result here,
    // only the import logic. However, decrypt might fail if buffer is bad, 
    // but the import happens BEFORE decrypt.
    // To be safe, let's encrypt something valid first so decrypt doesn't throw.
    const plaintext = new Uint8Array(16).fill(0x1);
    const encKey = await crypto.subtle.importKey(
      'raw', key, { name: 'AES-CBC' }, false, ['encrypt']
    );
    // This 'encKey' import call is counted by the spy if we set it up before.
    // Let's reset the spy/mock AFTER this setup or just count calls carefully.

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv }, encKey, plaintext
    );

    // RESET SPY valid "starting point"
    importSpy.mockClear();

    // Call 1
    await aesCbcDecrypt(encrypted, key, iv);
    expect(importSpy).toHaveBeenCalledTimes(1);

    // Call 2 - should cache
    await aesCbcDecrypt(encrypted, key, iv);
    expect(importSpy).toHaveBeenCalledTimes(1); // Still 1
  });
});