import { expect, test } from "vite-plus/test";
import { cleanProductUrl } from "../src/utils/urlCleaner";
import { cleanNumber } from "../src/utils/formatters";
import { parseAmazonDetails, parseFlipkartDetails } from "../src/core/ui";
const doc = (html: string) => new DOMParser().parseFromString(html, "text/html");
test("preserves Amazon US marketplace and gp/product ASIN", () => {
  expect(cleanProductUrl("https://www.amazon.com/x/gp/product/B012345678?tag=ref", "Amazon")).toBe(
    "https://www.amazon.com/dp/B012345678",
  );
});
test("parses USD amounts", () => expect(cleanNumber("$1,234.56")).toBe(1234.56));
test("reads distinct Amazon td key and value and strips script text", () => {
  expect(
    JSON.parse(
      parseAmazonDetails(
        doc(
          '<div id="prodDetails"><table><tr><td> Brand : </td><td>Acme<script>bad()</script></td></tr></table></div>',
        ),
      ),
    ),
  ).toEqual({ Brand: "Acme" });
});
test("reads only the assigned balanced Flipkart object including braces inside strings", () => {
  const html =
    '<script>const before={}; window.__INITIAL_STATE__ = {"x":{"label_0":{"value":{"text":"Name"}},"label_1":{"value":{"text":"Value } \\\" {"}}}}; const after={};</script>';
  expect(JSON.parse(parseFlipkartDetails(doc(html)))).toEqual({ Name: 'Value } " {' });
});

test("ignores Flipkart assignment lookalikes in strings and comments", () => {
  const html = `<script>// window.__INITIAL_STATE__ = {"label_0":{"value":{"text":"Wrong"}},"label_1":{"value":{"text":"Comment"}}};
 const text = 'window.__INITIAL_STATE__ = {"label_0":{"value":{"text":"Wrong"}},"label_1":{"value":{"text":"String"}}}';
 window.__INITIAL_STATE__ = {"label_0":{"value":{"text":"Real"}},"label_1":{"value":{"text":"Value"}}};</script>`;
  expect(JSON.parse(parseFlipkartDetails(doc(html)))).toEqual({ Real: "Value" });
});
