// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SegmentFetcher, SegmentDownloader } from '../src/core/download-engine';
import * as Network from '../src/core/network';

// Mock dependencies
vi.mock('../src/core/network', () => ({
    getBin: vi.fn(),
    MediaType: { BINARY: 'arraybuffer' }
}));

vi.mock('../src/core/crypto', () => ({
    aesCbcDecrypt: vi.fn(async (data) => data) // Identity pass-through
}));

describe('SegmentFetcher', () => {
    it('should fetch a segment successfully', async () => {
        const mockData = new Uint8Array([1, 2, 3]);
        (Network.getBin as any).mockResolvedValue(mockData.buffer);

        // Mock segment object
        const segment = { uri: 'http://seg1' };

        // Construct fetcher (takes mediaSeq)
        const fetcher = new SegmentFetcher(0);

        // Call fetch (not download, download is private)
        // Wait, download is private? checking... yes. 
        // fetch is public: async fetch(segment, index, signal, onProgress)

        // We need to pass a signal and validation
        const signal = new AbortController().signal;
        const result = await fetcher.fetch(segment, 0, signal, () => { });

        expect(Network.getBin).toHaveBeenCalled();
        expect(result).toBeInstanceOf(Uint8Array);
    });
});

describe('SegmentDownloader', () => {
    it('should be instantiable', () => {
        const segments = [{ uri: 'http://s1' }];
        const writer = { write: vi.fn(), close: vi.fn(), abort: vi.fn() };
        // segments, mediaSeq, writer, onProgress, onComplete
        const dl = new SegmentDownloader(
            segments,
            0,
            writer,
            () => { },
            () => { }
        );
        expect(dl).toBeDefined();
    });
});
