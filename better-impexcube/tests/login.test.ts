import { expect, test } from "bun:test";
import { Window } from "happy-dom";
import { currentFinancialYear, installLoginDefaults } from "../src/login";

test("calculates the Indian financial year at the April boundary", () => {
  expect(currentFinancialYear(new Date("2026-03-31T18:29:59Z"))).toBe(
    "2025-2026",
  );
  expect(currentFinancialYear(new Date("2026-03-31T18:30:00Z"))).toBe(
    "2026-2027",
  );
  expect(currentFinancialYear(new Date(Number.NaN))).toBe("");
});

function setup(url: string, body: string) {
  const window = new Window({ url });
  Object.assign(globalThis, {
    window,
    document: window.document,
    location: window.location,
    sessionStorage: window.sessionStorage,
    Event: window.Event,
    MutationObserver: window.MutationObserver,
  });
  window.document.body.innerHTML = body;
  const counter = { submits: 0 };
  window.document.addEventListener("submit", (e) => {
    e.preventDefault();
    counter.submits++;
  });
  return { window, counter };
}

const selection = (companies: string) =>
  `<form><select id="drCompany">${companies}</select><select id="drBranch"><option value="d">DELHI</option><option value="m">MORADABAD</option></select><select id="drFinancial"><option value="old">2025-2026</option><option value="new">2026-2027</option></select><input id="btnGo" type="submit"></form>`;
const value = (window: Window, id: string) =>
  window.document.querySelector<HTMLSelectElement>(id)!.value;
const NOW = new Date("2026-11-05T06:00:00Z");

test("chooses Moradabad and current year, then submits only with one company", () => {
  const { window, counter } = setup(
    "https://export.impexcube.in/frmLoginNew.aspx",
    selection(
      '<option value="">Choose</option><option value="c">Company</option>',
    ),
  );
  installLoginDefaults(NOW);
  expect(value(window, "#drBranch")).toBe("m");
  expect(value(window, "#drFinancial")).toBe("new");
  expect(counter.submits).toBe(1);
});

test("does not submit an ambiguous company selection", () => {
  const { counter } = setup(
    "https://export.impexcube.in/frmLoginNew.aspx",
    selection('<option value="a">A</option><option value="b">B</option>'),
  );
  installLoginDefaults(NOW);
  expect(counter.submits).toBe(0);
});

test("applies defaults on the site root once the panel is rendered later", async () => {
  const { window, counter } = setup("https://export.impexcube.in/", "");
  installLoginDefaults(NOW);
  window.document.body.innerHTML = selection(
    '<option value="c">Company</option>',
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(value(window, "#drBranch")).toBe("m");
  expect(counter.submits).toBe(1);
  // A user's later manual change is not overwritten by unrelated DOM updates.
  window.document.querySelector<HTMLSelectElement>("#drBranch")!.value = "d";
  window.document.body.append(window.document.createElement("p"));
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(value(window, "#drBranch")).toBe("d");
  expect(counter.submits).toBe(1);
});
