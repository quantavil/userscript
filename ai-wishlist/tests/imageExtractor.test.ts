import { expect, test, describe } from "bun:test";
import { BaseAdapter } from "../src/adapters/BaseAdapter";

class TestAdapter extends BaseAdapter {
  processCards() {}

  // Expose the protected method for testing
  public testGetBestImageUrl(imgEl: HTMLElement | null): string {
    return this.getBestImageUrl(imgEl);
  }
}

// Simple mock element class to simulate basic DOM attributes
class MockElement {
  private attrs: Record<string, string> = {};

  constructor(attrs: Record<string, string> = {}) {
    this.attrs = attrs;
  }

  getAttribute(name: string): string | null {
    return this.attrs[name] !== undefined ? this.attrs[name] : null;
  }

  getAttributeNames(): string[] {
    return Object.keys(this.attrs);
  }
}

describe("getBestImageUrl", () => {
  const adapter = new TestAdapter();

  test("returns empty string for null element", () => {
    expect(adapter.testGetBestImageUrl(null)).toBe("");
  });

  test("extracts data-src attribute if present", () => {
    const el = new MockElement({
      "src": "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "data-src": "https://m.media-amazon.com/images/I/81sqQZ-AOwL._AC_SX148_SY213_QL70_.jpg"
    });
    expect(adapter.testGetBestImageUrl(el as any)).toBe("https://m.media-amazon.com/images/I/81sqQZ-AOwL._AC_SX148_SY213_QL70_.jpg");
  });

  test("extracts data-lazy-src attribute if present", () => {
    const el = new MockElement({
      "src": "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "data-lazy-src": "https://rukminim2.flixcart.com/image/192/240/xif0q/cycle.jpeg"
    });
    expect(adapter.testGetBestImageUrl(el as any)).toBe("https://rukminim2.flixcart.com/image/192/240/xif0q/cycle.jpeg");
  });

  test("extracts highest resolution candidate from srcset", () => {
    const el = new MockElement({
      "src": "https://m.media-amazon.com/images/I/81sqQZ-AOwL._AC_SX148_SY213_QL70_.jpg",
      "srcset": "https://m.media-amazon.com/images/I/81sqQZ-AOwL._AC_SX148_SY213_QL70_.jpg 1x, https://m.media-amazon.com/images/I/81sqQZ-AOwL._AC_SX296_SY426_QL65_.jpg 2x"
    });
    expect(adapter.testGetBestImageUrl(el as any)).toBe("https://m.media-amazon.com/images/I/81sqQZ-AOwL._AC_SX296_SY426_QL65_.jpg");
  });

  test("falls back to src if no lazy load attributes exist", () => {
    const el = new MockElement({
      "src": "https://m.media-amazon.com/images/I/81sqQZ-AOwL._AC_SX148_SY213_QL70_.jpg"
    });
    expect(adapter.testGetBestImageUrl(el as any)).toBe("https://m.media-amazon.com/images/I/81sqQZ-AOwL._AC_SX148_SY213_QL70_.jpg");
  });

  test("falls back to arbitrary data attribute starting with http if src is a placeholder", () => {
    const el = new MockElement({
      "src": "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "data-alternate-url": "https://m.media-amazon.com/images/I/81sqQZ-AOwL.jpg"
    });
    expect(adapter.testGetBestImageUrl(el as any)).toBe("https://m.media-amazon.com/images/I/81sqQZ-AOwL.jpg");
  });
});
