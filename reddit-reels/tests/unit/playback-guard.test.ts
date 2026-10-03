import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { GlobalWindow } from 'happy-dom';
import { AudioManager } from '../../src/media/audio-manager';

function makePost(doc: Document, id: string): { post: HTMLElement; video: HTMLVideoElement } {
  const post = doc.createElement('shreddit-post');
  post.id = id;
  const video = doc.createElement('video') as HTMLVideoElement;
  // happy-dom media elements do not play; stub the bits the manager uses.
  let paused = true;
  Object.defineProperty(video, 'paused', {
    get: () => paused,
    configurable: true,
  });
  (video as any).play = () => {
    paused = false;
    video.dispatchEvent(new (doc.defaultView as any).Event('play'));
    return Promise.resolve();
  };
  (video as any).pause = () => {
    paused = true;
  };
  post.appendChild(video);
  doc.body.appendChild(post);
  return { post, video };
}

describe('Playback guard (Reddit player + single focus)', () => {
  let window: GlobalWindow;
  let document: Document;

  beforeEach(() => {
    window = new GlobalWindow();
    document = window.document as unknown as Document;
    (globalThis as any).window = window;
    (globalThis as any).document = document;
    (globalThis as any).Node = window.Node;
    (globalThis as any).HTMLElement = window.HTMLElement;
    (globalThis as any).HTMLVideoElement = window.HTMLVideoElement;
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).document;
    delete (globalThis as any).Node;
    delete (globalThis as any).HTMLElement;
    delete (globalThis as any).HTMLVideoElement;
  });

  it('pauses a neighbouring video that Reddit autoplays while another post is active', () => {
    const manager = new AudioManager(false, 1);
    const a = makePost(document, 'a');
    const b = makePost(document, 'b');
    manager.findVideo(b.post); // registers + guards b
    manager.requestPlayback(a.post);
    expect(a.video.paused).toBe(false);

    (b.video as any).play(); // Reddit's own autoplay
    expect(b.video.paused).toBe(true);
    expect(b.video.muted).toBe(true);
    expect(a.video.paused).toBe(false);
  });

  it('adopts a native mute made by the user on the active player', () => {
    const manager = new AudioManager(false, 1);
    const a = makePost(document, 'a');
    manager.requestPlayback(a.post);
    let changes = 0;
    manager.onChange(() => changes++);

    document.dispatchEvent(new (window as any).Event('pointerdown'));
    a.video.muted = true;
    a.video.dispatchEvent(new (window as any).Event('volumechange'));

    expect(manager.isMuted).toBe(true);
    expect(changes).toBe(1);
  });

  it('re-asserts the user choice when the player changes mute on its own', () => {
    const manager = new AudioManager(false, 1);
    const a = makePost(document, 'a');
    manager.requestPlayback(a.post);

    a.video.muted = true; // no recent gesture: Reddit's player did this
    a.video.dispatchEvent(new (window as any).Event('volumechange'));

    expect(manager.isMuted).toBe(false);
    expect(a.video.muted).toBe(false);
  });

  it('does not unload RedGifs frames whose bridge reported READY', () => {
    const manager = new AudioManager(false, 1);
    const a = makePost(document, 'a');
    const other = document.createElement('shreddit-post');
    const ifr = document.createElement('iframe') as HTMLIFrameElement;
    ifr.src = 'https://www.redgifs.com/ifr/abc?muted=0';
    other.appendChild(ifr);
    document.body.appendChild(other);
    const win = { postMessage: () => {} } as unknown as Window;
    Object.defineProperty(ifr, 'contentWindow', { get: () => win });
    manager.markBridgeReady(win);

    manager.requestPlayback(a.post);
    expect(ifr.src).toContain('redgifs.com/ifr/abc');
  });

  it('unloads embeds without a bridge so their audio cannot bleed, and restores them on return', () => {
    const manager = new AudioManager(false, 1);
    const a = makePost(document, 'a');
    const other = document.createElement('shreddit-post');
    const ifr = document.createElement('iframe') as HTMLIFrameElement;
    ifr.src = 'https://streamable.com/e/xyz?autoplay=1';
    other.appendChild(ifr);
    document.body.appendChild(other);

    manager.requestPlayback(a.post);
    expect(ifr.src).toBe('about:blank');

    manager.requestPlayback(other);
    expect(ifr.src).toContain('streamable.com/e/xyz');
  });
});
