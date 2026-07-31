import { expect, test, describe } from "bun:test";
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

  test("parses ordered lists and merges adjacent blocks", () => {
    expect(formatMarkdownToHtml("1. Item 1\n2. Item 2\n3. Item 3")).toBe("<ol><li>Item 1</li><li>Item 2</li><li>Item 3</li></ol>");
  });

  test("strips markdown code block wrapper lines", () => {
    expect(formatMarkdownToHtml("```html\n<p>Hello</p>\n```")).toBe("<p>Hello</p>");
  });

  test("converts newlines to breaks and cleans up adjacent block elements", () => {
    expect(formatMarkdownToHtml("Line 1\nLine 2\n<ul>\n<li>Item</li>\n</ul>\nLine 3")).toBe("Line 1<br>Line 2<ul><li>Item</li></ul>Line 3");
  });
});

describe("sanitizeHtml", () => {
  test("returns original string when in non-browser environment without DOMParser", () => {
    expect(sanitizeHtml("<div>test</div>")).toBe("<div>test</div>");
  });

  test("properly sanitizes html if DOMParser is mocked", () => {
    // Mock simple DOMParser/Node for environment
    const originalDOMParser = globalThis.DOMParser;
    const originalNode = globalThis.Node;
    const originalWindow = globalThis.window;

    globalThis.Node = {
      ELEMENT_NODE: 1
    } as any;

    class MockNode {
      nodeType: number;
      tagName: string;
      attributes: { name: string; value: string }[] = [];
      childNodes: MockNode[] = [];
      textContent: string = "";

      constructor(tagName: string, nodeType = 1) {
        this.tagName = tagName.toUpperCase();
        this.nodeType = nodeType;
      }

      get innerHTML(): string {
        if (this.nodeType === 3) return this.textContent;
        const attrStr = this.attributes.map(a => `${a.name}="${a.value}"`).join(" ");
        const tag = this.tagName.toLowerCase();
        const children = this.childNodes.map(c => c.innerHTML).join("");
        return `<${tag}${attrStr ? " " + attrStr : ""}>${children}</${tag}>`;
      }

      removeAttribute(name: string) {
        this.attributes = this.attributes.filter(a => a.name !== name);
      }

      replaceWith(newNode: MockNode) {
        this.tagName = newNode.tagName;
        this.nodeType = newNode.nodeType;
        this.textContent = newNode.textContent;
        this.childNodes = [];
        this.attributes = [];
      }
    }

    globalThis.DOMParser = class {
      parseFromString(html: string, type: string) {
        const body = new MockNode("body");
        
        if (html.includes("<script")) {
          const script = new MockNode("script");
          script.textContent = "alert(1)";
          body.childNodes.push(script);
        } else if (html.includes("img")) {
          const img = new MockNode("img");
          img.attributes.push({ name: "src", value: "x" });
          img.attributes.push({ name: "onerror", value: "alert(1)" });
          body.childNodes.push(img);
        } else if (html.includes("javascript:") || html.replace(/[\x00-\x20\s]/g, '').includes("javascript:")) {
          const a = new MockNode("a");
          const val = html.replace(/[\x00-\x20\s]/g, '').includes("javascript:") ? "java\nscript:alert(1)" : "javascript:alert(1)";
          a.attributes.push({ name: "href", value: val });
          body.childNodes.push(a);
        } else {
          const div = new MockNode("div");
          if (html.includes("style")) {
            div.attributes.push({ name: "style", value: "color: red" });
          }
          const txt = new MockNode("#text", 3);
          txt.textContent = "test";
          div.childNodes.push(txt);
          body.childNodes.push(div);
        }

        return {
          body,
          createTextNode(text: string) {
            const txt = new MockNode("#text", 3);
            txt.textContent = text;
            return txt;
          }
        };
      }
    } as any;
    globalThis.window = {} as any;

    try {
      expect(sanitizeHtml("<div>test</div>")).toBe("<body><div>test</div></body>");
      expect(sanitizeHtml("<script>alert(1)</script>")).toBe("<body>alert(1)</body>");
      expect(sanitizeHtml("<img src=x onerror=alert(1)>")).toBe("<body></body>"); // img not allowed
      expect(sanitizeHtml('<a href="javascript:alert(1)">Link</a>')).toBe("<body><a></a></body>"); // href starting with javascript: removed
      expect(sanitizeHtml('<a href="java\nscript:alert(1)">Link</a>')).toBe("<body><a></a></body>"); // bypass link removed
      expect(sanitizeHtml('<div style="color: red">test</div>')).toBe("<body><div>test</div></body>"); // style attribute removed
    } finally {
      globalThis.DOMParser = originalDOMParser;
      globalThis.Node = originalNode;
      globalThis.window = originalWindow;
    }
  });
});

