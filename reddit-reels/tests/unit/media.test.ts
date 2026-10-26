import { afterEach, describe, expect, it } from 'bun:test';
import { pickMp4 } from '../../src/media/player';
import { getRedgifs, pickRedgifsUrl } from '../../src/media/redgifs';

const source = {
  mp4: [
    'https://packaged-media.redd.it/x/pb/m2-res_1920p.mp4',
    'https://packaged-media.redd.it/x/pb/m2-res_1280p.mp4',
    'https://packaged-media.redd.it/x/pb/m2-res_720p.mp4',
  ],
  hls: '',
  poster: '',
  captions: '',
  width: 1080,
  height: 1920,
};

describe('source selection', () => {
  it('desktop takes the best mp4, phones cap at 1280p', () => {
    expect(pickMp4(source, false)).toContain('1920p');
    expect(pickMp4(source, true)).toContain('1280p');
    expect(pickMp4({ ...source, mp4: [] }, true)).toBe('');
  });

  it('RedGifs: phones use the -mobile rendition', () => {
    const info = { hd: 'hd.mp4', sd: 'sd.mp4', poster: '', hasAudio: true, width: 1, height: 1 };
    expect(pickRedgifsUrl(info, true)).toBe('sd.mp4');
    expect(pickRedgifsUrl(info, false)).toBe('hd.mp4');
  });
});

describe('RedGifs API through GM_xmlhttpRequest (outside Reddit CSP)', () => {
  afterEach(() => {
    delete (globalThis as any).GM_xmlhttpRequest;
  });

  it('gets a token, retries with a new one on 401 WrongSender, and reads urls', async () => {
    const seen: string[] = [];
    let gifCalls = 0;
    (globalThis as any).sessionStorage = { getItem: () => null, setItem: () => {} };
    (globalThis as any).GM_xmlhttpRequest = (d: any) => {
      seen.push(`${d.url} ${d.headers?.Authorization || ''}`);
      queueMicrotask(() => {
        if (d.url.endsWith('/auth/temporary')) d.onload({ status: 200, response: { token: `tok${seen.length}` } });
        else if (++gifCalls === 1) d.onload({ status: 401, response: { error: { code: 'WrongSender' } } });
        else
          d.onload({
            status: 200,
            response: {
              gif: { urls: { hd: 'H.mp4', sd: 'S.mp4', poster: 'P.jpg' }, hasAudio: true, width: 720, height: 1280 },
            },
          });
      });
    };
    const info = await getRedgifs('retrytest');
    expect(info).toMatchObject({ hd: 'H.mp4', sd: 'S.mp4', poster: 'P.jpg', hasAudio: true });
    expect(seen.filter((s) => s.includes('/auth/temporary')).length).toBe(2);
    expect(seen.every((s) => !s.includes('/gifs/') || s.includes('Bearer tok'))).toBe(true);
    delete (globalThis as any).sessionStorage;
  });
});

describe('captions', () => {
  it('stays off when disabled while the captions request is pending', async () => {
    const { installDom, uninstallDom } = await import('./setup-dom');
    const { Player } = await import('../../src/media/player');
    installDom();
    const originalFetch = globalThis.fetch;
    let resolveFetch!: (response: Response) => void;
    globalThis.fetch = (() =>
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      })) as typeof fetch;
    try {
      const player = new Player();
      (player as any).captionsUrl = 'https://v.redd.it/captions.vtt';
      player.toggleCaptions();
      player.toggleCaptions();
      resolveFetch(new Response('WEBVTT\n', { status: 200 }));
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(player.video.querySelector('track')).toBeNull();
      player.dispose();
    } finally {
      globalThis.fetch = originalFetch;
      uninstallDom();
    }
  });
});

describe('playback lifecycle', () => {
  it('ignores an autoplay rejection after playback has stopped', async () => {
    const { installDom, uninstallDom } = await import('./setup-dom');
    const { Player } = await import('../../src/media/player');
    installDom();
    try {
      const player = new Player();
      let rejectPlay!: (error: Error) => void;
      player.video.play = () =>
        new Promise<void>((_, reject) => {
          rejectPlay = reject;
        });
      const events: string[] = [];
      player.on((event) => events.push(event));
      player.play();
      player.stop();
      const error = new Error('blocked');
      error.name = 'NotAllowedError';
      rejectPlay(error);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(events).not.toContain('autoplay-muted');
      expect(events).not.toContain('blocked');
    } finally {
      uninstallDom();
    }
  });
});
