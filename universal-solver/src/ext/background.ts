import { ext, fromWire, HTTP_PORT, toWire, type WireRequest, type WireResponse } from './api.ts';

/**
 * Network relay for content scripts (the extension's GM_xmlhttpRequest). Holds the host
 * permission, so provider APIs and captcha media can be fetched regardless of the page's CORS.
 * Disconnecting the port aborts the request.
 */
ext.runtime.onConnect.addListener((port) => {
  if (port.name !== HTTP_PORT) return;
  const ctrl = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  port.onDisconnect.addListener(() => {
    clearTimeout(timer);
    ctrl.abort();
  });
  port.onMessage.addListener((req: WireRequest) => {
    timer = setTimeout(() => {
      timedOut = true;
      ctrl.abort();
    }, req.timeout);
    void relay(req, ctrl.signal)
      .catch(
        (e): WireResponse => ({
          ok: false,
          error: timedOut ? 'timeout' : 'network',
          message: e instanceof Error ? e.message : String(e),
        }),
      )
      .then((res) => {
        clearTimeout(timer);
        if (!ctrl.signal.aborted || timedOut) port.postMessage(res);
      });
  });
});

async function relay(req: WireRequest, signal: AbortSignal): Promise<WireResponse> {
  let body: BodyInit | undefined;
  if (req.body?.kind === 'text') body = req.body.text;
  else if (req.body?.kind === 'form') {
    const form = new FormData();
    for (const p of req.body.parts) {
      if (p.file) form.append(p.name, fromWire(p.file), p.file.name ?? 'file');
      else form.append(p.name, p.text ?? '');
    }
    body = form;
  }
  const res = await fetch(req.url, { method: req.method, headers: req.headers, body, signal, credentials: 'include' });
  let headers = '';
  res.headers.forEach((value, name) => {
    headers += `${name}: ${value}\r\n`;
  });
  if (req.blob && res.ok)
    return { ok: true, status: res.status, text: '', headers, blob: await toWire(await res.blob()) };
  return { ok: true, status: res.status, text: await res.text(), headers };
}
