import { expect, test } from "vite-plus/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseFlipkartDetails, parseAmazonDetails } from "../src/core/specifications";
const fixture = (name: string) =>
  new DOMParser().parseFromString(
    readFileSync(resolve(import.meta.dirname, "fixtures", name), "utf8"),
    "text/html",
  );
test("reads committed Flipkart assignment fixture", () => {
  expect(JSON.parse(parseFlipkartDetails(fixture("flipkart-state.html")))).toEqual({
    Brand: "Nakpro",
    Flavor: "Vanilla",
    "Protein Type": "Whey Protein",
    Contents: "Protein, Amino acids",
  });
});
test("cleans Amazon specifications using a real document fixture", () => {
  expect(JSON.parse(parseAmazonDetails(fixture("amazon-specs.html")))).toEqual({
    "Product Dimensions": "23.3 x 8 x 32.5 cm; 1 kg",
    "Customer Reviews": "4.4 out of 5 stars (555)",
    Manufacturer: "Tirupati Wellness Pvt Ltd",
  });
});
