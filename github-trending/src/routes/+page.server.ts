import type { PageServerLoad } from './$types';
import { getTrendingDataset, normalizeLanguage } from '$lib/server/trending';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
  const selectedLanguage = normalizeLanguage(url.searchParams.get('language'));
  const refresh = url.searchParams.get('refresh') === '1';

  const dataset = await getTrendingDataset({ force: refresh });

  setHeaders({
    'cache-control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=60'
  });

  return {
    ...dataset,
    selectedLanguage,
    visibleSections:
      selectedLanguage === 'all'
        ? dataset.sections
        : dataset.sections.filter((section) => section.slug === selectedLanguage)
  };
};
