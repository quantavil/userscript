import { expect, test } from "bun:test";
import { Window } from "happy-dom";

const pause = () => new Promise((resolve) => setTimeout(resolve, 80));

test("dropdown keyboard selection fires one change and respects disabled options", async () => {
  const window = new Window({ url: "https://export.impexcube.in/" });
  window.document.body.innerHTML =
    '<select id="port"><option value="a">Alpha</option><option value="b">Beta</option><option value="c" disabled>Blocked</option></select>';
  const select = window.document.querySelector("select")!;
  let changes = 0;
  select.onchange = () => {
    changes++;
  };
  Object.assign(globalThis, {
    window,
    document: window.document,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    Node: window.Node,
    MutationObserver: window.MutationObserver,
    Event: window.Event,
    getComputedStyle: window.getComputedStyle.bind(window),
  });
  const { installDropdowns } = await import("../src/dropdown");
  installDropdowns();
  await pause();
  const trigger =
    window.document.querySelector<HTMLButtonElement>(".bd-trigger")!;
  expect(trigger.parentElement?.contains(select)).toBe(true);
  expect(trigger.title).toBe("Alpha");
  window.document.querySelector<HTMLButtonElement>(".bd-trigger")!.click();
  await pause();
  const search = window.document.querySelector<HTMLInputElement>(".bd-search")!;
  search.value = "Beta";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  await pause();
  search.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(select.value).toBe("b");
  expect(trigger.title).toBe("Beta");
  expect(changes).toBe(1);
  window.document.querySelector<HTMLButtonElement>(".bd-trigger")!.click();
  search.value = "Blocked";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  await pause();
  search.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(select.value).toBe("b");
  select.disabled = true;
  await pause();
  expect(
    window.document.querySelector<HTMLButtonElement>(".bd-trigger")!.disabled,
  ).toBe(true);
  await window.happyDOM.abort();
});

test("date controls preserve readonly and month navigation does not skip February", async () => {
  const window = new Window({ url: "https://export.impexcube.in/" });
  window.document.body.innerHTML =
    '<input id="readonlyDate" readonly value="31/01/2024"><input id="invoiceDate" maxlength="10" value="31/01/2024">';
  Object.assign(window, { GM_addStyle: () => {} });
  Object.assign(globalThis, {
    window,
    document: window.document,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    Node: window.Node,
    MutationObserver: window.MutationObserver,
    Event: window.Event,
    getComputedStyle: window.getComputedStyle.bind(window),
  });
  const nativeInput =
    window.document.querySelector<HTMLInputElement>("#invoiceDate")!;
  let observed = "";
  let changed = "";
  nativeInput.onchange = () => {
    changed = nativeInput.value;
  };
  nativeInput.onblur = () => {
    observed = nativeInput.value;
  };
  const { installDates } = await import("../src/dates");
  installDates();
  await pause();
  const readonly =
    window.document.querySelector<HTMLInputElement>("#readonlyDate")!;
  expect(readonly.readOnly).toBe(true);
  const input =
    window.document.querySelector<HTMLInputElement>("#invoiceDate")!;
  input.value = "18 dec 2024";
  input.dispatchEvent(new window.Event("change", { bubbles: true }));
  expect(changed).toBe("18/12/2024");
  input.dispatchEvent(new window.FocusEvent("blur"));
  expect(observed).toBe("18/12/2024");
  input.value = "31/01/2024";
  input
    .parentElement!.querySelector<HTMLButtonElement>(".impex-date-btn")!
    .click();
  expect(
    [...window.document.querySelectorAll(".impex-quick-btn")].map(
      (button) => button.textContent,
    ),
  ).toEqual(["Today", "Yesterday"]);
  window.document
    .querySelector<HTMLButtonElement>('[data-action="next-month"]')!
    .click();
  expect(window.document.querySelector(".impex-cal-title")!.textContent).toBe(
    "Feb 2024",
  );
  await window.happyDOM.abort();
});
