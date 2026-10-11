// Firefox MV3 background script for SiteOrbit.
// Listens to toolbar action clicks and forwards toggle message to active tab.
const api = globalThis.browser ?? globalThis.chrome;

api.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  try {
    await api.tabs.sendMessage(tab.id, { type: 'site-orbit:toggle' });
  } catch (err) {
    // If tab doesn't have content script injected yet or is restricted page
    console.debug('[SiteOrbit] Could not send message to tab', err);
  }
});
