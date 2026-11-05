import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

const wait = () => new Promise((resolve) => setTimeout(resolve, 30));

describe("product form integration", () => {
  test("shows only the current RITC results and dispatches the original change handler", async () => {
    const window = new Window({ url: "https://export.impexcube.in/" });
    Object.assign(globalThis, {
      window,
      document: window.document,
      Element: window.Element,
      HTMLElement: window.HTMLElement,
      Node: window.Node,
      MutationObserver: window.MutationObserver,
      Event: window.Event,
      getComputedStyle: window.getComputedStyle.bind(window),
      unsafeWindow: { $find: () => ({ dispose() {} }) },
    });
    window.document.body.innerHTML =
      '<input id="tbProduct_TabPanel1_txtRitccode" value="76169990"><input id="tbProduct_TabPanel1_txtDBKSchNo">';
    const data = [
      {
        ActualDBK_SERNo: "7616B",
        ActualDBK_Desc: "Other articles",
        ActualDBKRate: "0",
      },
      {
        ActualDBK_SERNo: "761699B",
        ActualDBK_Desc: "Others",
        ActualDBKRate: "1.2",
      },
      {
        ActualDBK_SERNo: "761601B",
        ActualDBK_Desc: "Artware",
        ActualDBKRate: "1.7",
      },
    ];
    Object.assign(globalThis, {
      GM_xmlhttpRequest: (options: { onload: (response: unknown) => void }) =>
        options.onload({ status: 200, responseText: JSON.stringify(data) }),
    });
    const { installDbk } = await import("../src/dbk");
    installDbk();
    const input =
      window.document.querySelector<HTMLInputElement>("[id$=txtDBKSchNo]")!;
    let changes = 0;
    input.addEventListener("change", () => {
      changes++;
    });
    input.focus();
    await wait();
    expect(
      [...window.document.querySelectorAll(".bic-dbk-code")].map(
        (node) => node.textContent,
      ),
    ).toEqual(["7616B", "761699B", "761601B"]);
    const option = window.document.querySelectorAll(".bic-dbk-option")[1]!;
    option.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true }));
    expect(input.value).toBe("761699B");
    expect(changes).toBe(1);
    expect(
      window.document.querySelector<HTMLElement>(".bic-dbk-popup")!.hidden,
    ).toBe(true);
    const callbacks: Array<(response: unknown) => void> = [];
    Object.assign(globalThis, {
      GM_xmlhttpRequest: (options: { onload: (response: unknown) => void }) =>
        callbacks.push(options.onload),
    });
    const ritc =
      window.document.querySelector<HTMLInputElement>("[id$=txtRitccode]")!;
    input.value = "";
    ritc.value = "11111111";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
    ritc.value = "22222222";
    ritc.dispatchEvent(new window.Event("input", { bubbles: true }));
    expect(callbacks.length).toBe(2);
    callbacks[0]!({ status: 200, responseText: JSON.stringify(data) });
    await wait();
    expect(window.document.querySelectorAll(".bic-dbk-option").length).toBe(0);
    callbacks[1]!({
      status: 200,
      responseText: JSON.stringify([
        {
          ActualDBK_SERNo: "2222B",
          ActualDBK_Desc: "Current",
          ActualDBKRate: "1",
        },
      ]),
    });
    await wait();
    expect(window.document.querySelector(".bic-dbk-code")?.textContent).toBe(
      "2222B",
    );
    input.remove();
    await wait();
    expect(window.document.querySelector(".bic-dbk-popup")).toBeNull();
    window.happyDOM.abort();
  });
});
