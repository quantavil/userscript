import { describe, expect, test } from 'bun:test';
import { defaults, readFavorites, addFavorite, removeFavorite } from '../src/favorites/model';

describe('favorites', () => {
  test('starts with the requested services and preserves an intentionally empty list', () => {
    expect(readFavorites(null).map(item => item.id)).toEqual(['esanchit', 'shipping-bill', 'file-upload']);
    expect(readFavorites('[]')).toEqual([]);
  });
  test('rejects unsafe and malformed saved entries', () => {
    expect(readFavorites(JSON.stringify([{ id: 'x', label: 'X', url: 'javascript:alert(1)' }]))).toEqual([]);
    expect(readFavorites('broken')).toEqual(defaults);
  });
  test('adds a portal page once and removes by id', () => {
    const page = { id: 'custom', label: 'My page', url: 'https://foservices.icegate.gov.in/#/example' };
    const list = addFavorite(defaults, page);
    expect(addFavorite(list, page)).toEqual(list);
    expect(removeFavorite(list, 'custom')).toEqual(defaults);
  });
});
