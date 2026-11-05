import { describe, expect, test } from "bun:test";
import { filterDbk, lookupDbk, parseDbkRows } from "../src/dbk-data";

const rows = [
  {
    ActualDBK_SERNo: "7616B",
    ActualDBK_Desc: "Other articles of aluminium",
    ActualDBKRate: "0",
  },
  {
    ActualDBK_SERNo: "761699B",
    ActualDBK_Desc: "Others",
    ActualDBKRate: "1.2",
  },
  {
    ActualDBK_SERNo: "761601B",
    ActualDBK_Desc: "Aluminum Artware/Handicrafts",
    ActualDBKRate: "1.7",
  },
];

describe("DBK lookup", () => {
  test("extracts only the returned scheme numbers and filters case insensitively", () => {
    const parsed = parseDbkRows(rows);
    expect(parsed.map((row) => row.code)).toEqual([
      "7616B",
      "761699B",
      "761601B",
    ]);
    expect(filterDbk(parsed, "artware").map((row) => row.code)).toEqual([
      "761601B",
    ]);
  });
  test("rejects malformed server data rather than presenting a misleading empty list", () => {
    expect(() => parseDbkRows({ error: "unavailable" })).toThrow();
    expect(() => parseDbkRows([{ unexpected: true }])).toThrow();
  });
  test("validates the RITC and posts it to the duty structure endpoint", async () => {
    let request: { url: string; body: string } | undefined;
    const response = await lookupDbk("76169990", async (url, body) => {
      request = { url, body };
      return rows;
    });
    expect(JSON.parse(request!.body)).toEqual({
      RITC: "76169990",
      Country: "null",
      Mode: "DBK",
    });
    expect(request!.url).toBe(
      "https://impexcube.in/DutyStructureExport/FillDBK",
    );
    expect(response).toHaveLength(3);
    await expect(lookupDbk("761", async () => rows)).rejects.toThrow();
  });
});
