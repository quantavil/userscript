import { expect, test, describe } from "vite-plus/test";
import { cleanNumber, fmtPrice, formatMarkdownToHtml, sanitizeHtml } from "../src/utils/formatters";

describe("cleanNumber", () => {
  test("parses simple price", () => {
    expect(cleanNumber("₹500")).toBe(500);
  });

  test("parses price with commas (Indian format)", () => {
    expect(cleanNumber("₹1,299")).toBe(1299);
  });

  test("parses price with commas and decimals", () => {
    expect(cleanNumber("₹1,299.50")).toBe(1299.5);
  });

  test("returns null for empty string", () => {
    expect(cleanNumber("")).toBeNull();
  });

  test("returns null for non-numeric string", () => {
    expect(cleanNumber("Free")).toBeNull();
  });

  test("returns null for multiple decimal points", () => {
    expect(cleanNumber("₹1,299.50.99")).toBeNull();
  });

  test("parses price with spaces", () => {
    expect(cleanNumber("₹ 164.00")).toBe(164);
  });

  test("parses plain number", () => {
    expect(cleanNumber("242")).toBe(242);
  });
});

describe("fmtPrice", () => {
  test("formats with rupee symbol", () => {
    expect(fmtPrice(500)).toBe("₹500");
  });

  test("limits to 2 decimal places", () => {
    const result = fmtPrice(33.333);
    expect(result).toContain("₹");
    expect(result).toContain("33.33");
  });
});

describe("cleanNumber (additional edge cases)", () => {
  test("returns null for currency symbol only", () => {
    expect(cleanNumber("₹")).toBeNull();
  });

  test("returns null for negative number", () => {
    expect(cleanNumber("-500")).toBeNull();
  });

  test("returns null for whitespace only", () => {
    expect(cleanNumber("   ")).toBeNull();
  });
});

test("renders Markdown using real DOM semantics", () => {
  const html = formatMarkdownToHtml(
    "# Heading\n\n**Bold** and *em*\n\n- One\n- Two\n\n| A | B |\n| --- | --- |\n| 1 | 2 |",
  );
  const doc = new DOMParser().parseFromString(html, "text/html");
  expect(doc.querySelector("h1")?.textContent).toBe("Heading");
  expect(doc.querySelector("strong")?.textContent).toBe("Bold");
  expect(doc.querySelectorAll("li")).toHaveLength(2);
  expect(doc.querySelectorAll("td")).toHaveLength(2);
});
test.each([
  "<img src=x onerror=alert(1)>",
  "<script>alert(1)</script>",
  "<svg onload=alert(1)>",
  '<a href="java&#10;script:alert(1)" onclick="bad()">link</a>',
  '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=alert(1)>">',
])("sanitizes hostile markup %s", (payload) => {
  const doc = new DOMParser().parseFromString(sanitizeHtml(payload), "text/html");
  expect(doc.querySelector("script,img,svg,math,[onclick],[onerror]")).toBeNull();
  expect(doc.querySelector("a")?.getAttribute("href") ?? "").not.toContain("script:");
});
test("hardens links while preserving tables and raw text rendering", () => {
  const html = sanitizeHtml(
    '<table><tr><td>Okay</td></tr></table><a target="_blank" href="https://example.com">link</a>',
  );
  const doc = new DOMParser().parseFromString(html, "text/html");
  expect(doc.querySelector("td")?.textContent).toBe("Okay");
  expect(doc.querySelector("a")?.rel).toBe("noopener noreferrer");
});
