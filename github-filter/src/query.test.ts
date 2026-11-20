import { describe, expect, it } from "vite-plus/test";
import { FORKS_STOPS, STARS_STOPS } from "./config";
import {
  buildHideMatcher,
  buildQuery,
  buildUrl,
  countActiveFilters,
  emptyState,
  fromIndex,
  normalizeSort,
  normalizeState,
  parseUrl,
  queryParts,
  ratioToVal,
  removeQueryPart,
  shiftDays,
  splitTerms,
  stepValue,
  todayLocal,
  toIndex,
  valToRatio,
} from "./query";

const q = (url: string) => new URL(url).searchParams.get("q");

describe("buildUrl", () => {
  it("compiles AND terms, an OR group and text qualifiers", () => {
    const url = buildUrl({
      ...emptyState(),
      and: "rust async",
      or: "react, vue",
      lang: "python",
    });
    expect(q(url)).toBe("rust async (react OR vue) language:python");
  });

  it("does not wrap a single OR term in parentheses", () => {
    expect(q(buildUrl({ ...emptyState(), or: "react" }))).toBe("react");
  });

  it("writes a star range as a bounded, open or single-ended filter", () => {
    expect(q(buildUrl({ ...emptyState(), stars: { min: 500, max: 0 } }))).toBe("stars:>=500");
    expect(q(buildUrl({ ...emptyState(), stars: { min: 0, max: 1000 } }))).toBe("stars:<=1000");
    expect(q(buildUrl({ ...emptyState(), stars: { min: 500, max: 1000 } }))).toBe("stars:500..1000");
    expect(q(buildUrl({ ...emptyState(), stars: { min: 0, max: 0 } }))).toBeNull();
  });

  it("writes a date range with inclusive bounds", () => {
    expect(q(buildUrl({ ...emptyState(), created: { from: "2024-01-01", to: "" } }))).toBe(
      "created:>=2024-01-01",
    );
    expect(q(buildUrl({ ...emptyState(), pushed: { from: "", to: "2024-06-30" } }))).toBe(
      "pushed:<=2024-06-30",
    );
    expect(
      q(buildUrl({ ...emptyState(), created: { from: "2024-01-01", to: "2024-06-30" } })),
    ).toBe("created:2024-01-01..2024-06-30");
  });

  it("carries the negation prefix onto the qualifier, not the value", () => {
    expect(q(buildUrl({ ...emptyState(), lang: "python, -html" }))).toBe(
      "language:python -language:html",
    );
  });

  it("keeps quoted phrases whole, including negated ones", () => {
    expect(q(buildUrl({ ...emptyState(), and: '"machine learning" -"neural net"' }))).toBe(
      '"machine learning" -"neural net"',
    );
  });

  it("always searches repositories, since every control is a repository qualifier", () => {
    expect(new URL(buildUrl(emptyState())).searchParams.get("type")).toBe("repositories");
  });

  it("only emits sort params when a sort is chosen", () => {
    expect(buildUrl(emptyState())).not.toContain("&s=");
    expect(buildUrl({ ...emptyState(), sort: "stars" })).toContain("s=stars&o=desc");
  });

  it("omits an empty query rather than sending q=", () => {
    expect(q(buildUrl(emptyState()))).toBeNull();
  });
});

describe("buildQuery", () => {
  it("is the single string the tape renders and the URL carries", () => {
    const state = { ...emptyState(), and: "rust", lang: "python", stars: { min: 500, max: 0 } };
    expect(buildQuery(state)).toBe("rust language:python stars:>=500");
    expect(q(buildUrl(state))).toBe(buildQuery(state));
  });

  it("keeps qualifier parts separate so the tape can colour the key", () => {
    const parts = queryParts({
      ...emptyState(),
      or: "react, vue",
      lang: "python, -html",
      forks: { min: 10, max: 100 },
    });
    expect(parts.map(p => ({ text: p.text, kind: p.kind }))).toEqual([
      { text: "(react OR vue)", kind: "term" },
      { text: "language:python", kind: "qualifier" },
      { text: "-language:html", kind: "qualifier" },
      { text: "forks:10..100", kind: "qualifier" },
    ]);
  });

  it("is empty when nothing is set", () => {
    expect(buildQuery(emptyState())).toBe("");
  });
});

