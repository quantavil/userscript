import { expect, test, describe } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { parseFlipkartDetails, parseAmazonDetails } from "../src/core/ui";

const mockDoc = (html: string) => {
  const scripts: string[] = [];
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    if (match[1] !== undefined) {
      scripts.push(match[1]);
    }
  }

  return {
    querySelectorAll(selector: string) {
      if (selector === 'script') {
        return scripts.map(content => ({ textContent: content }));
      }
      return [];
    },
    querySelector(selector: string) {
      return null;
    }
  } as unknown as Document;
};

// Custom mock element class to simulate basic DOM operations under Bun without external libraries
class MockElement {
  tagName: string;
  childNodes: MockElement[];
  private _textContent: string;

  constructor(tagName: string, textContent: string = "", childNodes: MockElement[] = []) {
    this.tagName = tagName.toUpperCase();
    this._textContent = textContent;
    this.childNodes = childNodes;
  }

  get textContent(): string {
    if (this.childNodes.length > 0) {
      return this.childNodes.map(c => c.textContent).join("");
    }
    return this._textContent;
  }
  set textContent(val: string) {
    this.childNodes = [];
    this._textContent = val;
  }

  cloneNode(deep: boolean = true): MockElement {
    const children = deep ? this.childNodes.map(c => c.cloneNode(true)) : [];
    return new MockElement(this.tagName, this._textContent, children);
  }

  querySelectorAll(selector: string): MockElement[] {
    const results: MockElement[] = [];
    const selectors = selector.split(',').map(s => s.trim().toLowerCase());
    
    const traverse = (node: MockElement) => {
      for (const child of node.childNodes) {
        if (selectors.some(sel => child.tagName.toLowerCase() === sel)) {
          results.push(child);
        }
        traverse(child);
      }
    };
    traverse(this);
    return results;
  }

  querySelector(selector: string): MockElement | null {
    const selectors = selector.split(',').map(s => s.trim().toLowerCase());
    let found: MockElement | null = null;
    
    const traverse = (node: MockElement) => {
      if (found) return;
      for (const child of node.childNodes) {
        // Simple tag matching
        const tag = child.tagName.toLowerCase();
        if (selectors.some(sel => sel === tag || sel.includes(tag))) {
          found = child;
          return;
        }
        traverse(child);
        if (found) return;
      }
    };
    traverse(this);
    return found;
  }

  remove() {
    this.textContent = "";
    this.childNodes = [];
  }
}

describe("Flipkart Details Scraping", () => {
  test.skipIf(!existsSync('/tmp/flipkart_page.html'))("successfully parses specifications from /tmp/flipkart_page.html", () => {
    const html = readFileSync('/tmp/flipkart_page.html', 'utf-8');
    const doc = mockDoc(html);
    const details = parseFlipkartDetails(doc);

    const parsed = JSON.parse(details);
    expect(parsed["Brand"]).toBe("Nakpro");
    expect(parsed["Flavor"]).toBe("Vanilla");
    expect(parsed["Protein Type"]).toBe("Whey Protein");
    expect(details.length).toBeGreaterThan(100);
  });

  test.skipIf(!existsSync('/tmp/nutrabay.html'))("successfully parses specifications from /tmp/nutrabay.html", () => {
    const html = readFileSync('/tmp/nutrabay.html', 'utf-8');
    const doc = mockDoc(html);
    const details = parseFlipkartDetails(doc);

    const parsed = JSON.parse(details);
    expect(parsed["Brand"]).toBe("Nutrabay");
    expect(parsed["Flavor"]).toBe("Unflavoured");
    expect(parsed["Protein Type"]).toBe("Plant-Based Protein");
    expect(details.length).toBeGreaterThan(100);
  });
});

describe("Amazon Details Cleaning and Parsing", () => {
  test("corrects script pollution and cleans keys with whitespace, newlines, and colons", () => {
    // Construct mock DOM structure representing the user's broken product specs
    const tr1 = new MockElement("tr", "", [
      new MockElement("th", "Product Dimensions\n                                            \n                                            :\n                                            "),
      new MockElement("td", "23.3 x 8 x 32.5 cm; 1 kg")
    ]);

    const tr2 = new MockElement("tr", "", [
      new MockElement("th", "Customer Reviews"),
      new MockElement("td", "", [
        new MockElement("span", "4.4 out of 5 stars (555)"),
        new MockElement("script", "var dpAcrHasRegisteredArcLinkClickAction = true;")
      ])
    ]);

    const tr3 = new MockElement("tr", "", [
      new MockElement("th", "Manufacturer\n                                            \n                                            :\n                                            "),
      new MockElement("td", "Tirupati Wellness Pvt Ltd")
    ]);

    const mockDocument = {
      querySelectorAll(selector: string) {
        if (selector.includes('#prodDetails')) {
          return [tr1, tr2, tr3];
        }
        return [];
      }
    } as unknown as Document;

    const details = parseAmazonDetails(mockDocument);
    const parsed = JSON.parse(details);

    // Verify key with newlines, spaces, and colons is cleaned and correctly assigned
    expect(parsed["Product Dimensions"]).toBe("23.3 x 8 x 32.5 cm; 1 kg");
    expect(parsed["Manufacturer"]).toBe("Tirupati Wellness Pvt Ltd");

    // Verify that script tag inside Customer Reviews value was removed, leaving only the reviews text
    expect(parsed["Customer Reviews"]).toBe("4.4 out of 5 stars (555)");
    expect(parsed["Customer Reviews"]).not.toContain("dpAcrHasRegisteredArcLinkClickAction");
  });
});
