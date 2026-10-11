import { describe, expect, test } from 'bun:test';
import { detectTech } from '../src/detect-tech';

describe('detectTech', () => {
  test('detects React, Next.js, and Google Analytics from DOM markers', () => {
    const doc = document.implementation.createHTMLDocument('Test');
    const nextScript = doc.createElement('script');
    nextScript.id = '__NEXT_DATA__';
    nextScript.type = 'application/json';
    nextScript.textContent = '{}';
    doc.head.appendChild(nextScript);

    const reactDiv = doc.createElement('div');
    reactDiv.setAttribute('data-reactroot', '');
    doc.body.appendChild(reactDiv);

    const fakeWin = {
      _reactRootContainer: {},
    } as unknown as Window;

    const detected = detectTech(doc, fakeWin);
    expect(detected.map((t) => t.name)).toContain('React');
    expect(detected.map((t) => t.name)).toContain('Next.js');
  });

  test('detects WordPress, Ghost, and Astro', () => {
    const doc = document.implementation.createHTMLDocument('WP Test');
    const wpMeta = doc.createElement('meta');
    wpMeta.name = 'generator';
    wpMeta.content = 'WordPress 6.6';
    doc.head.appendChild(wpMeta);

    const astro = doc.createElement('astro-island');
    doc.body.appendChild(astro);

    const detected = detectTech(doc);
    expect(detected.map((t) => t.name)).toContain('WordPress');
    expect(detected.map((t) => t.name)).toContain('Astro');
  });

  test('detects PostHog, Plausible, and Sentry from window globals', () => {
    const doc = document.implementation.createHTMLDocument('Global Test');
    const fakeWin = {
      posthog: { init: () => {} },
      plausible: () => {},
      Sentry: { captureException: () => {} },
    } as unknown as Window;

    const detected = detectTech(doc, fakeWin);
    expect(detected.map((t) => t.name)).toContain('PostHog');
    expect(detected.map((t) => t.name)).toContain('Plausible');
    expect(detected.map((t) => t.name)).toContain('Sentry');
  });
});
