import { GM_addStyle } from '$';

export function injectStyles(panelWidth: number) {
  GM_addStyle(`
    /* Selected thumbnail highlight (no size/star ugly bar overlay) */
    figure.thumb.wh-selected {
      box-shadow: 0 0 0 4px #85a300 !important;
      outline: none !important;
      z-index: 10;
    }
    
    /* Remove original overlay border radius adjustment if selected */
    figure.thumb.wh-selected .thumb-info {
      border-radius: 0 0 4px 4px;
    }

    /* Resizable Sidebar Panel */
    #whPanel {
      position: fixed;
      top: 0; right: 0; bottom: 0;
      width: ${panelWidth}px;
      background: #1e1e1e;
      border-left: 1px solid #2a2c30;
      color: #eee;
      font-family: "Source Sans Pro", Arial, sans-serif;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    #whPanel *, #whPanel *::before, #whPanel *::after {
      box-sizing: border-box;
    }
    
    #whPanel .whp-header {
      padding: 12px 14px;
      background: #181818;
      border-bottom: 1px solid #2a2c30;
      font-weight: 700;
      font-size: 13px;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    #whPanel .whp-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
    }
    
    #whPanel .whp-empty {
      color: #777;
      text-align: center;
      margin-top: 40px;
      font-size: 13px;
    }
    
    #whPanel .whp-imgwrap {
      position: relative;
      cursor: zoom-in;
      border-radius: 4px;
      overflow: hidden;
      background: #111;
      border: 1px solid #2a2c30;
      margin-bottom: 15px;
    }
    
    #whPanel .whp-img {
      width: 100%;
      display: block;
    }
    
    #whPanel .whp-imghint {
      position: absolute;
      bottom: 6px; right: 8px;
      background: rgba(0,0,0,.7);
      color: #fff;
      font-size: 10px;
      padding: 3px 7px;
      border-radius: 3px;
      pointer-events: none;
    }
    
    #whPanel .whp-stats {
      display: flex;
      justify-content: space-around;
      align-items: center;
      padding: 8px 10px;
      background: #181818;
      border: 1px solid #2a2c30;
      border-radius: 4px;
      margin: 15px 0;
      font-size: 12px;
      font-weight: 600;
    }
    #whPanel .whp-stats .whp-res { color: #eee; }
    #whPanel .whp-stats .whp-fav { color: #fb3; }
    #whPanel .whp-stats .whp-size { color: #8ef; }
    
    #whPanel .whp-actions, #whPanel .whp-nav {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
    }
    
    #whPanel .whp-btn {
      flex: 1;
      background: #2a2c30;
      border: 1px solid #3d414a;
      color: #eee;
      padding: 8px 6px;
      border-radius: 4px;
      cursor: pointer;
      font: 600 12px "Source Sans Pro", Arial, sans-serif;
      text-align: center;
      transition: background 0.15s, border-color 0.15s;
    }
    
    #whPanel .whp-btn:hover:not(:disabled) {
      background: #3d414a;
      border-color: #515663;
    }
    
    #whPanel .whp-btn:disabled {
      opacity: .3;
      cursor: not-allowed;
    }
    
    #whPanel .whp-btn.whp-fav-active {
      background: #5c4d00;
      border-color: #85a300;
      color: #ffea7a;
    }
    
    #whPanel .whp-meta-loading {
      color: #888;
      font-size: 12px;
      text-align: center;
      padding: 10px 0;
    }
    
    #whPanel .whp-meta-list {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
    }
    
    #whPanel .whp-meta-list dt {
      color: #888;
      float: left;
      width: 90px;
      clear: left;
      font-weight: 600;
    }
    
    #whPanel .whp-meta-list dd {
      margin: 0 0 6px 90px;
      color: #ddd;
      word-break: break-word;
    }
    
    /* Resize Handle */
    .whp-resize-handle {
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 4px;
      cursor: col-resize;
      z-index: 100000;
      background: transparent;
      transition: background 0.2s;
    }
    .whp-resize-handle:hover, .whp-resize-handle.active {
      background: #85a300;
    }
    
    /* Showcase page section styles copied/adapted to match native theme */
    #whPanel h2 {
      font-size: 13px;
      color: #ad3;
      text-transform: uppercase;
      font-weight: 700;
      margin: 0 0 10px 0;
      letter-spacing: 0.5px;
    }
    
    /* Native tag styles adjustments for sidebar */
    #whPanel #tags {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    
    #whPanel #tags .tag {
      display: inline-block;
      margin: 0;
    }
    
    /* Lightbox Styling */
    #whLb {
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: rgba(0,0,0,.95);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: "Source Sans Pro", Arial, sans-serif;
    }
    #whLb.on {
      display: flex;
    }
    #whLb .whlb-img {
      max-width: 94vw;
      max-height: 84vh;
      object-fit: contain;
      border-radius: 4px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    #whLb .whlb-bar {
      position: absolute;
      top: 14px; left: 14px; right: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #fff;
      font-weight: 600;
      font-size: 14px;
    }
    #whLb .whlb-btns {
      display: flex;
      gap: 8px;
    }
    #whLb button.whlb-action {
      background: rgba(255,255,255,.1);
      border: 1px solid rgba(255,255,255,.15);
      color: #fff;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font: 600 12px "Source Sans Pro", Arial, sans-serif;
      transition: background 0.15s;
    }
    #whLb button.whlb-action:hover {
      background: rgba(255,255,255,.2);
      border-color: rgba(255,255,255,.3);
    }
    #whLb .whlb-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255,255,255,.05);
      border: none;
      color: #fff;
      font-size: 32px;
      width: 48px;
      height: 64px;
      cursor: pointer;
      border-radius: 4px;
      transition: background 0.15s, color 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #whLb .whlb-arrow:hover {
      background: rgba(255,255,255,.2);
    }
    #whLb .whlb-prev { left: 14px; }
    #whLb .whlb-next { right: 14px; }
    #whLb .whlb-loading {
      color: #fff;
      font-size: 16px;
      position: absolute;
      font-weight: 600;
    }
  `);
}
