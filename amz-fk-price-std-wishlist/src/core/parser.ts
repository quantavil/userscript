import type { WeightExtract, RateResult, ParsedData } from './types';
import { fmtPrice } from '../utils/formatters';

// Order matters: longer alternatives first so regex doesn't greedily match short prefixes
const UNIT_REGEX_STR = '(capsules?|tablets?|sachets?|strips?|grams?|litres?|liters?|dozen|pair|kg|gm|ml|dz|g|l)';

// Words that, when following a number+unit, indicate nutritional info or non-product context
const SKIP_FOLLOWING = /^\s*[-]?\s*(shaped|type|protein|protien|carb|fat|kcal|calorie|scoop|serving|serve|glutamine|arginine|creatine|carnitine|citrulline|lysine|leucine|valine|isoleucine|taurine|tyrosine|theanine|glycine)\b/i;

// Pack count patterns that are false positives (fitness products etc.)
const FALSE_PACK_CONTEXT = /\b(?:6|8|4)\s*pack\s*abs\b/i;

/** Normalise a raw unit string to its canonical form and apply multipliers */
function normaliseUnit(rawUnit: string, val: number): { val: number; unit: string } {
  const u = rawUnit.toLowerCase();
  if (u === 'kg') return { val: val * 1000, unit: 'g' };
  if (u === 'gm' || u === 'gram' || u === 'grams') return { val, unit: 'g' };
  if (u === 'l' || u === 'litre' || u === 'litres' || u === 'liter' || u === 'liters') return { val: val * 1000, unit: 'ml' };
  if (u === 'tablet' || u === 'tablets') return { val, unit: 'tablet' };
  if (u === 'capsule' || u === 'capsules') return { val, unit: 'capsule' };
  if (u === 'sachet' || u === 'sachets') return { val, unit: 'sachet' };
  if (u === 'strip' || u === 'strips') return { val, unit: 'strip' };
  if (u === 'dz' || u === 'dozen') return { val: val * 12, unit: 'item' };
  if (u === 'pair') return { val: val * 2, unit: 'item' };
  return { val, unit: u };
}

/** Extract all (value, unit) pairs from text, filtering out nutritional context */
export function extractWeights(text: string): WeightExtract[] {
  const results: WeightExtract[] = [];
  const regex = new RegExp(`([\\d.,]+)\\s*${UNIT_REGEX_STR}\\b`, 'gi');
  let m;
  while ((m = regex.exec(text)) !== null) {
    const rawNum = m[1]!;
    const rawUnit = m[2]!;

    // For bare 'l'/'L', reject if preceded/followed by a letter (e.g. "L-Glutamine", "xl")
    if (rawUnit.toLowerCase() === 'l') {
      const charBefore = m.index > 0 ? text[m.index + rawNum.length - 1] : '';
      const charAfter = text[m.index + m[0].length] || '';
      // If what follows is a hyphen or letter, skip (e.g. "250 L-Glutamine")
      if (/[a-zA-Z-]/.test(charAfter)) continue;
    }

    // Check what follows the match to filter out nutritional values
    const after = text.substring(m.index + m[0].length, m.index + m[0].length + 30);
    if (SKIP_FOLLOWING.test(after)) continue;

    // Parse number: strip commas first
    const val = parseFloat(rawNum.replace(/,/g, ''));
    if (isNaN(val) || val <= 0) continue;
    const norm = normaliseUnit(rawUnit, val);
    results.push(norm);
  }
  return results;
}

export function computeRate(price: number, totalValue: number, unit: string): RateResult | null {
  if (totalValue <= 0 || !unit) return null;

  if (unit === 'g' || unit === 'ml') {
    const per100 = (price / totalValue) * 100;
    return { text: fmtPrice(per100) + ' / 100 ' + unit, isItemRate: false };
  }
  // For items, tablets, sachets — show per-unit rate
  const perUnit = price / totalValue;
  return { text: fmtPrice(perUnit) + ' / ' + unit, isItemRate: true };
}

/** Parse "X x Y unit" or "Y unit x X" multi-pack patterns */
export function parseMultiPackText(text: string): ParsedData | null {
  const regex1 = new RegExp(`(\\d+)\\s*[x×]\\s*([\\d.,]+)\\s*${UNIT_REGEX_STR}\\b`, 'i');
  let multi = text.match(regex1);
  if (multi) {
    const itemCount = parseInt(multi[1]!);
    const perItemVal = parseFloat(multi[2]!.replace(/,/g, ''));
    const norm = normaliseUnit(multi[3]!, itemCount * perItemVal);
    return { totalValue: norm.val, unit: norm.unit, itemCount };
  }

  const regex2 = new RegExp(`([\\d.,]+)\\s*${UNIT_REGEX_STR}\\s*[x×]\\s*(\\d+)\\b`, 'i');
  multi = text.match(regex2);
  if (multi) {
    const itemCount = parseInt(multi[3]!);
    const perItemVal = parseFloat(multi[1]!.replace(/,/g, ''));
    const norm = normaliseUnit(multi[2]!, itemCount * perItemVal);
    return { totalValue: norm.val, unit: norm.unit, itemCount };
  }

  return null;
}

/** Parse "Pack of X", "Set of X", "X Pack", "X Count" */
export function parsePackCount(title: string): number | null {
  // Reject false positives like "6 pack abs"
  if (FALSE_PACK_CONTEXT.test(title)) return null;

  const pack = title.match(/\b(?:pack|set)\s*of\s*(\d+)\b/i) || title.match(/\b(\d+)\s*(?:pack|count|pcs|pieces?)\b/i);
  return pack ? parseInt(pack[1]!) : null;
}

export function parseTitleToRate(price: number, title: string): RateResult | null {
  // 1. Try multi-pack pattern first
  const multiPack = parseMultiPackText(title);
  if (multiPack && multiPack.totalValue > 0 && multiPack.unit) {
    const rate = computeRate(price, multiPack.totalValue, multiPack.unit);
    if (rate) return rate;
  }

  // 2. Detect pack/set count
  let itemCount = parsePackCount(title) ?? 1;

  // 3. Extract weights from title
  const weights = extractWeights(title);

  if (weights.length === 1) {
    const w = weights[0]!;
    const totalValue = w.val * itemCount;
    const unit = w.unit;
    const rate = computeRate(price, totalValue, unit);
    if (rate) return rate;
  } else if (weights.length > 1) {
    const firstUnit = weights[0]!.unit;
    if (weights.every(w => w.unit === firstUnit)) {
      const totalValue = weights.reduce((s, w) => s + w.val, 0) * itemCount;
      const rate = computeRate(price, totalValue, firstUnit);
      if (rate) return rate;
    }
  }

  // 4. Fallback: per-item if pack count > 1 but no weight info
  if (itemCount > 1) {
    const perItem = price / itemCount;
    return {
      text: fmtPrice(perItem) + ' / item',
      isItemRate: true,
    };
  }

  return null;
}
