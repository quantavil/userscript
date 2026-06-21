import { expect, test, describe } from "bun:test";
import { cleanNumber, fmtPrice, formatMarkdownToHtml } from "../src/utils/formatters";


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

describe("formatMarkdownToHtml", () => {
  test("parses bold and italics", () => {
    expect(formatMarkdownToHtml("Hello **world** and *everyone*")).toBe("Hello <strong>world</strong> and <em>everyone</em>");
  });

  test("parses headings", () => {
    expect(formatMarkdownToHtml("# Heading 1\n## Heading 2\n### Heading 3")).toBe("<h3 class=\"aiw-chat-h3\">Heading 1</h3><h4 class=\"aiw-chat-h4\">Heading 2</h4><h5 class=\"aiw-chat-h5\">Heading 3</h5>");
  });

  test("parses lists and merges adjacent blocks", () => {
    expect(formatMarkdownToHtml("- Item 1\n- Item 2\n* Item 3")).toBe("<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>");
  });

  test("strips markdown code block wrapper lines", () => {
    expect(formatMarkdownToHtml("```html\n<p>Hello</p>\n```")).toBe("<p>Hello</p>");
  });

  test("converts newlines to breaks and cleans up adjacent block elements", () => {
    expect(formatMarkdownToHtml("Line 1\nLine 2\n<ul>\n<li>Item</li>\n</ul>\nLine 3")).toBe("Line 1<br>Line 2<ul><li>Item</li></ul>Line 3");
  });
});

