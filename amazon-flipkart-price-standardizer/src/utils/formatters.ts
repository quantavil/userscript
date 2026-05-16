/** Strip currency symbols, commas, and whitespace, then parse as a number.
 *  Returns null for empty, non-numeric, or malformed strings (e.g. multiple dots). */
export function cleanNumber(str: string): number | null {
  const cleaned = str.replace(/[₹,\s]/g, '').trim();
  if (!cleaned || !/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export const fmtPrice = (p: number): string => '₹' + p.toLocaleString('en-IN', { maximumFractionDigits: 2 });
