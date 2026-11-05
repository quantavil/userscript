export interface Scheme {
  code: string;
  description: string;
  rate: string;
}

export function parseDbkRows(value: unknown): Scheme[] {
  if (!Array.isArray(value)) throw new Error("Unexpected DBK response");
  return value.map((row: unknown) => {
    if (
      !row ||
      typeof row !== "object" ||
      !("ActualDBK_SERNo" in row) ||
      typeof row.ActualDBK_SERNo !== "string" ||
      !row.ActualDBK_SERNo.trim()
    ) {
      throw new Error("Unexpected DBK row");
    }
    const item = row as Record<string, unknown>;
    return {
      code: row.ActualDBK_SERNo.trim(),
      description: String(item.ActualDBK_Desc ?? ""),
      rate: String(item.ActualDBKRate ?? ""),
    };
  });
}

export function filterDbk(rows: Scheme[], query: string): Scheme[] {
  const term = query.trim().toLowerCase();
  return rows.filter((row) =>
    `${row.code} ${row.description}`.toLowerCase().includes(term),
  );
}

export async function lookupDbk(
  ritc: string,
  post: (url: string, body: string) => Promise<unknown>,
): Promise<Scheme[]> {
  if (!/^\d{8}$/.test(ritc)) throw new Error("Enter an 8-digit RITC number");
  return parseDbkRows(
    await post(
      "https://impexcube.in/DutyStructureExport/FillDBK",
      JSON.stringify({ RITC: ritc, Country: "null", Mode: "DBK" }),
    ),
  );
}
