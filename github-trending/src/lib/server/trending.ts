import { load } from 'cheerio';

export const LANGUAGES = [
  'unknown',
  'javascript',
  'typescript',
  'python',
  'rust',
  'zig',
  'html',
  'css',
  'svelte'
] as const;

export const SINCE_VALUES = ['daily', 'weekly'] as const;

export type LanguageSlug = (typeof LANGUAGES)[number];
export type Since = (typeof SINCE_VALUES)[number];

type ParsedRepo = {
  id: string;
  owner: string;
  name: string;
  url: string;
  description: string;
  primaryLanguage: string;
  stars: number;
  forks: number;
  starsPeriod: number;
};

export type RepoAppearance = {
  language: LanguageSlug;
  since: Since;
};

export type RepoEntry = ParsedRepo & {
  appearances: RepoAppearance[];
  appearanceCount: number;
};

export type LanguageSection = {
  slug: LanguageSlug;
  label: string;
  repos: RepoEntry[];
  repoCount: number;
  dailyCount: number;
  weeklyCount: number;
  error?: string;
};

export type TrendingDataset = {
  fetchedAt: string;
  totalRepos: number;
  totalAppearances: number;
  sections: LanguageSection[];
  warnings: string[];
};

const CACHE_TTL_MS = 10 * 60 * 1000;

const LANGUAGE_LABELS: Record<LanguageSlug, string> = {
  unknown: 'Unknown',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  rust: 'Rust',
  zig: 'Zig',
  html: 'HTML',
  css: 'CSS',
  svelte: 'Svelte'
};

let memoryCache: { expiresAt: number; value: TrendingDataset } | null = null;

export function normalizeLanguage(value: string | null): LanguageSlug | 'all' {
  if (!value || value === 'all') return 'all';
  return (LANGUAGES as readonly string[]).includes(value) ? (value as LanguageSlug) : 'all';
}

export async function getTrendingDataset(
  options: { force?: boolean } = {}
): Promise<TrendingDataset> {
  const now = Date.now();

  if (!options.force && memoryCache && memoryCache.expiresAt > now) {
    return memoryCache.value;
  }

  const pageResults = await Promise.all(
    LANGUAGES.flatMap((language) =>
      SINCE_VALUES.map((since) => fetchTrendingPage(language, since))
    )
  );

  const repoMap = new Map<string, RepoEntry>();
  const idsByLanguage = new Map<LanguageSlug, Set<string>>();
  const errorsByLanguage = new Map<LanguageSlug, string[]>();

  for (const language of LANGUAGES) {
    idsByLanguage.set(language, new Set());
    errorsByLanguage.set(language, []);
  }

  for (const result of pageResults) {
    if (result.error) {
      errorsByLanguage.get(result.language)?.push(result.error);
    }

    for (const repo of result.repos) {
      const appearance: RepoAppearance = {
        language: result.language,
        since: result.since
      };

      const existing = repoMap.get(repo.id);

      if (!existing) {
        repoMap.set(repo.id, {
          ...repo,
          appearances: [appearance],
          appearanceCount: 1
        });
      } else {
        const exists = existing.appearances.some(
          (item) =>
            item.language === appearance.language && item.since === appearance.since
        );

        if (!exists) {
          existing.appearances.push(appearance);
          existing.appearanceCount = existing.appearances.length;
        }

        if (!existing.description && repo.description) existing.description = repo.description;
        if (!existing.primaryLanguage && repo.primaryLanguage) {
          existing.primaryLanguage = repo.primaryLanguage;
        }

        existing.stars = Math.max(existing.stars, repo.stars);
        existing.forks = Math.max(existing.forks, repo.forks);
        existing.starsPeriod = Math.max(existing.starsPeriod, repo.starsPeriod);
      }

      idsByLanguage.get(result.language)?.add(repo.id);
    }
  }

  const sections: LanguageSection[] = LANGUAGES.map((language) => {
    const ids = [...(idsByLanguage.get(language) ?? new Set<string>())];
    const repos = ids
      .map((id) => repoMap.get(id))
      .filter((repo): repo is RepoEntry => Boolean(repo))
      .sort(sortRepos);

    const languageErrors = uniqueStrings(errorsByLanguage.get(language) ?? []);

    return {
      slug: language,
      label: LANGUAGE_LABELS[language],
      repos,
      repoCount: repos.length,
      dailyCount: repos.filter((repo) =>
        repo.appearances.some(
          (appearance) => appearance.language === language && appearance.since === 'daily'
        )
      ).length,
      weeklyCount: repos.filter((repo) =>
        repo.appearances.some(
          (appearance) => appearance.language === language && appearance.since === 'weekly'
        )
      ).length,
      error: languageErrors.length ? languageErrors.join(' | ') : undefined
    };
  });

  const dataset: TrendingDataset = {
    fetchedAt: new Date().toISOString(),
    totalRepos: repoMap.size,
    totalAppearances: [...repoMap.values()].reduce(
      (sum, repo) => sum + repo.appearances.length,
      0
    ),
    sections,
    warnings: sections
      .filter((section) => section.error)
      .map((section) => `${section.label}: ${section.error}`)
  };

  memoryCache = {
    expiresAt: now + CACHE_TTL_MS,
    value: dataset
  };

  return dataset;
}

