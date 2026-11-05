import { expect, test } from "bun:test";
import { Window } from "happy-dom";
import { installContextSwitch } from "../src/context-switch";

test("applies a header choice through the native switch form", async () => {
  const window = new Window({
    url: "https://export.impexcube.in/frmswitchBranch.aspx",
  });
  Object.assign(globalThis, {
    window,
    document: window.document,
    location: window.location,
  });
  window.name = `better-impexcube-context:${JSON.stringify({ branch: "DEL", year: "2025-2026" })}`;
  window.document.body.innerHTML = `<form><select id="ContentPlaceHolder1_ddlbranch"><option value="M">MORADABAD</option><option value="DEL">DELHI</option></select><select id="ContentPlaceHolder1_drFinancial"><option value="2026-2027">2026-2027</option><option value="2025-2026">2025-2026</option></select><input id="ContentPlaceHolder1_btnGo" type="submit"></form>`;
  let submitted = 0;
  window.document.querySelector("form")!.addEventListener("submit", (event) => {
    event.preventDefault();
    submitted++;
  });
  await installContextSwitch();
  expect(
    window.document.querySelector<HTMLSelectElement>(
      "#ContentPlaceHolder1_ddlbranch",
    )!.value,
  ).toBe("DEL");
  expect(
    window.document.querySelector<HTMLSelectElement>(
      "#ContentPlaceHolder1_drFinancial",
    )!.value,
  ).toBe("2025-2026");
  expect(submitted).toBe(1);
  expect(window.name).toBe("");
});

test("never submits choices missing from the native switch form", async () => {
  const window = new Window({
    url: "https://export.impexcube.in/frmswitchBranch.aspx",
  });
  Object.assign(globalThis, {
    window,
    document: window.document,
    location: window.location,
  });
  window.name = `better-impexcube-context:${JSON.stringify({ branch: "UNKNOWN", year: "2025-2026" })}`;
  window.document.body.innerHTML = `<form><select id="ContentPlaceHolder1_ddlbranch"><option value="M">MORADABAD</option></select><select id="ContentPlaceHolder1_drFinancial"><option value="2025-2026">2025-2026</option></select><input id="ContentPlaceHolder1_btnGo" type="submit"></form>`;
  let submitted = 0;
  window.document.querySelector("form")!.addEventListener("submit", (event) => {
    event.preventDefault();
    submitted++;
  });
  await installContextSwitch();
  expect(submitted).toBe(0);
});
