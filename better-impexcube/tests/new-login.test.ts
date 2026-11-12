import { expect, test } from "bun:test";
import { Window } from "happy-dom";
import { installNewLoginDeny } from "../src/new-login";

const box = (title: string, buttons = "Allow|Deny") =>
  `<div class="jconfirm"><div class="jconfirm-box"><div class="title">${title}</div><div class="buttons">${buttons
    .split("|")
    .map((label) => `<button>${label}</button>`)
    .join("")}</div></div></div>`;

function setup() {
  const window = new Window({ url: "https://export.impexcube.in/" });
  Object.assign(globalThis, {
    window,
    document: window.document,
    MutationObserver: window.MutationObserver,
  });
  const clicks: string[] = [];
  window.document.addEventListener("click", (e) => {
    clicks.push((e.target as HTMLElement).textContent ?? "");
  });
  installNewLoginDeny();
  return { window, clicks };
}

test("clicks Deny once when the new-login prompt appears", async () => {
  const { window, clicks } = setup();
  window.document.body.insertAdjacentHTML(
    "beforeend",
    box("New Login Detected !"),
  );
  await new Promise((r) => setTimeout(r, 10));
  expect(clicks).toEqual(["Deny"]);
});

test("ignores other confirmation dialogs", async () => {
  const { window, clicks } = setup();
  window.document.body.insertAdjacentHTML("beforeend", box("Delete job?"));
  await new Promise((r) => setTimeout(r, 10));
  expect(clicks).toEqual([]);
});
