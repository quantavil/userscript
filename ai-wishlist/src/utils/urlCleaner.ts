/**
 * Strips tracking/referral parameters from e-commerce URLs to create 
 * clean, persistent canonical links for the wishlist.
 */
export function cleanProductUrl(rawUrl: string, platform: string): string {
  if (!rawUrl) return '';
  
  try {
    const urlObj = new URL(rawUrl, 'https://dummy.base');
    
    if (platform === 'Amazon') {
      // Extract ASIN from path like /dp/ASIN/...
      const asinMatch = urlObj.pathname.match(/\/dp\/([A-Z0-9]{10})/i);
      if (asinMatch && asinMatch[1]) {
        return `https://www.amazon.in/dp/${asinMatch[1]}`;
      }
    }
    
    if (platform === 'Flipkart') {
      // Extract path and PID from ?pid= query param
      const pid = urlObj.searchParams.get('pid');
      const cleanPath = urlObj.pathname;
      if (pid) {
        return `https://www.flipkart.com${cleanPath}?pid=${pid}`;
      }
      return `https://www.flipkart.com${cleanPath}`;
    }

    // Fallback: just return the origin + pathname
    return urlObj.origin + urlObj.pathname;
  } catch {
    return rawUrl;
  }
}
