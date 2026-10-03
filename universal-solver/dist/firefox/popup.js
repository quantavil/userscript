// Universal Captcha Solver 2.4.0. Copyright (C) quantavil.
// Licensed under GPL-3.0-or-later: https://github.com/quantavil/userscript/blob/main/universal-solver/LICENSE
// This program comes with ABSOLUTELY NO WARRANTY.
(() => {
  // src/ext/api.ts
  var g = globalThis;
  var ext = g.browser ?? g.chrome;
  var MENU_MESSAGE = "ucs-menu";

  // src/ext/popup.ts
  var ALL = { origins: ["<all_urls>"] };
  var $ = (sel) => document.querySelector(sel);
  function say(text) {
    $("#msg").textContent = text;
  }
  async function run(cmd) {
    const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined)
      return say("No active tab.");
    try {
      const res = await ext.tabs.sendMessage(tab.id, { type: MENU_MESSAGE, cmd }, { frameId: 0 });
      if (res?.ok)
        window.close();
      else
        say("Not ready on this page yet. Reload the tab and try again.");
    } catch {
      say("Can’t run here. Browser pages (about:, add-on store) and tabs opened before install need a reload.");
    }
  }
  for (const btn of document.querySelectorAll("button[data-cmd]")) {
    btn.addEventListener("click", () => void run(btn.dataset.cmd ?? ""));
  }
  var grant = $("#grant");
  grant.addEventListener("click", () => {
    ext.permissions.request(ALL).then((ok) => {
      if (ok) {
        grant.hidden = true;
        say("Access granted. Reload the tab.");
      }
    });
  });
  ext.permissions.contains(ALL).then((ok) => {
    if (!ok) {
      grant.hidden = false;
      say("The solver needs access to websites to see captchas.");
    }
  });
})();
