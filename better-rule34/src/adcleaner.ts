import { isAdCard } from './parse';

/** Known advertising containers on Rule34Video. Sponsored cards without a match are caught by isAdCard. */
const AD_SELECTOR = [
  '.spot-thumb',
  '.spots',
  '.sidebar_ad_buttons',
  '.footer_spots',
  '.panel_header--promo',
  'ins.adsbyjuicy',
  'iframe[src*="sadbaguette"]',
  'iframe[src*="traffic"]',
  'iframe[src*="adserver"]',
  'iframe[src*="/ads/"]',
  'iframe[src*="juicy"]',
  'iframe[src*="gentlefieldpattern"]',
  'iframe[src*="trialhd"]',
  '.item.thumb a[href*="/v1/d.php"]',
].join(',');

/** Removes ads from `root`. A match inside a video card removes the whole card. */
export function cleanAds(root: Element | Document = document): void {
  for (const el of root.querySelectorAll(AD_SELECTOR)) (el.closest('.item.thumb') ?? el).remove();
  for (const thumb of root.querySelectorAll<HTMLElement>('.item.thumb')) {
    if (isAdCard(thumb)) thumb.remove();
  }
}
