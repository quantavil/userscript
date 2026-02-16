import { BotState, Settings } from './state.js';
import { debounce } from './utils.js';
import { updateEvaluationBar } from './board.js';

export const ui = {
  menuWrap: null,
  setText(name, value, title) {
    if (!this.menuWrap) return;
    const el = this.menuWrap.querySelector(`[name="${name}"]`);
    if (!el) return;
    const state = el.querySelector('.itemState') || el.children[el.children.length - 1];
    if (state) {
      state.textContent = value ?? '-';
      if (title) state.title = title;
    }
  },
  updateDisplay(playingAs) {
    this.setText('currentEvaluation', BotState.currentEvaluation);
    this.setText('bestMove', BotState.bestMove);
    this.setText('pvDisplay', BotState.principalVariation, BotState.principalVariation);
    this.setText('statusInfo', BotState.statusInfo);

    updateEvaluationBar(BotState.currentEvaluation, playingAs);
  },
  Settings
};

export function buildUI() {
  // Create menu
  const menuWrap = document.createElement('div');
  menuWrap.id = 'menuWrap';
  const menuWrapStyle = document.createElement('style');

  menuWrap.innerHTML = `
  <div id="topText">
    <a id="modTitle">♟ GabiBot</a>
    <button id="minimizeBtn" title="Minimize (Ctrl+B)">─</button>
  </div>
  <div id="itemsList">
    <div name="enableHack" class="listItem">
      <input class="checkboxMod" type="checkbox">
      <a class="itemDescription">Enable Bot</a>
      <a class="itemState">Off</a>
    </div>
    <div name="autoMove" class="listItem">
      <input class="checkboxMod" type="checkbox">
      <a class="itemDescription">Auto Move</a>
      <a class="itemState">Off</a>
    </div>

    <div name="moveMethod" class="listItem">
      <input class="checkboxMod" type="checkbox">
      <a class="itemDescription">Drag Move</a>
      <a class="itemState">Off</a>
    </div>

    <div name="analysisMode" class="listItem">
      <input class="checkboxMod" type="checkbox">
      <a class="itemDescription">Local Only</a>
      <a class="itemState">Off</a>
    </div>

    <div class="divider"></div>

    <div name="premoveEnabled" class="listItem">
      <input class="checkboxMod" type="checkbox">
      <a class="itemDescription">Premove System</a>
      <a class="itemState">Off</a>
    </div>

    <div class="divider"></div>

    <div name="autoRematch" class="listItem">
      <input class="checkboxMod" type="checkbox">
      <a class="itemDescription">Auto Rematch</a>
      <a class="itemState">Off</a>
    </div>

    <div class="divider"></div>

    <div name="botPower" class="listItem">
      <input min="1" max="15" value="10" class="rangeSlider" type="range">
      <a class="itemDescription">Depth</a>
      <a class="itemState">12</a>
    </div>
    <div name="autoMoveSpeed" class="listItem">
      <input min="1" max="10" value="8" class="rangeSlider" type="range">
      <a class="itemDescription">Move Speed</a>
      <a class="itemState">4</a>
    </div>
    <div name="randomDelay" class="listItem">
      <input min="120" max="2000" value="300" class="rangeSlider" type="range">
      <a class="itemDescription">Random Delay (ms)</a>
      <a class="itemState">1000</a>
    </div>
    <div name="updateSpeed" class="listItem">
      <input min="1" max="10" value="8" class="rangeSlider" type="range">
      <a class="itemDescription">Update Rate</a>
      <a class="itemState">8</a>
    </div>

    <div class="divider"></div>

    <div name="currentEvaluation" class="listItem info-item">
      <a class="itemDescription">Eval:</a>
      <a class="itemState eval-value">-</a>
    </div>
    <div name="bestMove" class="listItem info-item">
      <a class="itemDescription">Best:</a>
      <a class="itemState">-</a>
    </div>
    <div name="pvDisplay" class="listItem info-item">
      <a class="itemDescription">PV:</a>
      <a class="itemState pv-text-state" title="Principal Variation">-</a>
    </div>
    <div name="statusInfo" class="listItem info-item">
      <a class="itemDescription">Status:</a>
      <a class="itemState status-text">Ready</a>
    </div>
  </div>
`;

  menuWrapStyle.innerHTML = `
  #menuWrap {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    border-radius: 8px;
    z-index: 9999999;
    display: grid;
    grid-template-rows: auto 1fr;
    width: 300px; max-height: 550px;
    position: fixed;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(20, 20, 20, 0.95);
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    user-select: none;
    top: 20px; right: 20px;
    transition: opacity 0.3s ease, transform 0.3s ease;
  }
  #menuWrap.minimized { grid-template-rows: auto 0fr; max-height: 50px; }
  #menuWrap.minimized #itemsList { overflow: hidden; opacity: 0; }
  #menuWrap.grabbing { cursor: grabbing !important; opacity: 0.9; }
  .divider { height: 1px; background: rgba(255, 255, 255, 0.1); margin: 10px 0; }
  .pv-text-state { color: #aaa !important; font-size: 11px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .eval-value { font-weight: bold; font-size: 14px; }
  .status-text { color: #4CAF50 !important; font-size: 11px; }
  .info-item { opacity: 0.8; margin-bottom: 8px !important; }
  #evaluationBarWrap {
    position: absolute;
    height: 100%;
    width: 20px;
    left: -28px;
    top: 0;
    background: #000;
    z-index: 50;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  #evaluationBarWhite { position: absolute; top: 0; left: 0; right: 0; background: #f0d9b5; transition: height 0.3s ease; }
  #evaluationBarBlack { position: absolute; bottom: 0; left: 0; right: 0; background: #000; transition: height 0.3s ease; }
  #topText { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;
    background: rgba(255, 255, 255, 0.05); border-bottom: 1px solid rgba(255, 255, 255, 0.1); cursor: move; }
  #modTitle { color: #fff; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; }
  #minimizeBtn { background: rgba(255, 255, 255, 0.1); border: none; color: #fff; width: 24px; height: 24px;
    border-radius: 4px; cursor: pointer; font-size: 14px; transition: background 0.2s; }
  #minimizeBtn:hover { background: rgba(255, 255, 255, 0.2); }
  #itemsList { overflow-y: auto; overflow-x: hidden; padding: 12px 16px; transition: opacity 0.3s ease; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
  ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
  .listItem { display: flex; align-items: center; margin-bottom: 12px; gap: 8px; }
  .checkboxMod { appearance: none; width: 18px; height: 18px; border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 4px;
    background: rgba(255, 255, 255, 0.05); cursor: pointer; position: relative; transition: all 0.2s; flex-shrink: 0; }
  .checkboxMod:checked { background: #4CAF50; border-color: #4CAF50; }
  .checkboxMod:checked::after { content: "✓"; position: absolute; color: white; font-size: 12px; top: 50%; left: 50%; transform: translate(-50%, -50%); }
  .rangeSlider { -webkit-appearance: none; flex: 1; height: 4px; border-radius: 2px; background: rgba(255, 255, 255, 0.1); outline: none; }
  .rangeSlider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #4CAF50; cursor: pointer; transition: transform 0.2s; }
  .rangeSlider::-webkit-slider-thumb:hover { transform: scale(1.2); }
  .itemDescription { color: rgba(255, 255, 255, 0.7); font-size: 12px; flex: 1; }
  .itemState { color: #fff; font-size: 12px; min-width: 35px; text-align: right; font-weight: 500; }
  #arrowCanvas { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; pointer-events: none !important; z-index: 100 !important; }
`;

  document.body.appendChild(menuWrap);
  document.body.appendChild(menuWrapStyle);
  ui.menuWrap = menuWrap;

  // Load Settings
  const saved = Settings.load();
  if (saved?.menuPosition) {
    menuWrap.style.top = saved.menuPosition.top || '20px';
    menuWrap.style.left = saved.menuPosition.left || '';
    menuWrap.style.right = saved.menuPosition.left ? 'auto' : '20px';
  }

  // Control binding helpers
  const getElementByName = (name, el) => el.querySelector(`[name="${name}"]`);
  const getInputElement = (el) => el.children[0];
  const getStateElement = (el) => el.children[el.children.length - 1];

  function bindControl(name, type, variable) {
    const modElement = getElementByName(name, menuWrap);
    if (!modElement) return;
    const modState = getStateElement(modElement);
    const modInput = getInputElement(modElement);
    const key = variable.replace('BotState.', '');
    if (type === 'checkbox') {
      modInput.checked = !!BotState[key];
      modState.textContent = BotState[key] ? 'On' : 'Off';
      if (name === 'moveMethod') {
        modInput.checked = BotState[key] === 'drag';
        modState.textContent = BotState[key] === 'drag' ? 'On' : 'Off';
      } else if (name === 'analysisMode') {
        modInput.checked = BotState[key] === 'local';
        modState.textContent = BotState[key] === 'local' ? 'On' : 'Off';
      }
      modInput.addEventListener('input', () => {
        if (name === 'moveMethod') {
          BotState[key] = modInput.checked ? 'drag' : 'click';
          modState.textContent = BotState[key] === 'drag' ? 'On' : 'Off';
        } else if (name === 'analysisMode') {
          BotState[key] = modInput.checked ? 'local' : 'hybrid';
          modState.textContent = BotState[key] === 'local' ? 'On' : 'Off';
        } else {
          BotState[key] = modInput.checked ? 1 : 0;
          modState.textContent = BotState[key] ? 'On' : 'Off';
        }
        Settings.save();
      });
    } else if (type === 'range') {
      modInput.value = BotState[key];
      modState.textContent = BotState[key];
      modInput.addEventListener('input', () => {
        let value = parseInt(modInput.value, 10);
        const min = parseInt(modInput.min, 10);
        const max = parseInt(modInput.max, 10);
        value = Math.max(min, Math.min(max, value));
        BotState[key] = value;
        modInput.value = value;
        modState.textContent = value;
        Settings.save();
      });
    }
  }

  bindControl('enableHack', 'checkbox', 'BotState.hackEnabled');
  bindControl('analysisMode', 'checkbox', 'BotState.analysisMode');
  bindControl('autoMove', 'checkbox', 'BotState.autoMove');
  bindControl('moveMethod', 'checkbox', 'BotState.moveMethod');
  bindControl('botPower', 'range', 'BotState.botPower');
  bindControl('autoMoveSpeed', 'range', 'BotState.autoMoveSpeed');
  bindControl('updateSpeed', 'range', 'BotState.updateSpeed');
  bindControl('randomDelay', 'range', 'BotState.randomDelay');
  bindControl('premoveEnabled', 'checkbox', 'BotState.premoveEnabled');

  bindControl('autoRematch', 'checkbox', 'BotState.autoRematch');

  // Drag/move panel
  makePanelDraggable(menuWrap);

  // Minimize
  document.getElementById('minimizeBtn').addEventListener('click', () => menuWrap.classList.toggle('minimized'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'b' && e.ctrlKey) {
      e.preventDefault();
      menuWrap.classList.toggle('minimized');
    }
  });
}

