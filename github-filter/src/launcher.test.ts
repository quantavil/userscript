import { beforeEach, describe, expect, it } from "vite-plus/test";
import { findLauncherTarget, placeLauncher } from "./launcher";

const size = (element: Element | null, width = 100, height = 20) => {
  if (!element) return;
  element.getBoundingClientRect = () => ({ width, height } as DOMRect);
};

const toolbarPage = () => {
  document.body.innerHTML = `
    <div id="controls">
      <div id="filter-wrap"><button data-testid="filter-button" type="button">Filter</button></div>
    </div>`;
  size(document.querySelector('[data-testid="filter-button"]'));
};

const sidebarPage = () => {
  document.body.innerHTML = `
    <div role="region" aria-labelledby="search-filters-title" id="filters">
      <h2>Filter by</h2>
      <div id="facets">
        <ul id="facet-list">
          <li><a href="/search?type=code">Code</a></li>
          <li id="advanced-row"><a href="/search/advanced">Advanced search</a></li>
        </ul>
      </div>
    </div>`;
  size(document.getElementById("filters"), 240, 600);
};

const phonePage = () => {
  document.body.innerHTML = `
    <div data-testid="search-sub-header" id="sub-header">
      <div id="header-row">
        <div id="controls"><div id="filter-wrap"><button data-testid="filter-button" type="button">Filter</button></div></div>
      </div>
    </div>`;
  size(document.querySelector('[data-testid="filter-button"]'));
  size(document.getElementById("sub-header"), 360, 80);
};

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("findLauncherTarget", () => {
  it("uses the visible filter toolbar when the desktop sidebar is absent", () => {
    toolbarPage();
    const target = findLauncherTarget();
    expect(target?.placement).toBe("toolbar");
    expect(target?.parent.id).toBe("controls");
    expect(target?.before?.id).toBe("filter-wrap");
  });

  it("uses the phone filter row when GitHub renders its compact toolbar", () => {
    phonePage();
    const target = findLauncherTarget();
    expect(target?.placement).toBe("row");
    expect(target?.parent.id).toBe("sub-header");
    expect(target?.before).toBeNull();
  });

  it("uses the top of the desktop Filter by sidebar", () => {
    sidebarPage();
    const target = findLauncherTarget();
    expect(target?.placement).toBe("sidebar");
    expect(target?.parent.id).toBe("facets");
    expect(target?.before?.id).toBe("facet-list");
  });

  it("ignores a zero-sized hidden filter button", () => {
    document.body.innerHTML = `
      <div id="controls"><div id="filter-wrap"><button data-testid="filter-button">Filter</button></div></div>
      <div role="region" aria-labelledby="search-filters-title" id="filters">
        <ul><li id="advanced-row"><a href="/search/advanced">Advanced search</a></li></ul>
      </div>`;
    size(document.querySelector('[data-testid="filter-button"]'), 0, 0);
    size(document.getElementById("filters"), 240, 600);
    const target = findLauncherTarget();
    expect(target?.placement).toBe("sidebar");
  });

  it("returns null when GitHub has no filter chrome", () => {
    document.body.innerHTML = "<main>No results</main>";
    expect(findLauncherTarget()).toBeNull();
  });
});

describe("placeLauncher", () => {
  it("wraps the button in a slot above the facet list and can move it again", () => {
    sidebarPage();
    const button = document.createElement("button");
    placeLauncher(button, findLauncherTarget());

    const item = document.querySelector(".ghf-launcher-item");
    expect(item?.contains(button)).toBe(true);
    expect(item?.nextElementSibling?.id).toBe("facet-list");
    expect(button.dataset.placement).toBe("sidebar");
  });

  it("inserts the phone row after the native results header", () => {
    phonePage();
    const button = document.createElement("button");
    placeLauncher(button, findLauncherTarget());

    const row = document.querySelector(".ghf-launcher-row");
    expect(row?.contains(button)).toBe(true);
    expect(row?.parentElement?.id).toBe("sub-header");
    expect(row?.nextElementSibling).toBeNull();
    expect(button.dataset.placement).toBe("row");
  });

  it("inserts before GitHub's native filter trigger when there is no sub-header", () => {
    toolbarPage();
    const button = document.createElement("button");
    placeLauncher(button, findLauncherTarget());

    expect(button.parentElement?.id).toBe("controls");
    expect(button.nextElementSibling?.id).toBe("filter-wrap");
    expect(button.dataset.placement).toBe("toolbar");
    expect(document.querySelector(".ghf-launcher-item")).toBeNull();
    expect(document.querySelector(".ghf-launcher-row")).toBeNull();
  });

  it("falls back to a fixed button in the body", () => {
    const button = document.createElement("button");
    placeLauncher(button, null);

    expect(button.parentElement).toBe(document.body);
    expect(button.dataset.placement).toBe("floating");
  });
});
