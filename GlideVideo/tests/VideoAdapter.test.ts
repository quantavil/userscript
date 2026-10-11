// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { GenericAdapter, YoutubeAdapter, getVideoAdapter } from '../src/video/VideoAdapter';

describe('VideoAdapter', () => {
    let video: HTMLVideoElement;

    beforeEach(() => {
        video = document.createElement('video');
        document.body.appendChild(video);
    });

    it('GenericAdapter should return false for normal video elements', () => {
        const adapter = new GenericAdapter();
        expect(adapter.shouldIgnoreVideo(video)).toBe(false);
    });

    it('GenericAdapter should ignore videos matching ad container classes or IDs', () => {
        const adapter = new GenericAdapter();
        const adContainer = document.createElement('div');
        adContainer.className = 'video-ad-container';
        adContainer.appendChild(video);
        document.body.appendChild(adContainer);

        expect(adapter.shouldIgnoreVideo(video)).toBe(true);
    });

    it('YoutubeAdapter should ignore YouTube video ads', () => {
        const adapter = new YoutubeAdapter();
        const ytAdOverlay = document.createElement('div');
        ytAdOverlay.className = 'ytp-ad-player-overlay';
        ytAdOverlay.appendChild(video);
        document.body.appendChild(ytAdOverlay);

        expect(adapter.shouldIgnoreVideo(video)).toBe(true);
    });

    it('getVideoAdapter should return GenericAdapter by default', () => {
        const adapter = getVideoAdapter();
        expect(adapter).toBeInstanceOf(GenericAdapter);
    });
});