describe("parseUrl", () => {
  it("round-trips a built URL without decrement drift", () => {
    const state = {
      ...emptyState(),
      and: "rust",
      or: "react, vue",
      sort: "stars",
      hide: "spam, bot",
      lang: "python, -html",
      stars: { min: 500, max: 2000 },
      created: { from: "2024-01-01", to: "2024-06-30" },
    };
    const parsed = parseUrl(new URL(buildUrl(state)).search);
    expect(parsed.and).toBe("rust");
    expect(parsed.or).toBe("react, vue");
    expect(parsed.sort).toBe("stars");
    expect(parsed.hide).toBe("spam, bot");
    expect(parsed.lang).toBe("python, -html");
    expect(parsed.stars).toEqual({ min: 500, max: 2000 });
    expect(parsed.created).toEqual({ from: "2024-01-01", to: "2024-06-30" });
  });

  it("reads a bare star count as a minimum", () => {
    expect(parseUrl("?q=stars%3A500").stars).toEqual({ min: 500, max: 0 });
  });

  it("widens strict comparisons to whole units so they round-trip exactly", () => {
    expect(parseUrl("?q=stars%3A%3E500").stars).toEqual({ min: 501, max: 0 });
    expect(parseUrl("?q=stars%3A%3C100").stars).toEqual({ min: 0, max: 99 });
    expect(parseUrl("?q=created%3A%3E2024-01-01").created).toEqual({ from: "2024-01-02", to: "" });
  });

  it("correctly handles language with spaces in quotes", () => {
    const parsed = parseUrl('?q=language%3A%22Jupyter+Notebook%22');
    expect(parsed.lang).toBe('"Jupyter Notebook"');
  });

  it("reads shorthand qualifiers without eating the longhand", () => {
    expect(parseUrl("?q=lang%3Ajs").lang).toBe("js");
    expect(parseUrl("?q=language%3Ajavascript").lang).toBe("javascript");
  });

  it("leaves qualifiers the panel cannot express in the free-text field", () => {
    expect(parseUrl("?q=size%3A100..500").and).toBe("size:100..500");
    expect(parseUrl("?q=created%3A2023").and).toBe("created:2023");
  });

  it("leaves plain text that merely contains parentheses in the AND field", () => {
    expect(parseUrl("?q=parser+(experimental)").or).toBe("");
    expect(parseUrl("?q=parser+(experimental)").and).toBe("parser (experimental)");
  });

  it("drops an unknown sort value instead of leaving the select blank", () => {
    expect(parseUrl("?q=react&s=best-match-ever").sort).toBe("");
    expect(parseUrl("?q=react&s=stars").sort).toBe("stars");
  });

  it("rejects impossible calendar dates back into free text", () => {
    expect(parseUrl("?q=created%3A2024-02-31").created).toEqual({ from: "", to: "" });
    expect(parseUrl("?q=created%3A2024-02-31").and).toBe("created:2024-02-31");
  });
});

describe("splitTerms", () => {
  it("keeps quoted qualifier values attached", () => {
    const terms = splitTerms('rust language:"Jupyter Notebook" stars:>=500 -repo:"org/some repo"');
    expect(terms).toEqual([
      'rust',
      'language:"Jupyter Notebook"',
      'stars:>=500',
      '-repo:"org/some repo"'
    ]);
  });
});

describe("removeQueryPart & countActiveFilters", () => {
  it("removes parts cleanly", () => {
    const state = {
      ...emptyState(),
      and: "rust async",
      lang: "python, js",
      stars: { min: 100, max: 0 }
    };
    expect(countActiveFilters(state)).toBe(3);

    const parts = queryParts(state);
    const starPart = parts.find(p => p.fieldId === 'stars')!;
    const stateWithoutStars = removeQueryPart(state, starPart);
    expect(stateWithoutStars.stars).toEqual({ min: 0, max: 0 });
    expect(countActiveFilters(stateWithoutStars)).toBe(2);

    const langPart = parts.find(p => p.token === 'python')!;
    const stateWithoutPython = removeQueryPart(stateWithoutStars, langPart);
    expect(stateWithoutPython.lang).toBe('js');
  });
});

describe("normalizeState", () => {
  it("translates a v9 preset whose fields were raw strings", () => {
    const state = normalizeState({
      type: "repositories",
      sort: "stars",
      and: "rust",
      or: "",
      hide: "bot",
      q: { lang: "python, -html", stars: "500", created: "2024-01-01" },
    });
    expect(state.and).toBe("rust");
    expect(state.sort).toBe("stars");
    expect(state.hide).toBe("bot");
    expect(state.lang).toBe("python, -html");
    expect(state.stars).toEqual({ min: 500, max: 0 });
    expect(state.created).toEqual({ from: "2024-01-01", to: "" });
  });

  it("keeps an already-typed state intact", () => {
    const state = {
      ...emptyState(),
      stars: { min: 100, max: 500 },
      pushed: { from: "2024-01-01", to: "2024-03-01" },
    };
    expect(normalizeState(state)).toEqual(state);
  });

  it("survives a garbage record instead of throwing", () => {
    expect(normalizeState(null)).toEqual(emptyState());
    expect(normalizeState({ stars: "nope", created: 7 })).toEqual(emptyState());
  });

  it("normalises an unsupported sort to an empty value", () => {
    expect(normalizeSort("stars")).toBe("stars");
    expect(normalizeSort("wat")).toBe("");
    expect(normalizeSort(7)).toBe("");
  });
});

