import { amazonId } from "../utils/urlCleaner";
import { currencyFor } from "./pricing";
import { hasCurrencyMismatch, parsePriceForCurrency } from "../utils/formatters";
import type { WishlistItem } from "./types";

function isProductDetailsPage(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  if (hostname.includes("amazon.")) {
    return /\/(dp|gp\/product)\/[A-Z0-9]{10}/i.test(pathname);
  }
  if (hostname.includes("flipkart.com")) {
    return /\/p\//.test(pathname);
  }
  return false;
}

export function getProductInfoFromSchema(): {
  title?: string;
  price?: number;
  priceCurrency?: string;
  imageUrl?: string;
} | null {
  {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of Array.from(scripts)) {
      try {
        const text = script.textContent || "";
        if (
          text.includes('"Product"') ||
          text.includes('"@type": "Product"') ||
          text.includes('"@type":"Product"')
        ) {
          const data = JSON.parse(text);

          let product: any = null;
          if (Array.isArray(data)) {
            product = data.find(
              (item) =>
                item && (item["@type"] === "Product" || String(item["@type"]).includes("Product")),
            );
          } else if (data) {
            if (data["@type"] === "Product" || String(data["@type"]).includes("Product")) {
              product = data;
            } else if (data["@graph"] && Array.isArray(data["@graph"])) {
              product = data["@graph"].find(
                (item: any) =>
                  item &&
                  (item["@type"] === "Product" || String(item["@type"]).includes("Product")),
              );
            }
          }

          if (!product) continue;

          const title = product.name || "";
          let price: number | undefined = undefined;
          let priceCurrency: string | undefined;
          if (product.offers) {
            const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
            if (offers && offers.price !== undefined) {
              priceCurrency =
                typeof offers.priceCurrency === "string"
                  ? offers.priceCurrency.toUpperCase()
                  : undefined;
              const p = parsePriceForCurrency(
                String(offers.price),
                currencyFor(window.location.href),
              );
              if (p !== null && p > 0) price = p;
            }
          }
          let imageUrl = "";
          if (product.image) {
            imageUrl = Array.isArray(product.image)
              ? product.image[0]
              : typeof product.image === "object"
                ? product.image.url
                : product.image;
          }

          if (title || price || imageUrl) {
            return { title, price, imageUrl, priceCurrency };
          }
        }
      } catch {
        /* A malformed block must not hide later valid blocks. */
      }
    }
  }
  return null;
}

function cleanAmazonPageTitle(pageTitle: string): string {
  let title = pageTitle;
  if (title.startsWith("Amazon.in: Buy ")) {
    title = title.replace("Amazon.in: Buy ", "");
  }
  const onlineIdx = title.indexOf(" Online at Low Prices");
  if (onlineIdx !== -1) {
    title = title.substring(0, onlineIdx);
  }
  return title.split(": Amazon.in")[0]?.split(":Amazon.in")[0]?.split("|")[0]?.trim() || "";
}

function cleanFlipkartPageTitle(pageTitle: string): string {
  let title = pageTitle;
  const priceIdx = title.indexOf(" Price in India");
  if (priceIdx !== -1) {
    title = title.substring(0, priceIdx);
  }
  const buyIdx = title.indexOf(" - Buy ");
  if (buyIdx !== -1) {
    title = title.substring(0, buyIdx);
  }
  const onlineIdx = title.indexOf(" Online");
  if (onlineIdx !== -1) {
    title = title.substring(0, onlineIdx);
  }
  return title.split("-")[0]?.split("|")[0]?.split(":")[0]?.trim() || "";
}

function scanPriceFromLeafNodes(): number | null {
  const rupeeEls = Array.from(document.querySelectorAll("*")).filter((el) => {
    return (
      el.children.length === 0 &&
      /[₹$]/.test(el.textContent || "") &&
      !el.closest("[data-aiw-owned]")
    );
  }) as HTMLElement[];

  for (const el of rupeeEls) {
    if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
      try {
        const style = window.getComputedStyle(el);
        const decor = style.textDecorationLine || style.textDecoration || "";
        if (decor.includes("line-through")) continue;
      } catch {}
    }
    if (
      el.style.textDecorationLine === "line-through" ||
      el.style.textDecoration === "line-through" ||
      el.getAttribute("style")?.includes("line-through")
    ) {
      continue;
    }
    const val = parsePriceForCurrency(el.textContent || "", currencyFor(window.location.href));
    if (val !== null && val > 0) return val;
  }
  return null;
}