function makePanelDraggable(panel) {
  function clampToViewport() {
    const rect = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;

    panel.style.right = 'auto';

    let left = parseFloat(panel.style.left || rect.left);
    let top = parseFloat(panel.style.top || rect.top);

    left = Math.max(margin, Math.min(left, vw - rect.width - margin));
    top = Math.max(margin, Math.min(top, vh - rect.height - margin));

    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
  }

  function allowDragFromTarget(target, e) {
    if (e.altKey) return true;

    const rect = panel.getBoundingClientRect();
    const m = 14;
    const nearEdge =
      e.clientX <= rect.left + m ||
      e.clientX >= rect.right - m ||
      e.clientY <= rect.top + m ||
      e.clientY >= rect.bottom - m;

    if (nearEdge) return true;

    if (target.closest('input, select, textarea, button, label, a')) return false;

    return true;
  }

  function startDrag(e) {
    e.preventDefault();
    const startRect = panel.getBoundingClientRect();

    panel.classList.add('grabbing');
    panel.style.right = 'auto';
    panel.style.left = startRect.left + 'px';
    panel.style.top = startRect.top + 'px';

    const startX = e.clientX;
    const startY = e.clientY;

    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let newLeft = startRect.left + dx;
      let newTop = startRect.top + dy;

      const margin = 8;
      const maxLeft = Math.max(margin, vw - startRect.width - margin);
      const maxTop = Math.max(margin, vh - startRect.height - margin);
      newLeft = Math.min(Math.max(newLeft, margin), maxLeft);
      newTop = Math.min(Math.max(newTop, margin), maxTop);

      panel.style.left = newLeft + 'px';
      panel.style.top = newTop + 'px';
    };

    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      panel.classList.remove('grabbing');
      try { Settings.save(); } catch { }
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  panel.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (!allowDragFromTarget(e.target, e)) return;
    startDrag(e);
  });

  window.addEventListener('resize', clampToViewport);
  setTimeout(clampToViewport, 50);
}
