import { GM_addStyle } from '$';

export function injectStyles() {
  GM_addStyle(`
    :root { --wh-cell: 300px; --wh-cell-h: 200px; --wh-lime: #85a300; --wh-bg: #222; --wh-line: #2a2c30; }
    figure.thumb { width: var(--wh-cell) !important; height: var(--wh-cell-h) !important; position: relative; overflow: hidden; }
    figure.thumb img { width: 100% !important; height: 100% !important; object-fit: cover; }
    figure.thumb.wh-selected { box-shadow: 0 0 0 3px var(--wh-lime) !important; outline: none !important; z-index: 10; }

    /* Tidy rows when strips expand to different heights */
    #thumbs li { vertical-align: top; }

    /* Native hover info bar is redundant (our strip shows res/favs/type persistently)
       and clips mid-transition — hide it, keep fav toggle via proxied clicks. */
    figure.thumb .thumb-info { display: none !important; }

    /* Persistent detail strip BELOW every thumbnail: always visible, touch-safe */
    #thumbs .wh-below { width: var(--wh-cell); max-width: 100%; background: #161616; border: 1px solid var(--wh-line); border-top: none; border-radius: 0 0 6px 6px; padding: 6px 8px 8px; font-family: "Source Sans Pro", Arial, sans-serif; }
    #thumbs .whb-row { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-bottom: 6px; }
    #thumbs .wh-chip { display: inline-flex; align-items: center; gap: 4px; background: rgba(10,10,10,.78); color: #eee; font: 600 10.5px/1 "Source Sans Pro", Arial, sans-serif; font-variant-numeric: tabular-nums; padding: 4px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,.12); white-space: nowrap; }
    #thumbs .wh-chip svg { width: 11px; height: 11px; }
    #thumbs .wh-chip.wh-fav { color: #ffbb33; }
    #thumbs .wh-chip.wh-type { color: #8ef; }
    #thumbs .wh-dot { width: 9px; height: 9px; border-radius: 50%; border: 1px solid rgba(255,255,255,.4); display: inline-block; flex-shrink: 0; }
    /* Category dots avoid purity hues entirely (no green/yellow/red here) */
    #thumbs .wh-dot.wh-cat-anime { background: #f60; }
    #thumbs .wh-dot.wh-cat-general { background: #b07bff; }
    #thumbs .wh-dot.wh-cat-people { background: #4aa3ff; }
    /* Purity traffic-light: green SFW, yellow Sketchy, red NSFW */
    #thumbs .wh-dot.wh-pur-sfw { background: #6c6; }
    #thumbs .wh-dot.wh-pur-sketchy { background: #fc3; }
    #thumbs .wh-dot.wh-pur-nsfw { background: #f36; }

    /* Always-visible action buttons (min 34px touch targets) */
    #thumbs .whb-actions { display: flex; gap: 6px; }
    #thumbs .wh-btn { flex: 1; min-height: 34px; display: inline-flex; align-items: center; justify-content: center; background: #24262b; color: #fff; border: 1px solid #3d414a; border-radius: 6px; cursor: pointer; padding: 0; }
    #thumbs .wh-btn:hover { background: #2a2c30; border-color: var(--wh-lime); }
    #thumbs .wh-btn:active { transform: scale(.97); }
    #thumbs .wh-btn:focus-visible { outline: 2px solid var(--wh-lime); outline-offset: 1px; }
    #thumbs .wh-btn[data-state="loading"] { pointer-events: none; opacity: .8; }
    #thumbs .wh-btn[data-state="done"] { color: #8f8; border-color: #8f8; }
    #thumbs .wh-btn[data-state="error"] { color: #f88; border-color: #f88; }
    #thumbs .wh-btn.wh-fav-active { background: #5c4d00; border-color: var(--wh-lime); color: #ffea7a; }
    #thumbs .wh-btn.wh-more[data-open="1"] svg { transform: rotate(180deg); }
    #thumbs .wh-spin { animation: whspin 1s linear infinite; }
    @keyframes whspin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { #thumbs .wh-spin { animation: none; } #thumbs .wh-btn:active { transform: none; } }

    /* HD block inside the below-strip (opt-in 4KB fetch) */
    #thumbs .whb-full[hidden] { display: none; }
    #thumbs .whb-full { padding-top: 8px; font: 400 11.5px/1.5 "Source Sans Pro", Arial, sans-serif; color: #ddd; }
    #thumbs .whs-stats { display: flex; justify-content: center; align-items: center; gap: 4px; font-weight: 700; font-size: 12px; color: #ad3; margin-bottom: 8px; font-variant-numeric: tabular-nums; text-align: center; }
    #thumbs .whs-label { color: #888; font-weight: 600; margin-right: 4px; }
    #thumbs .whs-stats .whs-fav { display: inline-flex; align-items: center; gap: 4px; color: #fb3; }
    #thumbs .whs-stats svg { width: 12px; height: 12px; }
    #thumbs .whs-hint { color: #888; text-align: center; padding: 8px 0; }
    #thumbs .whs-props { display: grid; grid-template-columns: auto 1fr; gap: 3px 10px; margin: 0 0 8px 0; font-size: 11px; }
    #thumbs .whs-props dt { color: #888; font-weight: 600; }
    #thumbs .whs-props dd { margin: 0; word-break: break-word; color: #ddd; }
    #thumbs .whs-tags { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 5px; }
    #thumbs .whs-tags .tag { margin: 0; padding: 0; }
    #thumbs .whs-tags .tag a:hover { border-color: var(--wh-lime); }

    @media (max-width: 600px) {
      #thumbs .wh-below { padding: 6px 6px 8px; }
      #whGridNative { padding: 2px 6px; gap: 6px; }
      #whGridNative .whg-range { width: 70px; }
    }

    /* Native searchbar size control (form#searchbar .framed inherits site theme) */
    #whGridNative { display: inline-flex; align-items: center; gap: 8px; padding: 2px 10px; }
    #whGridNative .whg-icon { display: inline-flex; color: #ad3; }
    #whGridNative .whg-range { width: 90px; accent-color: var(--wh-lime); }
    #whGridNative .whg-val { color: #fff; font-weight: 700; min-width: 44px; }

    /* Grid size bar (fallback when no searchbar on page) */
    #whGridBar { position: fixed; left: 14px; bottom: 14px; z-index: 99990; display: flex; align-items: center; gap: 10px; background: rgba(20,20,20,.92); border: 1px solid var(--wh-line); border-radius: 10px; padding: 8px 12px; color: #eee; font: 600 12px "Source Sans Pro", Arial, sans-serif; }
    #whGridBar .whg-range { width: 130px; accent-color: var(--wh-lime); }
    #whGridBar .whg-val { color: #ad3; min-width: 44px; text-align: right; }
    #whGridBar .whg-reset { background: #2a2c30; color: #eee; border: 1px solid #3d414a; border-radius: 6px; padding: 4px 8px; cursor: pointer; font: inherit; }
    #whGridBar .whg-reset:hover { border-color: var(--wh-lime); }

    /* Lightbox */
    #whLb { position: fixed; inset: 0; z-index: 999999; background: rgba(0,0,0,.95); display: none; flex-direction: column; align-items: center; justify-content: center; font-family: "Source Sans Pro", Arial, sans-serif; }
    #whLb.on { display: flex; }
    #whLb .whlb-img { max-width: 94vw; max-height: 84vh; object-fit: contain; border-radius: 8px; }
    #whLb .whlb-bar { position: absolute; top: 14px; left: 14px; right: 14px; display: flex; justify-content: space-between; align-items: center; color: #fff; font-weight: 600; font-size: 14px; }
    #whLb .whlb-btns { display: flex; gap: 8px; }
    #whLb button.whlb-action { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.15); color: #fff; padding: 6px 12px; border-radius: 8px; cursor: pointer; font: 600 12px "Source Sans Pro", Arial, sans-serif; }
    #whLb button.whlb-action:hover { background: rgba(255,255,255,.2); }
    #whLb .whlb-arrow { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,.05); border: none; color: #fff; width: 48px; height: 64px; cursor: pointer; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    #whLb .whlb-arrow:hover { background: rgba(255,255,255,.2); }
    #whLb .whlb-prev { left: 14px; } #whLb .whlb-next { right: 14px; }
    #whLb .whlb-loading { color: #fff; font-size: 14px; position: absolute; font-weight: 600; }
  `);
}