export function getPdpProductInfo(): WishlistItem | null {
  if (typeof window === "undefined") return null;
  const hostname = window.location.hostname;
  const isPDP = isProductDetailsPage();
  if (!isPDP) return null;

  if (hostname.includes("amazon.")) {
    const asinMatch = window.location.pathname.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})/i);
    const asin = asinMatch
      ? asinMatch[2]
      : (document.querySelector("#ASIN") as HTMLInputElement)?.value;
    if (!asin) {
      if (isPDP) console.warn("AI Wishlist: On PDP but ASIN not found");
      return null;
    }

    const schema = getProductInfoFromSchema();
    if (schema?.priceCurrency && schema.priceCurrency !== currencyFor(window.location.href))
      return null;
    const titleEl = document.querySelector("#productTitle");
    const title =
      titleEl?.textContent?.trim() || schema?.title || cleanAmazonPageTitle(document.title);
    if (!title) {
      if (isPDP) console.warn("AI Wishlist: On PDP but title not resolved");
      return null;
    }

    let price = schema?.price || null;
    if (price === null || price <= 0) {
      const priceSelectors = [
        ".apexPriceToPay .a-offscreen",
        ".priceToPay .a-offscreen",
        "#price_inside_buybox",
        "#newBuyBoxPrice",
        "#priceblock_ourprice",
        "#priceblock_dealprice",
      ];
      for (const sel of priceSelectors) {
        const text = document.querySelector(sel)?.textContent;
        if (text) {
          if (hasCurrencyMismatch(text, currencyFor(window.location.href))) return null;
          price = parsePriceForCurrency(text, currencyFor(window.location.href));
          if (price !== null && price > 0) break;
        }
      }
    }
    if (price === null || price <= 0) {
      price = scanPriceFromLeafNodes();
    }
    if (price === null || price <= 0) {
      if (isPDP) console.warn("AI Wishlist: On PDP but price not resolved", { title });
      return null;
    }

    let imageUrl = schema?.imageUrl || "";
    if (!imageUrl) {
      const imgEl = document.querySelector(
        "#landingImage, #imgBlkFront",
      ) as HTMLImageElement | null;
      if (imgEl) {
        imageUrl = imgEl.getAttribute("data-old-hires") || imgEl.getAttribute("src") || "";
        if (!imageUrl || imageUrl.startsWith("data:")) {
          const dynamicJson = imgEl.getAttribute("data-a-dynamic-image");
          if (dynamicJson) {
            try {
              const urls = Object.keys(JSON.parse(dynamicJson));
              if (urls.length > 0) imageUrl = urls[urls.length - 1]!;
            } catch {}
          }
        }
      }
    }

    return {
      id: amazonId(asin, hostname),
      title,
      price,
      imageUrl,
      url: `https://${hostname}/dp/${asin}`,
      platform: "Amazon",
    };
  }

  if (hostname.includes("flipkart.com")) {
    const pid = new URLSearchParams(window.location.search).get("pid");
    if (!pid) {
      if (isPDP) console.warn("AI Wishlist: On PDP but PID not found");
      return null;
    }

    const schema = getProductInfoFromSchema();
    if (schema?.priceCurrency && schema.priceCurrency !== currencyFor(window.location.href))
      return null;
    const titleEl = document.querySelector("h1, .B_NuCI, span.VU-ZEz");
    const title =
      titleEl?.textContent?.trim() || schema?.title || cleanFlipkartPageTitle(document.title);
    if (!title) {
      if (isPDP) console.warn("AI Wishlist: On PDP but title not resolved");
      return null;
    }

    let price = schema?.price || null;
    if (price === null || price <= 0) {
      const priceSelectors = [".Nx9Qxx", "._30jeq3", "._16Jk6d", "._16J5WJ"];
      for (const sel of priceSelectors) {
        const text = document.querySelector(sel)?.textContent;
        if (text) {
          if (hasCurrencyMismatch(text, currencyFor(window.location.href))) return null;
          price = parsePriceForCurrency(text, currencyFor(window.location.href));
          if (price !== null && price > 0) break;
        }
      }
    }
    if (price === null || price <= 0) {
      price = scanPriceFromLeafNodes();
    }
    if (price === null || price <= 0) {
      if (isPDP) console.warn("AI Wishlist: On PDP but price not resolved", { title });
      return null;
    }

    let imageUrl = schema?.imageUrl || "";
    if (!imageUrl) {
      const imgEls = Array.from(document.querySelectorAll("img"));
      const mainImg = imgEls.find((img) => {
        const src = img.getAttribute("src") || "";
        return src.includes("/image/") && !src.includes("/www/") && !src.includes("/promos/");
      });
      if (mainImg) {
        imageUrl = mainImg.getAttribute("src") || "";
      }
    }

    return {
      id: `fk_${pid}`,
      title,
      price,
      imageUrl,
      url: `https://www.flipkart.com${window.location.pathname}?pid=${pid}`,
      platform: "Flipkart",
    };
  }

  return null;
}
