import { PANEL_ID as ID } from "./constants";

/** CSS injected via GM_addStyle on the Brave side. */
export const PANEL_CSS = `
  #${ID}{margin:12px 0;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.07);background:#161618;font-family:system-ui,-apple-system,sans-serif}
  #${ID}.float{position:fixed;right:16px;top:68px;width:400px;max-height:calc(100vh - 84px);overflow-y:auto;z-index:9999;box-shadow:0 8px 40px rgba(0,0,0,.55)}

  .${ID}-bar{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:linear-gradient(135deg,rgba(66,133,244,.06),rgba(99,102,241,.04));border-bottom:1px solid rgba(255,255,255,.05);position:relative}
  .${ID}-tag{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:700;color:#8e8e96;text-transform:uppercase;letter-spacing:.05em}
  .${ID}-acts{display:flex;gap:4px}

  .${ID}-btn{all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;padding:0 6px;border-radius:6px;font-size:13px;color:#707078;border:1px solid rgba(255,255,255,.07);transition:all .15s;text-decoration:none}
  .${ID}-btn:hover{color:#e0e0e4;border-color:rgba(255,255,255,.14)}

  .${ID}-toast{position:absolute;right:8px;top:calc(100% + 4px);background:#1e1e22;color:#e0e0e4;font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.1);opacity:0;transform:translateY(-4px);transition:all .2s;pointer-events:none;white-space:nowrap;z-index:10}
  .${ID}-toast.show{opacity:1;transform:translateY(0)}

  .${ID}-content{padding:16px;font-size:14px;line-height:1.6;color:#e0e0e4}
  .${ID}-content p,.${ID}-content div{margin-bottom:8px}
  .${ID}-content ul{margin:0 0 12px 20px;padding:0}
  .${ID}-content li{margin-bottom:6px}
  .${ID}-content strong,.${ID}-content b{color:#fff;font-weight:600}
  .${ID}-content mark{background:rgba(99,102,241,0.15);color:#a5a8ff;padding:0 3px;border-radius:4px;box-shadow:0 0 0 1px rgba(99,102,241,0.3)}
  .${ID}-content h3{font-size:15px;color:#fff;margin:16px 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em}
  .${ID}-content table{border-collapse:collapse;width:100%;margin:12px 0;font-size:13px;border-radius:6px;overflow:hidden}
  .${ID}-content th,.${ID}-content td{border:1px solid rgba(255,255,255,0.06);padding:10px;text-align:left}
  .${ID}-content th{background:rgba(255,255,255,0.03);font-weight:600;color:#fff}
  .${ID}-content tr:nth-child(even){background:rgba(255,255,255,0.015)}

  .${ID}-load{display:flex;flex-direction:column;align-items:center;gap:10px;padding:28px 16px;text-align:center}
  .${ID}-spin{width:22px;height:22px;border:2.5px solid rgba(255,255,255,.06);border-top-color:#6366f1;border-radius:50%;animation:${ID}-spin-anim .65s linear infinite}
  @keyframes ${ID}-spin-anim{to{transform:rotate(360deg)}}

  .${ID}-msg{font-size:12px;color:#707078;line-height:1.5}
  .${ID}-msg b{color:#a5a8ff}
  .${ID}-step{font-size:11px;color:#505058;margin-top:2px}

  .${ID}-err{padding:20px 14px;text-align:center;font-size:12px;color:#808088;line-height:1.5}
  .${ID}-cta{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;margin-top:10px;border-radius:7px;background:#6366f1;color:#fff;font-size:13px;font-weight:600;text-decoration:none}
  .${ID}-cta:hover{opacity:.85}

  /* KaTeX overflow guard */
  .${ID}-content [data-latex]{overflow-x:auto;overflow-y:hidden}
  .${ID}-content div[data-latex]{text-align:center;margin:1em 0}
`;