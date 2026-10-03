// Universal Captcha Solver 2.4.0. Copyright (C) quantavil.
// Licensed under GPL-3.0-or-later: https://github.com/quantavil/userscript/blob/main/universal-solver/LICENSE
// This program comes with ABSOLUTELY NO WARRANTY.
(() => {
  // src/ext/api.ts
  var g = globalThis;
  var ext = g.browser ?? g.chrome;
  var HTTP_PORT = "ucs-http";
  var MENU_MESSAGE = "ucs-menu";
  async function toWire(blob, name) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0;i < bytes.length; i += 32768)
      bin += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return { b64: btoa(bin), type: blob.type, name };
  }
  function fromWire(f) {
    const bin = atob(f.b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0;i < bin.length; i++)
      bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: f.type });
  }

  // src/ext/gm-shim.ts
  var cache = new Map;
  var listeners = new Map;
  var commands = new Map;
  var same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  ext.storage.onChanged.addListener((changes, area) => {
    if (area !== "local")
      return;
    for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
      if (same(newValue, cache.get(key)))
        continue;
      if (newValue === undefined)
        cache.delete(key);
      else
        cache.set(key, newValue);
      for (const fn of listeners.get(key) ?? [])
        fn(key, oldValue, newValue, true);
    }
  });
  var ready = ext.storage.local.get(null).then((all) => {
    for (const [k, value] of Object.entries(all))
      if (!cache.has(k))
        cache.set(k, value);
  });
  async function wireBody(body) {
    if (body === undefined || body === null)
      return;
    if (!(body instanceof FormData))
      return { kind: "text", text: String(body) };
    const parts = [];
    for (const [name, value] of body.entries()) {
      const v = value;
      if (typeof v === "string")
        parts.push({ name, text: v });
      else
        parts.push({ name, file: await toWire(v, v instanceof File ? v.name : undefined) });
    }
    return { kind: "form", parts };
  }
  function xhr(d) {
    let port = null;
    let done = false;
    const settle = () => {
      done = true;
      port?.disconnect();
    };
    (async () => {
      const req = {
        method: d.method ?? "GET",
        url: d.url,
        headers: d.headers,
        body: await wireBody(d.data),
        blob: d.responseType === "blob",
        timeout: d.timeout ?? 15000
      };
      if (done)
        return;
      port = ext.runtime.connect({ name: HTTP_PORT });
      port.onMessage.addListener((res) => {
        if (done)
          return;
        settle();
        if (res.ok) {
          d.onload?.({
            status: res.status,
            responseText: res.text,
            response: res.blob ? fromWire(res.blob) : undefined,
            responseHeaders: res.headers
          });
        } else if (res.error === "timeout")
          d.ontimeout?.(res);
        else
          d.onerror?.(res);
      });
      port.onDisconnect.addListener(() => {
        if (done)
          return;
        done = true;
        d.onerror?.({ error: "disconnected" });
      });
      port.postMessage(req);
    })().catch((e) => {
      if (done)
        return;
      done = true;
      d.onerror?.({ error: String(e) });
    });
    return {
      abort() {
        if (done)
          return;
        settle();
        d.onabort?.({});
      }
    };
  }
  var g2 = globalThis;
  g2.GM_getValue = (key, fallback) => cache.has(key) ? structuredClone(cache.get(key)) : fallback;
  g2.GM_setValue = (key, value) => {
    const plain = value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    cache.set(key, plain);
    ext.storage.local.set({ [key]: plain });
  };
  g2.GM_listValues = () => [...cache.keys()];
  g2.GM_addValueChangeListener = (key, fn) => {
    const set = listeners.get(key) ?? new Set;
    set.add(fn);
    listeners.set(key, set);
    return 0;
  };
  g2.GM_registerMenuCommand = (name, fn, accessKey) => {
    commands.set(accessKey ?? name, fn);
    return accessKey ?? name;
  };
  g2.GM_xmlhttpRequest = xhr;
  g2.__ucsReady = ready;
  ext.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    const m = msg;
    if (m?.type !== MENU_MESSAGE)
      return;
    const fn = m.cmd ? commands.get(m.cmd) : undefined;
    sendResponse({ ok: Boolean(fn) });
    fn?.();
    return;
  });
})();
