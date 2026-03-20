// src/styles.js – CSS injection for MobileVideoController
'use strict';

const MVC_Styles = {
    injectStyles() {
        if (document.getElementById('mvc-styles')) return;
        if (!document.head) return;
        const style = document.createElement('style');
        style.id = 'mvc-styles';
        style.textContent = `
            .mvc-ui-wrap { position:absolute; left:0; top:0; z-index:2147483647; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; display:none; opacity:0; pointer-events:none; transition:opacity .5s ease; will-change:opacity, transform; transform:translate3d(0,0,0); contain:layout paint; }

            /* Card panel */
            .mvc-panel { display:flex; align-items:center; gap:6px; background:rgba(18, 18, 20, 0.85); color:#fff; padding:6px; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.12); border-radius:16px; touch-action:none!important; user-select:none; -webkit-user-select:none; pointer-events:auto; cursor:grab; width:fit-content; transform:translate3d(0,0,0); will-change:transform; box-shadow: 0 8px 32px rgba(0,0,0,0.45); }

            /* Buttons */
            .mvc-btn { appearance:none; border:0; border-radius:12px; width:44px; height:36px; padding:0; font-size:16px; font-weight:600; text-align:center; line-height:1; pointer-events:auto; transition:transform .15s ease, background-color .2s, box-shadow .2s; user-select:none; display:flex; align-items:center; justify-content:center; touch-action:none!important; background:rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); }
            .mvc-btn:active { transform:scale(0.92); background:rgba(255,255,255,0.18); box-shadow: inset 0 0 10px rgba(0,0,0,0.2); }

            /* Speed pill */
            /* Speed pill */
            .mvc-btn-speed { width:auto; padding:0 12px; border-radius:12px; min-width:48px; color:#40c4ff; font-size:14px; font-weight:700; border:1px solid rgba(64,196,255,0.3); background:rgba(64,196,255,0.12); }

            /* Speed menu list */
            .mvc-speed-list { padding:0 !important; overflow:hidden; }
            .mvc-speed-list .mvc-menu-opt { margin:0 !important; border-radius:0 !important; border-bottom:1px solid rgba(255,255,255,0.15); padding:8px 12px; }
            .mvc-speed-list .mvc-menu-opt:last-child { border-bottom:none; }

            /* Colour accents */
            .mvc-btn-rewind   { color:#ff5252; }
            .mvc-btn-forward  { color:#69f0ae; }
            .mvc-btn-settings { color:#e0e0e0; opacity:0.9; }
            .mvc-btn.snapped  { color:#ffea00!important; text-shadow:0 0 5px rgba(255,234,0,0.5); border-color:#ffea00; }

            .mvc-skip-btn { appearance:none; border:0; border-radius:12px; padding:10px 18px; font-size:15px; font-weight:600; color:#fff; background:rgba(255,255,255,0.1); line-height:1.2; user-select:none; transition:background 0.2s; }
            .mvc-skip-btn:active { background:rgba(255,255,255,0.2); }

            .mvc-backdrop { display:none; position:fixed; inset:0; z-index:2147483646; background:rgba(0,0,0,.01); touch-action:none; }
            .mvc-toast { position:fixed; left:50%; bottom:60px; transform:translateX(-50%) translate3d(0,0,0); background:rgba(20,20,20,.85); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:10px 20px; border-radius:20px; z-index:2147483647; opacity:0; transition:opacity .35s ease; pointer-events:none; font-size:14px; font-weight:500; }
            .mvc-speed-toast { position:fixed; transform:translate(-50%,-50%) translate3d(0,0,0); background:rgba(20,20,20,.85); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:12px 24px; border-radius:16px; z-index:2147483647; font-size:24px; font-weight:600; opacity:0; transition:opacity .35s ease,color .2s linear; pointer-events:none; will-change:opacity,color; }
            .mvc-speed-toast.snapped { color:#69f0ae!important; }

            .mvc-menu { display:none; flex-direction:column; position:fixed; background:rgba(28,28,30,0.95); border-radius:18px; backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); border:1px solid rgba(255,255,255,0.1); box-shadow:0 12px 48px rgba(0,0,0,0.6); z-index:2147483647; min-width:60px; max-height:80vh; overflow-y:auto; pointer-events:auto; touch-action:manipulation; -webkit-tap-highlight-color:transparent; transform:translate3d(0,0,0); padding:4px; }
            .mvc-menu-opt { padding:6px 6px; font-size:15px; text-align:center; border-radius:8px; margin:2px 4px; user-select:none; cursor:pointer; transition:background .2s; }
            .mvc-menu-opt:active { background:rgba(255,255,255,0.15); }

            .mvc-settings-container { min-width: 320px; padding: 12px; display: flex; flex-direction: column; }
            .mvc-settings-section { display: flex; flex-direction: column; width: 100%; }
            .mvc-settings-card { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 12px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 12px; }
            .mvc-settings-row { display:flex; justify-content:space-between; align-items:center; gap:12px; cursor:default; background:transparent; margin:0; width: 100%; }
            .mvc-settings-label { color:rgba(255,255,255,0.9); white-space:nowrap; font-size:14px; font-weight: 500; }
            .mvc-settings-slider-wrap { display: flex; align-items: center; gap: 8px; flex-grow: 1; }
            .mvc-settings-value { color:rgba(255,255,255,0.7); font-variant-numeric:tabular-nums; min-width:48px; text-align:right; font-size:13px; font-weight: 500; background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 6px; }
            .mvc-settings-input  { width:60px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,0.1); color:white; border-radius:8px; text-align:center; font-size:14px; padding:6px; outline: none; transition: border-color 0.2s; }
            .mvc-settings-input:focus { border-color: #34c759; }
            .mvc-settings-select { background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,0.1); color:white; border-radius:8px; font-size:14px; padding:6px 10px; flex-grow:1; outline:none; transition: border-color 0.2s; cursor: pointer; }
            .mvc-settings-select:focus { border-color: #34c759; }
            .mvc-settings-slider { width:100%; flex-grow:1; accent-color:#34c759; height:4px; border-radius:2px; cursor: pointer; }
            .mvc-settings-btn { font-size:13px; font-weight: 500; padding:8px 14px; background:rgba(255,255,255,0.12); color:white; border:none; border-radius:8px; cursor:pointer; white-space:nowrap; transition:background .2s; outline: none; display: inline-flex; justify-content: center; align-items: center; flex: 1; }
            .mvc-settings-btn:active { background:rgba(255,255,255,0.25); }
            .mvc-btn-icon { background: rgba(64,196,255,0.15); color: #40c4ff; }
            .mvc-btn-icon:hover { background: rgba(64,196,255,0.25); }
            .mvc-btn-icon:active { background: rgba(64,196,255,0.35); }
            .mvc-btn-danger { background: rgba(255,82,82,0.15); color: #ff5252; }
            .mvc-btn-danger:hover { background: rgba(255,82,82,0.25); }
            .mvc-btn-danger:active { background: rgba(255,82,82,0.35); }
            .mvc-settings-section-title { font-size:12px; font-weight:700; color:rgba(235,235,245,0.6); text-transform:uppercase; letter-spacing:0.5px; margin-top:8px; margin-bottom:8px; padding:0 4px; text-align:left; border-top:none; cursor:default; }
        `;
        document.head.appendChild(style);
    }
};
