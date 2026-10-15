export function parseFlipkartDetails(doc: Document): string {
  const specs: Record<string, string> = {};

  // 1. Try to extract specs from JSON state object (Flipkart renders details purely client-side)
  let stateObj: unknown = null;
  for (const script of doc.querySelectorAll("script")) {
    const assigned = readAssignedState(script.textContent ?? "");
    if (assigned) stateObj = assigned;
  }

  if (stateObj) {
    extractSpecsFromInitialState(stateObj, specs);
  }

  // 2. Fallback description parsing from DOM
  const descEl = doc.querySelector(
    'div._2u3tZ_, div.R1Z4XM, div._1mXFDR, div._271593, .yN18w9, [data-aid="product-description"]',
  );
  if (descEl) {
    specs["Description"] = cleanDomText(descEl);
  }

  // 3. Fallback DOM selectors (if state parsing failed or has very few details)
  if (Object.keys(specs).length <= 1) {
    const rowSelectors = [
      "tr._1s574Q",
      "tr",
      "div._3_60cu",
      "div.row",
      "div._14_5Iy",
      "div._2RngN-",
    ];

    doc.querySelectorAll(rowSelectors.join(", ")).forEach((row) => {
      const keyEl = row.querySelector("td._1hKmfg, ._2RngN-, .col-3-12");
      const valEl = row.querySelector("td._25HCb6, ._3ENrCw, .col-9-12");
      if (keyEl && valEl && keyEl !== valEl) {
        const key = cleanDomText(keyEl).replace(/:\s*$/, "").trim();
        const val = cleanDomText(valEl);
        if (key && val && key !== val) {
          specs[key] = val;
        }
      }
    });

    if (Object.keys(specs).length <= 1) {
      doc.querySelectorAll("._3ENrCw, td._25HCb6, .col-9-12").forEach((valEl) => {
        const keyEl = valEl.previousElementSibling;
        if (keyEl) {
          const key = cleanDomText(keyEl).replace(/:\s*$/, "").trim();
          const val = cleanDomText(valEl);
          if (key && val && key !== val) {
            specs[key] = val;
          }
        }
      });
    }
  }

  return JSON.stringify(specs);
}

export function extractSpecsFromInitialState(
  state: any,
  specs: Record<string, string> = {},
): Record<string, string> {
  const visited = new Set();

  function recurse(obj: any) {
    if (!obj || typeof obj !== "object") return;
    if (visited.has(obj)) return;
    visited.add(obj);

    if (obj.label_0?.value?.text && obj.label_1?.value?.text) {
      const key = String(obj.label_0.value.text).trim().replace(/:$/, "");
      const rawVal = obj.label_1.value.text;
      const val = (Array.isArray(rawVal) ? rawVal.join(", ") : String(rawVal)).trim();

      if (key && val && key !== val) {
        specs[key] = val;
      }
    }

    for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        recurse(obj[k]);
      }
    }
  }

  recurse(state);
  return specs;
}

function cleanDomText(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll("script, style").forEach((child) => child.remove());
  return clone.textContent?.trim().replace(/\s+/g, " ") || "";
}

export function parseAmazonDetails(doc: Document): string {
  const specs: Record<string, string> = {};

  const bullets: string[] = [];
  doc.querySelectorAll("#feature-bullets ul li span.a-list-item").forEach((li) => {
    const text = cleanDomText(li);
    if (text && !text.includes("Make sure this fits")) {
      bullets.push(text);
    }
  });
  if (bullets.length > 0) {
    specs["About"] = bullets.join("; ");
  }

  const rowSelectors = [
    "#prodDetails table tr",
    "#detailBullets_feature_div ul li",
    "#technicalSpecifications_section_1 table tr",
    ".a-keyvalue tr",
  ];

  doc.querySelectorAll(rowSelectors.join(", ")).forEach((row) => {
    const keyEl = row.querySelector(
      "th, td.a-color-secondary, .a-list-item .a-text-bold, td:first-child",
    );
    const valEl = row.querySelector("td:last-child, .a-list-item :not(.a-text-bold)");
    if (keyEl && valEl && keyEl !== valEl) {
      const key = cleanDomText(keyEl).replace(/:\s*$/, "").trim();
      const val = cleanDomText(valEl);
      if (key && val && key !== val) {
        specs[key] = val;
      }
    }
  });

  return JSON.stringify(specs);
}

/** Scan source as text, skipping strings/comments before a JSON assignment. Never evaluate it. */
function readAssignedState(source: string): unknown {
  let quote = "";
  let escaped = false;
  let comment: "line" | "block" | "" = "";
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (comment === "line") {
      if (ch === "\n") comment = "";
      continue;
    }
    if (comment === "block") {
      if (ch === "*" && next === "/") {
        comment = "";
        i++;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === "/" && next === "/") {
      comment = "line";
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      comment = "block";
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch !== "w" || /[\w$]/.test(source[i - 1] ?? "")) continue;
    const assignment = /^window\.__INITIAL_STATE__\s*=\s*(?![=>])/.exec(source.slice(i));
    if (!assignment) continue;
    const start = i + assignment[0].length;
    if (source[start] !== "{") continue;
    let depth = 0;
    let quoted = false;
    let escape = false;
    for (let end = start; end < source.length; end++) {
      const token = source[end];
      if (quoted) {
        if (escape) escape = false;
        else if (token === "\\") escape = true;
        else if (token === '"') quoted = false;
      } else if (token === '"') quoted = true;
      else if (token === "{") depth++;
      else if (token === "}" && --depth === 0) {
        try {
          return JSON.parse(source.slice(start, end + 1));
        } catch {
          i = end;
          break;
        }
      }
    }
  }
  return null;
}
