import { expect, test, describe } from "bun:test";
import { extractWeights, computeRate, parseMultiPackText, parsePackCount, parseTitleToRate } from "../src/core/parser";

describe("extractWeights", () => {
  test("extracts 1kg from protein title (ignoring '25g Protein')", () => {
    const title = "MuscleBlaze Biozyme Performance Whey Protein Powder (1kg / 2.2lbs) | 25g Protein Per Scoop";
    const weights = extractWeights(title);
    expect(weights.some(w => w.val === 1000 && w.unit === 'g')).toBe(true);
    expect(weights.some(w => w.val === 25 && w.unit === 'g')).toBe(false);
  });

  test("extracts 907g from ON RCB (ignoring 2lb)", () => {
    const title = "Optimum Nutrition (ON) Gold Standard 100% Whey Protein Powder Double Rich Chocolate, 2 lb, 907 g";
    const weights = extractWeights(title);
    expect(weights.some(w => w.val === 907 && w.unit === 'g')).toBe(true);
  });

  test("ignores 'l' in 'l shaped shelf'", () => {
    expect(extractWeights("Modern 500 l shaped shelf")).toHaveLength(0);
  });

  test("parses tablets and sachets", () => {
    expect(extractWeights("10 tablets multivitamin")).toEqual([{ val: 10, unit: "tablet" }]);
    expect(extractWeights("5 sachets of coffee")).toEqual([{ val: 5, unit: "sachet" }]);
  });

  test("normalises kg to g", () => {
    expect(extractWeights("2kg rice")).toEqual([{ val: 2000, unit: "g" }]);
  });

  test("normalises litre to ml", () => {
    expect(extractWeights("1.5 litre bottle")).toEqual([{ val: 1500, unit: "ml" }]);
  });

  test("handles dozen", () => {
    expect(extractWeights("1 dozen eggs")).toEqual([{ val: 12, unit: "item" }]);
  });

  test("handles pair", () => {
    expect(extractWeights("1 pair socks")).toEqual([{ val: 2, unit: "item" }]);
  });

  test("ignores '250 L-Glutamine' (supplement false positive)", () => {
    expect(extractWeights("250 L-Glutamine Powder")).toHaveLength(0);
  });

  test("ignores '500 L-Arginine' (supplement false positive)", () => {
    expect(extractWeights("500 L-Arginine Capsules")).toHaveLength(0);
  });

  test("handles comma-separated numbers (1,000g)", () => {
    expect(extractWeights("Almonds 1,000g Premium")).toEqual([{ val: 1000, unit: "g" }]);
  });

  test("handles litres plural", () => {
    expect(extractWeights("2 litres water")).toEqual([{ val: 2000, unit: "ml" }]);
  });
});

describe("parseMultiPackText", () => {
  test("parses '2 x 50g'", () => {
    const result = parseMultiPackText("2 x 50g");
    expect(result).toEqual({ totalValue: 100, unit: "g", itemCount: 2 });
  });

  test("parses '500ml × 3'", () => {
    const result = parseMultiPackText("500ml × 3");
    expect(result).toEqual({ totalValue: 1500, unit: "ml", itemCount: 3 });
  });

  test("parses '4 x 1kg'", () => {
    const result = parseMultiPackText("4 x 1kg");
    expect(result).toEqual({ totalValue: 4000, unit: "g", itemCount: 4 });
  });

  test("returns null for non-multipack text", () => {
    expect(parseMultiPackText("500g protein powder")).toBeNull();
  });
});

describe("parsePackCount", () => {
  test("parses 'Pack of 4'", () => {
    expect(parsePackCount("Some Product Pack of 4")).toBe(4);
  });

  test("parses '6 Pack'", () => {
    expect(parsePackCount("Energy Bar 6 Pack")).toBe(6);
  });

  test("returns null for no pack info", () => {
    expect(parsePackCount("Regular Product 500g")).toBeNull();
  });

  test("returns null for '6 Pack Abs' (fitness false positive)", () => {
    expect(parsePackCount("6 Pack Abs Roller 500g")).toBeNull();
  });
});

describe("computeRate", () => {
  test("returns ₹/100g for grams", () => {
    const result = computeRate(500, 1000, "g");
    expect(result).not.toBeNull();
    expect(result!.text).toContain("/ 100 g");
    expect(result!.isItemRate).toBe(false);
  });

  test("returns ₹/tablet for tablets", () => {
    const result = computeRate(200, 10, "tablet");
    expect(result).not.toBeNull();
    expect(result!.text).toContain("/ tablet");
    expect(result!.isItemRate).toBe(true);
  });

  test("returns null for zero totalValue", () => {
    expect(computeRate(500, 0, "g")).toBeNull();
  });
});

describe("parseTitleToRate (end-to-end)", () => {
  test("computes rate for '2 x 500ml' at ₹200", () => {
    const result = parseTitleToRate(200, "Juice 2 x 500ml");
    expect(result).not.toBeNull();
    expect(result!.text).toContain("/ 100 ml");
    expect(result!.isItemRate).toBe(false);
  });

  test("computes per-item for 'Pack of 3' with no weight", () => {
    const result = parseTitleToRate(300, "Toothbrush Pack of 3");
    expect(result).not.toBeNull();
    expect(result!.text).toContain("/ item");
    expect(result!.isItemRate).toBe(true);
  });

  test("handles single weight product", () => {
    const result = parseTitleToRate(425, "Basmati Rice 1kg Premium");
    expect(result).not.toBeNull();
    expect(result!.text).toContain("/ 100 g");
  });

  test("returns null for unrecognised title", () => {
    expect(parseTitleToRate(999, "Some Random Product")).toBeNull();
  });

  test("handles comma-separated weight (1,000g)", () => {
    const result = parseTitleToRate(500, "Almonds 1,000g Premium");
    expect(result).not.toBeNull();
    expect(result!.text).toContain("/ 100 g");
  });
});
