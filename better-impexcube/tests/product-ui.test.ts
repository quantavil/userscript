import { expect, test } from "bun:test";
import { Window } from "happy-dom";

test("product fields expose current values and the product grid is identified after updates", async () => {
  const window = new Window({
    url: "https://export.impexcube.in/frmEProductMainPage.aspx",
  });
  window.document.body.innerHTML =
    '<input id="ctl_tbProduct_TabPanel1_description" value="A long product description"><input id="other" value="Other">';
  Object.assign(globalThis, {
    window,
    document: window.document,
    location: window.location,
    Element: window.Element,
    HTMLInputElement: window.HTMLInputElement,
    HTMLTextAreaElement: window.HTMLTextAreaElement,
    MutationObserver: window.MutationObserver,
  });
  const { installProductUi } = await import("../src/product-ui");
  installProductUi();
  const input = window.document.querySelector<HTMLInputElement>("input")!;
  input.dispatchEvent(new window.Event("focusin", { bubbles: true }));
  expect(input.title).toBe("A long product description");
  input.value = "Updated description";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  expect(input.title).toBe("Updated description");
  const table = window.document.createElement("table");
  table.innerHTML =
    '<tr><th>Pro Des</th><th>RITC No</th></tr><tr><td><a href="#">Select</a></td><td>76169990</td></tr><tr><td><a href="#">Select</a></td><td>76169990</td></tr>';
  window.document.body.append(table);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(table.classList.contains("bic-product-table")).toBe(true);
  const links = table.querySelectorAll("a");
  links[0]!.focus();
  links[0]!.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "ArrowDown",
      altKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(window.document.activeElement).toBe(links[1]);
  await window.happyDOM.abort();
});
