import { expect, test, describe } from "bun:test";
import { cleanProductUrl } from "../src/utils/urlCleaner";

describe("cleanProductUrl — Amazon", () => {
  test("extracts ASIN and builds canonical URL", () => {
    const raw = "https://www.amazon.in/Some-Product/dp/B08N5WRWNW/ref=sr_1_1?keywords=test&qid=1234";
    expect(cleanProductUrl(raw, "Amazon")).toBe("https://www.amazon.in/dp/B08N5WRWNW");
  });

  test("handles ASIN-only path", () => {
    expect(cleanProductUrl("/dp/B08N5WRWNW", "Amazon")).toBe("https://www.amazon.in/dp/B08N5WRWNW");
  });

  test("returns origin+pathname if no ASIN found", () => {
    const raw = "https://www.amazon.in/s?k=headphones";
    expect(cleanProductUrl(raw, "Amazon")).toBe("https://www.amazon.in/s");
  });
});

describe("cleanProductUrl — Flipkart", () => {
  test("extracts PID and builds canonical URL", () => {
    const raw = "https://www.flipkart.com/some-product/p/itmXYZ123?pid=MOBXYZ123&lid=something";
    expect(cleanProductUrl(raw, "Flipkart")).toBe("https://www.flipkart.com/some-product/p/itmXYZ123?pid=MOBXYZ123");
  });

  test("returns path-only URL when no PID", () => {
    const raw = "https://www.flipkart.com/some-product/p/itmXYZ123";
    expect(cleanProductUrl(raw, "Flipkart")).toBe("https://www.flipkart.com/some-product/p/itmXYZ123");
  });
});

describe("cleanProductUrl — edge cases", () => {
  test("returns empty string for empty input", () => {
    expect(cleanProductUrl("", "Amazon")).toBe("");
  });

  test("resolves relative path against fallback base", () => {
    // URL("not-a-url", "https://dummy.base") resolves without throwing
    expect(cleanProductUrl("not-a-url", "Amazon")).toBe("https://dummy.base/not-a-url");
  });

  test("returns origin+pathname for unknown platform", () => {
    const raw = "https://example.com/product?ref=123";
    expect(cleanProductUrl(raw, "Other")).toBe("https://example.com/product");
  });
});
