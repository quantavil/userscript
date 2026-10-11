import type { TechCategory, TechItem } from './types';

interface TechRule {
  name: string;
  category: TechCategory;
  test: (doc: Document, win: Window) => boolean;
}

const TECH_RULES: TechRule[] = [
  // Frameworks
  {
    name: 'Next.js',
    category: 'framework',
    test: (doc) =>
      Boolean(
        doc.getElementById('__NEXT_DATA__') ||
          doc.querySelector('script[src*="/_next/"]') ||
          doc.querySelector('link[href*="/_next/"]'),
      ),
  },
  {
    name: 'React',
    category: 'framework',
    test: (doc, win) =>
      Boolean(
        doc.querySelector('[data-reactroot], [data-react-helmet]') ||
          doc.getElementById('__NEXT_DATA__') ||
          (win as unknown as { _reactRootContainer?: unknown })._reactRootContainer !== undefined ||
          doc.querySelector('script[src*="react.production"], script[src*="react.development"]'),
      ),
  },
  {
    name: 'Nuxt.js',
    category: 'framework',
    test: (doc, win) =>
      Boolean(
        (win as unknown as { __NUXT__?: unknown }).__NUXT__ !== undefined ||
          doc.getElementById('__NUXT_DATA__') ||
          doc.querySelector('script[src*="/_nuxt/"]'),
      ),
  },
  {
    name: 'Vue.js',
    category: 'framework',
    test: (doc, win) =>
      Boolean(
        (win as unknown as { __VUE__?: unknown }).__VUE__ !== undefined ||
          (win as unknown as { __NUXT__?: unknown }).__NUXT__ !== undefined ||
          doc.querySelector('[data-v-]') ||
          doc.querySelector('script[src*="vue.global"], script[src*="vue.runtime"]'),
      ),
  },
  {
    name: 'Svelte',
    category: 'framework',
    test: (doc) =>
      Boolean(
        doc.querySelector('[class*="svelte-"]') ||
          doc.getElementById('svelte') ||
          doc.querySelector('script[src*="/svelte/"]'),
      ),
  },
  {
    name: 'Astro',
    category: 'framework',
    test: (doc) =>
      Boolean(
        doc.querySelector('astro-island, [data-astro-cid]') ||
          doc.querySelector('meta[name="generator"][content*="Astro"]'),
      ),
  },
  {
    name: 'Angular',
    category: 'framework',
    test: (doc) =>
      Boolean(
        doc.querySelector('[ng-version], [ng-app]') ||
          doc.querySelector('script[src*="angular.js"], script[src*="angular.min.js"]'),
      ),
  },
  {
    name: 'Remix',
    category: 'framework',
    test: (_doc, win) =>
      Boolean(
        (win as unknown as { __remixContext?: unknown }).__remixContext !== undefined ||
          (win as unknown as { __remixManifest?: unknown }).__remixManifest !== undefined,
      ),
  },

  // CMS & E-Commerce
  {
    name: 'WordPress',
    category: 'cms',
    test: (doc) =>
      Boolean(
        doc.querySelector('link[href*="/wp-content/"], script[src*="/wp-content/"]') ||
          doc.querySelector('meta[name="generator"][content*="WordPress"]'),
      ),
  },
  {
    name: 'Shopify',
    category: 'cms',
    test: (doc, win) =>
      Boolean(
        (win as unknown as { Shopify?: unknown }).Shopify !== undefined ||
          doc.querySelector('script[src*="cdn.shopify.com"]'),
      ),
  },
  {
    name: 'Webflow',
    category: 'cms',
    test: (doc) =>
      Boolean(
        doc.querySelector('[data-wf-page], [data-wf-site]') || doc.querySelector('script[src*="webflow.js"]'),
      ),
  },
  {
    name: 'Ghost',
    category: 'cms',
    test: (doc) =>
      Boolean(
        doc.querySelector('meta[name="generator"][content*="Ghost"]') ||
          doc.querySelector('link[href*="ghost.org"]'),
      ),
  },

  // UI & Styling
  {
    name: 'Tailwind CSS',
    category: 'ui',
    test: (doc) =>
      Boolean(
        doc.querySelector(
          '[class*="flex-col"], [class*="grid-cols-"], [class*="items-center"], [class*="justify-between"]',
        ) && doc.querySelector('script[src*="tailwindcss"], link[href*="tailwind"]'),
      ),
  },

  // Analytics & Observability
  {
    name: 'Google Analytics',
    category: 'analytics',
    test: (doc) =>
      Boolean(doc.querySelector('script[src*="googletagmanager.com"], script[src*="google-analytics.com"]')),
  },
  {
    name: 'PostHog',
    category: 'analytics',
    test: (doc, win) =>
      Boolean(
        (win as unknown as { posthog?: unknown }).posthog !== undefined ||
          doc.querySelector(
            'script[src*="posthog.com"], script[src*="us.i.posthog.com"], script[src*="eu.i.posthog.com"]',
          ),
      ),
  },
  {
    name: 'Plausible',
    category: 'analytics',
    test: (doc, win) =>
      Boolean(
        (win as unknown as { plausible?: unknown }).plausible !== undefined ||
          doc.querySelector('script[src*="plausible.io"]'),
      ),
  },
  {
    name: 'Mixpanel',
    category: 'analytics',
    test: (doc, win) =>
      Boolean(
        (win as unknown as { mixpanel?: unknown }).mixpanel !== undefined ||
          doc.querySelector('script[src*="cdn.mxpnl.com"]'),
      ),
  },
  {
    name: 'Sentry',
    category: 'observability',
    test: (doc, win) =>
      Boolean(
        (win as unknown as { Sentry?: unknown }).Sentry !== undefined ||
          doc.querySelector('script[src*="sentry.io"], script[src*="sentry-cdn.com"]'),
      ),
  },
  {
    name: 'Cloudflare',
    category: 'cdn',
    test: (doc) =>
      Boolean(
        doc.querySelector('script[src*="cloudflareinsights.com"], script[src*="challenges.cloudflare.com"]'),
      ),
  },
];

export function detectTech(doc: Document = document, win: Window = window): TechItem[] {
  const detected: TechItem[] = [];
  const seen = new Set<string>();

  for (const rule of TECH_RULES) {
    try {
      if (rule.test(doc, win) && !seen.has(rule.name)) {
        seen.add(rule.name);
        detected.push({ name: rule.name, category: rule.category });
      }
    } catch {
      // Ignore security/cross-origin probe exceptions
    }
  }

  return detected;
}
