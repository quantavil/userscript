import { describe, expect, it } from "vite-plus/test";
import { FORKS_STOPS, STARS_STOPS } from "./config";
import {
  buildHideMatcher,
  buildQuery,
  buildUrl,
  emptyState,
  fromIndex,
  normalizeState,
  parseUrl,
  queryParts,
  toIndex,
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
    expect(q(buildUrl({ ...emptyState(), stars: { min: 0, max: 1000 } }))).toBe("stars:<1000");
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
    expect(parts).toEqual([
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
  it("round-trips a built URL", () => {
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
});

describe("slider scale", () => {
  it("maps the ends of the track to open bounds", () => {
    expect(fromIndex(STARS_STOPS, 0, "min")).toBe(0);
    expect(fromIndex(STARS_STOPS, STARS_STOPS.length - 1, "max")).toBe(0);
    expect(fromIndex(STARS_STOPS, 3, "min")).toBe(50);
    expect(toIndex(STARS_STOPS, 0, "max")).toBe(STARS_STOPS.length - 1);
  });

  it("snaps an off-scale value to the nearest stop but keeps it readable", () => {
    expect(toIndex(STARS_STOPS, 600, "min")).toBe(toIndex(STARS_STOPS, 500, "min"));
    expect(toIndex(FORKS_STOPS, 3, "max")).toBe(1);
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