describe("slider scale", () => {
  it("maps the ends of the track to open bounds and supports 1", () => {
    expect(fromIndex(STARS_STOPS, 0, "min")).toBe(0);
    expect(fromIndex(STARS_STOPS, 1, "min")).toBe(1);
    expect(toIndex(STARS_STOPS, 1, "min")).toBe(1);
    expect(fromIndex(STARS_STOPS, STARS_STOPS.length - 1, "max")).toBe(0);
    expect(toIndex(STARS_STOPS, 0, "max")).toBe(STARS_STOPS.length - 1);
  });

  it("snaps an off-scale value to the nearest stop but keeps it readable", () => {
    expect(toIndex(STARS_STOPS, 600, "min")).toBe(toIndex(STARS_STOPS, 500, "min"));
    expect(toIndex(FORKS_STOPS, 3, "max")).toBe(1);
  });

  it("smoothly maps continuous ratios and roundtrips key thresholds", () => {
    // 0 / open bound
    expect(valToRatio(0, 100000, "min")).toBe(0);
    expect(ratioToVal(0, 100000, "min")).toBe(0);
    expect(valToRatio(0, 100000, "max")).toBe(1);
    expect(ratioToVal(1, 100000, "max")).toBe(0);

    // 1 threshold
    expect(ratioToVal(valToRatio(1, 100000, "min"), 100000, "min")).toBe(1);

    // key logarithmic thresholds
    for (const val of [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000]) {
      const ratio = valToRatio(val, 100000, "min");
      expect(ratioToVal(ratio, 100000, "min")).toBe(val);
    }

    // forks cap
    for (const val of [1, 10, 100, 1000, 25000]) {
      const ratio = valToRatio(val, 25000, "min");
      expect(ratioToVal(ratio, 25000, "min")).toBe(val);
    }
  });

  it("steps keyboard values forward without wedging at 1", () => {
    expect(stepValue(0, 100000, "min", 1)).toBe(1);
    expect(stepValue(1, 100000, "min", 1)).toBe(2);
    expect(stepValue(2, 100000, "min", 1)).toBe(3);
    expect(stepValue(10, 100000, "min", 1)).toBeGreaterThan(10);
    expect(stepValue(100000, 100000, "min", 1)).toBe(100000);

    expect(stepValue(2, 100000, "min", -1)).toBe(1);
    expect(stepValue(1, 100000, "min", -1)).toBe(0);
    expect(stepValue(0, 100000, "min", -1)).toBe(0);
  });

  it("steps max thumb values and keeps open bounds at the ends", () => {
    // 0 means unbounded for a max thumb, drawn at the right edge.
    expect(stepValue(0, 100000, "max", -1)).toBe(100000);
    expect(stepValue(0, 100000, "max", 1)).toBe(0);
    expect(stepValue(100000, 100000, "max", 1)).toBe(0);
    expect(stepValue(100000, 100000, "max", -1)).toBeLessThan(100000);
    expect(stepValue(2, 100000, "max", -1)).toBe(1);
    expect(stepValue(1, 100000, "max", -1)).toBe(1);
    expect(stepValue(1, 100000, "max", 1)).toBe(2);
  });
});

describe("shiftDays", () => {
  it("shifts dates correctly by days", () => {
    expect(shiftDays("2024-01-10", 5)).toBe("2024-01-15");
    expect(shiftDays("2024-01-10", -10)).toBe("2023-12-31");
  });

  it("reads today from the local calendar, not UTC", () => {
    expect(todayLocal(new Date(2024, 0, 5, 23, 30))).toBe("2024-01-05");
  });
});

describe("buildHideMatcher", () => {
  it("matches whole words only", () => {
    const re = buildHideMatcher("bot")!;
    expect(re.test("a telegram bot")).toBe(true);
    expect(re.test("robotics toolkit")).toBe(false);
  });

  it("is case insensitive and escapes regex metacharacters", () => {
    expect(buildHideMatcher("c++")!.test("written in C++")).toBe(true);
    expect(buildHideMatcher("node.js")!.test("nodeXjs")).toBe(false);
  });

  it("returns null for empty input so callers can skip filtering", () => {
    expect(buildHideMatcher("   ,  ")).toBeNull();
  });
});
