/** Canonical product identity without referral parameters or marketplace conversion. */
export function cleanProductUrl(rawUrl: string, platform: string): string {
  if (!rawUrl) return "";
  try {
    const base =
      platform === "Amazon"
        ? "https://www.amazon.in"
        : platform === "Flipkart"
          ? "https://www.flipkart.com"
          : "https://dummy.base";
    const url = new URL(rawUrl, base);
    if (platform === "Amazon" && /^(www\.)?amazon\.(in|com)$/.test(url.hostname)) {
      const asin = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i)?.[1];
      if (asin) return `https://${url.hostname}/dp/${asin.toUpperCase()}`;
    }
    if (platform === "Flipkart" && /^(www\.)?flipkart\.com$/.test(url.hostname)) {
      const pid = url.searchParams.get("pid");
      return `https://${url.hostname}${url.pathname}${pid ? `?pid=${encodeURIComponent(pid)}` : ""}`;
    }
    return url.origin + url.pathname;
  } catch {
    return rawUrl;
  }
}

export function amazonId(asin: string, hostname: string): string {
  return `${hostname === "www.amazon.com" || hostname === "amazon.com" ? "amz_us_" : "amz_"}${asin.toUpperCase()}`;
}

export function getPriceHistoryUrl(productUrl: string): string | null {
  try {
    const url = new URL(productUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const amazon = /^(www\.)?amazon\.(in|com)$/.test(url.hostname);
    const flipkart = /^(www\.)?flipkart\.com$/.test(url.hostname);
    if (amazon && !/\/(?:dp|gp\/product)\/[A-Z0-9]{10}(?:\/|$)/i.test(url.pathname)) return null;
    if (flipkart && !/\/p\/[^/]+/.test(url.pathname)) return null;
    if (!amazon && !flipkart) return null;
    return `https://pricehistory.app/?search=${encodeURIComponent(cleanProductUrl(url.href, amazon ? "Amazon" : "Flipkart"))}`;
  } catch {
    return null;
  }
}
