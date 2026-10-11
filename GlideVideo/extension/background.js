// Firefox MV3 event page. Firefox does not run extension service workers, so
// this is declared under background.scripts — see manifest.json.
//
// Sole job: the toolbar button toggles GlideVideo for the current site, which
// is what GM_registerMenuCommand does in the userscript build. The key format
// (`disabled_<hostname>`) is shared with src/platform/extension-entry.ts.
const api = globalThis.browser ?? globalThis.chrome;

api.action.onClicked.addListener(async (tab) => {
  let key;
  try {
    // activeTab grants tab.url for the tab whose button was clicked.
    key = `disabled_${new URL(tab.url).hostname}`;
  } catch {
    return;
  }

  const stored = await api.storage.local.get(key);
  await api.storage.local.set({ [key]: !stored[key] });
  await api.tabs.reload(tab.id);
});
