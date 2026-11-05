import { expect, test } from "bun:test";
import { Window } from "happy-dom";
import { installJobDelete } from "../src/job-delete";

test("delete menu keeps the selected row's job number", () => {
  const window = new Window({
    url: "https://export.impexcube.in/efrmJobDetails.aspx",
  });
  Object.assign(globalThis, {
    window,
    document: window.document,
    location: window.location,
  });
  window.document.body.innerHTML = `<table id="ContentPlaceHolder1_gvJobNo"><tr><td><span class="jobnomenu">EXP-2627-751</span><div class="actionmenu"></div></td></tr></table><ul id="myMenu"></ul>`;
  let opened = "";
  installJobDelete((job) => {
    opened = job;
  });
  window.document
    .querySelector(".actionmenu")!
    .dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true }));
  window.document.querySelector<HTMLElement>(".bic-delete-menu")!.click();
  expect(opened).toBe("EXP-2627-751");
});

test("requires the exact loaded job before enabling deletion", () => {
  const window = new Window({
    url: "https://export.impexcube.in/frmDeleteJobNo.aspx",
  });
  Object.assign(globalThis, {
    window,
    document: window.document,
    location: window.location,
  });
  window.name = "better-impexcube-delete:loaded:EXP-2627-751";
  window.document.body.innerHTML = `<form><input id="ContentPlaceHolder1_txtJobno" value="EXP-2627-751"><input id="ContentPlaceHolder1_btnChangeFyear" type="submit"></form>`;
  installJobDelete();
  const input = window.document.querySelector<HTMLInputElement>(
    ".bic-delete-confirm-input",
  )!;
  const confirm = window.document.querySelector<HTMLButtonElement>(
    ".bic-delete-confirm",
  )!;
  expect(confirm.disabled).toBe(true);
  input.value = "EXP-2627-750";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  expect(confirm.disabled).toBe(true);
  input.value = "EXP-2627-751";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  expect(confirm.disabled).toBe(false);
  window.document.querySelector<HTMLInputElement>(
    "#ContentPlaceHolder1_txtJobno",
  )!.value = "EXP-2627-752";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  expect(confirm.disabled).toBe(true);
});
