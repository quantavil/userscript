import { expect, test, describe } from 'bun:test';
import { FilterPanel } from '../src/ui/filterPanel';
import { Badges } from '../src/ui/badges';
import { PerformerProfile } from '../src/types';

describe('FilterPanel', () => {
  test('getActiveFiltersCount counts non-default filters', () => {
    const defaultFilters = {
      minAge: 18,
      maxAge: 70,
      minHeight: 130,
      maxHeight: 220,
      minRating: 0,
      minFavorites: 0,
      boobs: 'all' as const,
      professionFilter: 'all' as const,
      ethnicities: [],
      hairColors: [],
      eyeColors: [],
      cupSizes: [],
      performances: [],
      searchQuery: ''
    };

    expect(FilterPanel.getActiveFiltersCount(defaultFilters)).toBe(0);

    const activeFilters = {
      ...defaultFilters,
      minAge: 25,
      searchQuery: 'Sydney',
      boobs: 'natural' as const
    };
    expect(FilterPanel.getActiveFiltersCount(activeFilters)).toBe(3);
  });
});

describe('Badges', () => {
  test('renders boob badge even when cup size is null', () => {
    const thumb = document.createElement('div');
    thumb.className = 'thumbshot';
    const a = document.createElement('a');
    a.href = '/babe/Test_Babe';
    thumb.appendChild(a);

    const profile: PerformerProfile = {
      name: 'Test Babe',
      url: '/babe/Test_Babe',
      scrapedAt: Date.now(),
      personal: { age: 24, nationality: 'American', countryCode: 'US', ethnicity: null, sexuality: null, professions: [] },
      body: { hairColor: null, eyeColor: null, heightCm: null, weightKg: null, bodyType: null, measurements: null, bust: null, waist: null, hips: null, cup: null, boobs: 'Natural' },
      performances: { solo: [], girlGirl: [], boyGirl: [] },
      rating: { score: null, votes: null, favorites: null }
    };

    Badges.render(thumb, profile);

    const badgeBottomLeft = a.querySelector('.bp-badge-bottom-left');
    expect(badgeBottomLeft).not.toBeNull();
    expect(badgeBottomLeft?.textContent).toContain('Nat');

    const badgeTopLeft = a.querySelector('.bp-badge-top-left');
    expect(badgeTopLeft?.textContent).toBe('24y');

    const badgeBottomRight = a.querySelector('.bp-badge-bottom-right');
    expect(badgeBottomRight?.textContent).toBe('US');
  });
});
