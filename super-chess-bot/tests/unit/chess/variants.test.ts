import { describe, expect, it } from 'vite-plus/test';
import { getVariantDefinition } from '../../../src/chess/variants.js';

describe('shared variant registry', () => {
  it('normalizes standard and Chess960 aliases to orthodox engine identity', () => {
    expect(getVariantDefinition('fromPosition')).toMatchObject({
      id: 'standard',
      rules: 'chess',
      chess960: false,
    });
    expect(getVariantDefinition('standard')).toMatchObject({
      id: 'standard',
      rules: 'chess',
      chess960: false,
    });
    expect(getVariantDefinition('chess')).toMatchObject({
      id: 'standard',
      rules: 'chess',
      chess960: false,
    });
    expect(getVariantDefinition('chess960')).toMatchObject({
      id: 'chess960',
      rules: 'chess',
      chess960: true,
    });
    expect(getVariantDefinition('fischerandom')).toMatchObject({
      id: 'chess960',
      rules: 'chess',
      chess960: true,
    });
    expect(getVariantDefinition()).toMatchObject({ id: 'standard' });
  });

  it('rejects all non-standard and fairy variants', () => {
    expect(getVariantDefinition('threeCheck')).toBeNull();
    expect(getVariantDefinition('3check')).toBeNull();
    expect(getVariantDefinition('kingOfTheHill')).toBeNull();
    expect(getVariantDefinition('crazyhouse')).toBeNull();
    expect(getVariantDefinition('antichess')).toBeNull();
    expect(getVariantDefinition('atomic')).toBeNull();
    expect(getVariantDefinition('horde')).toBeNull();
    expect(getVariantDefinition('racingkings')).toBeNull();
    expect(getVariantDefinition('capablanca')).toBeNull();
    expect(getVariantDefinition('giveaway')).toBeNull();
    expect(getVariantDefinition('unknown')).toBeNull();
  });
});
