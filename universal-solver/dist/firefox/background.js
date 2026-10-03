// Universal Captcha Solver 2.5.0. Copyright (C) quantavil.
// Licensed under GPL-3.0-or-later: https://github.com/quantavil/userscript/blob/main/universal-solver/LICENSE
// This program comes with ABSOLUTELY NO WARRANTY.
(() => {
  // src/ext/api.ts
  var g = globalThis;
  var ext = g.browser ?? g.chrome;
  var HTTP_PORT = "ucs-http";
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

  // src/ext/background.ts
  ext.runtime.onConnect.addListener((port) => {
    if (port.name !== HTTP_PORT)
      return;
    const ctrl = new AbortController;
    let timedOut = false;
    let timer;
    port.onDisconnect.addListener(() => {
      clearTimeout(timer);
      ctrl.abort();
    });
    port.onMessage.addListener((req) => {
      timer = setTimeout(() => {
        timedOut = true;
        ctrl.abort();
      }, req.timeout);
      relay(req, ctrl.signal).catch((e) => ({
        ok: false,
        error: timedOut ? "timeout" : "network",
        message: e instanceof Error ? e.message : String(e)
      })).then((res) => {
        clearTimeout(timer);
        if (!ctrl.signal.aborted || timedOut)
          port.postMessage(res);
      });
    });
  });
  async function relay(req, signal) {
    let body;
    if (req.body?.kind === "text")
      body = req.body.text;
    else if (req.body?.kind === "form") {
      const form = new FormData;
      for (const p of req.body.parts) {
        if (p.file)
          form.append(p.name, fromWire(p.file), p.file.name ?? "file");
        else
          form.append(p.name, p.text ?? "");
      }
      body = form;
    }
    const res = await fetch(req.url, { method: req.method, headers: req.headers, body, signal, credentials: "include" });
    let headers = "";
    res.headers.forEach((value, name) => {
      headers += `${name}: ${value}\r
`;
    });
    if (req.blob && res.ok)
      return { ok: true, status: res.status, text: "", headers, blob: await toWire(await res.blob()) };
    return { ok: true, status: res.status, text: await res.text(), headers };
  }
})();
