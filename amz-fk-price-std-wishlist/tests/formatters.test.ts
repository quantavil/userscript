import { expect, test, describe } from "bun:test";
import { cleanNumber, fmtPrice } from "../src/utils/formatters";

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
