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
});

test("chooses Moradabad and current year, then submits only with one company", () => {
  const window = new Window({
    url: "https://export.impexcube.in/frmLoginNew.aspx",
  });
  Object.assign(globalThis, {
    window,
    document: window.document,
    location: window.location,
    sessionStorage: window.sessionStorage,
    Event: window.Event,
  });
  window.document.body.innerHTML = `<form><select id="drCompany"><option value="">Choose</option><option value="c">Company</option></select><select id="drBranch"><option value="d">DELHI</option><option value="m">MORADABAD</option></select><select id="drFinancial"><option value="old">2025-2026</option><option value="new">2026-2027</option></select><input id="btnGo" type="submit"></form>`;
  let submits = 0;
  window.document.querySelector("form")!.addEventListener("submit", (e) => {
    e.preventDefault();
    submits++;
  });
  installLoginDefaults(new Date("2026-11-05T06:00:00Z"));
  expect(
    window.document.querySelector<HTMLSelectElement>("#drBranch")!.value,
  ).toBe("m");
  expect(
    window.document.querySelector<HTMLSelectElement>("#drFinancial")!.value,
  ).toBe("new");
  expect(submits).toBe(1);
});

test("does not submit an ambiguous company selection", () => {
  const window = new Window({
    url: "https://export.impexcube.in/frmLoginNew.aspx",
  });
  Object.assign(globalThis, {
    window,
    document: window.document,
    location: window.location,
    sessionStorage: window.sessionStorage,
    Event: window.Event,
  });
  window.document.body.innerHTML = `<form><select id="drCompany"><option value="a">A</option><option value="b">B</option></select><select id="drBranch"><option value="m">MORADABAD</option></select><select id="drFinancial"><option value="y">2026-2027</option></select><input id="btnGo" type="submit"></form>`;
  let submits = 0;
  window.document.querySelector("form")!.addEventListener("submit", (e) => {
    e.preventDefault();
    submits++;
  });
  installLoginDefaults(new Date("2026-11-05T06:00:00Z"));
  expect(submits).toBe(0);
});
