import { describe, expect, it } from "bun:test";
import { catalogService } from "../src/catalog.ts";

describe("CatalogService", () => {
  it("should index and resolve plugin repos accurately", () => {
    catalogService.setCatalogData([
      {
        id: "lacuna.shell-suite",
        name: "Lacuna",
        description: "A complete shell suite",
        author: "OldJobobo",
        repo: "https://github.com/OldJobobo/lacuna-shell",
      },
      {
        id: "builtin-panel",
        name: "Builtin Panel",
        description: "Built-in panel",
        author: "Omarchy",
        repo: "",
        sourceUrl: "https://github.com/omacom/omarchy/tree/quattro/panel",
        builtIn: true,
      },
    ]);

    const lacuna = catalogService.getPlugin("lacuna.shell-suite");
    expect(lacuna).toBeDefined();
    expect(lacuna?.name).toBe("Lacuna");

    const repo1 = catalogService.getPluginRepo("lacuna.shell-suite");
    expect(repo1).toBe("https://github.com/OldJobobo/lacuna-shell");

    const repo2 = catalogService.getPluginRepo("builtin-panel");
    expect(repo2).toBe("https://github.com/omacom/omarchy/tree/quattro/panel");

    const repoNone = catalogService.getPluginRepo("unknown-id");
    expect(repoNone).toBeUndefined();
  });
});