async function fetchTrendingPage(language: LanguageSlug, since: Since) {
  const url = `https://github.com/trending/${encodeURIComponent(language)}?since=${since}`;

  try {
    const response = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'no-cache',
        'user-agent': 'design-taste-frontend/0.1'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      return {
        language,
        since,
        repos: [] as ParsedRepo[],
        error: `${since}: HTTP ${response.status}`
      };
    }

    const finalPath = new URL(response.url).pathname.toLowerCase();
    const expectedPath = `/trending/${language}`;

    if (finalPath !== expectedPath) {
      return {
        language,
        since,
        repos: [] as ParsedRepo[],
        error: `${since}: GitHub did not resolve the "${language}" slug`
      };
    }

    const html = await response.text();
    const repos = parseTrendingHtml(html);

    if (repos.length === 0) {
      return {
        language,
        since,
        repos,
        error: `${since}: parsed zero repositories`
      };
    }

    return {
      language,
      since,
      repos
    };
  } catch (error) {
    return {
      language,
      since,
      repos: [] as ParsedRepo[],
      error: `${since}: ${toErrorMessage(error)}`
    };
  }
}

function parseTrendingHtml(html: string): ParsedRepo[] {
  const $ = load(html);
  const rows = $('article.Box-row').toArray();
  const repos: ParsedRepo[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const repoLink = $(row).find('h2 a').first();
    const href = repoLink.attr('href');

    if (!href) continue;

    const [owner, name] = href.replace(/^\/+|\/+$/g, '').split('/');

    if (!owner || !name) continue;

    const id = `${owner}/${name}`.toLowerCase();
    if (seen.has(id)) continue;
    seen.add(id);

    const statTexts = $(row)
      .find('span, a')
      .toArray()
      .map((element) => cleanText($(element).text()))
      .filter(Boolean);

    const starsPeriodText =
      statTexts.find(
        (text) => /\bstars\b/i.test(text) && /\b(today|week|month)\b/i.test(text)
      ) ?? '';

    repos.push({
      id,
      owner,
      name,
      url: `https://github.com/${owner}/${name}`,
      description: cleanText($(row).find('p').first().text()),
      primaryLanguage: cleanText(
        $(row).find('[itemprop="programmingLanguage"]').first().text()
      ),
      stars: parseCount($(row).find('a[href$="/stargazers"]').first().text()),
      forks: parseCount($(row).find('a[href$="/forks"]').first().text()),
      starsPeriod: parseCount(starsPeriodText)
    });
  }

  return repos;
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function parseCount(value: string): number {
  const normalized = value.toLowerCase().replace(/\s+/g, ' ').trim();
  const match = normalized.match(/(\d[\d,.]*)([km])?/i);

  if (!match) return 0;

  const base = Number.parseFloat(match[1].replace(/,/g, ''));
  if (Number.isNaN(base)) return 0;

  const suffix = match[2]?.toLowerCase();

  if (suffix === 'm') return Math.round(base * 1_000_000);
  if (suffix === 'k') return Math.round(base * 1_000);

  return Math.round(base);
}

function sortRepos(a: RepoEntry, b: RepoEntry): number {
  return (
    b.appearanceCount - a.appearanceCount ||
    b.stars - a.stars ||
    b.starsPeriod - a.starsPeriod ||
    a.name.localeCompare(b.name)
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unknown fetch error';
}
