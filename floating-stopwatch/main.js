// ==UserScript==
// @name         Floating Stopwatch
// @namespace    https://github.com/quantavil/userscript/
// @version      1.1
// @description  Tab-isolated stopwatch for any website
// @license      MIT
// @match        *://*/*
// @noframes
// @run-at       document-start
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'gs_sw_state';
    const FAB_KEY     = 'gs_sw_fab';
    const PAD         = (n) => String(n).padStart(2, '0');

    let fabEnabled = localStorage.getItem(FAB_KEY) === 'true';

    const DEFAULT_STATE = {
        isOpen: false,
        isRunning: false,
        baseTime: 0, 
        elapsed: 0,
        laps: [],
        lastLapTime: 0,
        pos: { left: 'auto', top: 'auto', right: '20px', bottom: '20px' }
    };

    let state = { ...DEFAULT_STATE };
    let shadow, rafId;
    let $display, $primary, $secondary, $laps, $fab, $panel, $host;

    function loadState() {
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY);
            if (saved) state = { ...DEFAULT_STATE, ...JSON.parse(saved) };
            state.pos = clampPos(state.pos);
        } catch (_) {}
    }

    function saveState() {
        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    }

    function clampPos(pos) {
        if (pos.left === 'auto') return pos;
        const x = Math.max(16, Math.min(parseInt(pos.left, 10), window.innerWidth  - 256));
        const y = Math.max(16, Math.min(parseInt(pos.top,  10), window.innerHeight - 240));
        return { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' };
    }

    function applyPos(el, pos) {
        Object.assign(el.style, { left: pos.left, top: pos.top, right: pos.right, bottom: pos.bottom });
    }

    function formatMs(ms) {
        ms = Math.max(0, ms);
        const totalSec = Math.floor(ms / 1000);
        const h  = Math.floor(totalSec / 3600);
        const m  = Math.floor((totalSec % 3600) / 60);
        const s  = totalSec % 60;
        const cs = PAD(Math.floor((ms % 1000) / 10));
        const main = h > 0 ? `${PAD(h)}:${PAD(m)}:${PAD(s)}` : `${PAD(m)}:${PAD(s)}`;
        return { main, cs };
    }

    function el(tag, props = {}, children = []) {
        const e = document.createElement(tag);
        Object.entries(props).forEach(([k, v]) => {
            if (k === 'cls') e.className = v;
            else if (k === 'id') e.id = v;
            else if (k === 'txt') e.textContent = v;
            else if (k === 'title') e.title = v;
            else if (k.startsWith('data-')) e.dataset[k.slice(5)] = v;
            else e[k] = v;
        });
        children.forEach(c => c && e.appendChild(c));
        return e;
    }

    function svgEl(tag, attrs = {}) {
        const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
        return e;
    }

    function setDisplay(ms) {
        const { main, cs } = formatMs(ms);
        $display.textContent = '';
        $display.appendChild(document.createTextNode(main));
        $display.appendChild(el('span', { cls: 'cs', txt: `.${cs}` }));
    }

    function renderLaps() {
        $laps.textContent = '';
        state.laps.forEach((lap, i) => {
            const sf = formatMs(lap.split);
            const tf = formatMs(lap.total);
            $laps.appendChild(el('div', { cls: 'lap' }, [
                el('span', { cls: 'lap-n', txt: `Lap ${state.laps.length - i}` }),
                el('span', { cls: 'lap-s', txt: `${sf.main}.${sf.cs}` }),
                el('span', { cls: 'lap-t', txt: `${tf.main}.${tf.cs}` }),
            ]));
        });
        $laps.style.display = state.laps.length ? 'block' : 'none';
    }

    function renderButtons() {
        const running = state.isRunning;
        $primary.textContent = running ? 'Pause' : 'Start';
        $primary.dataset.role = running ? 'pause' : 'play';
        $secondary.textContent = running ? 'Lap' : 'Reset';
        $secondary.dataset.role = running ? 'lap' : 'reset';
        $secondary.disabled = !running && state.elapsed === 0;
    }

    function renderAll() {
        setDisplay(state.isRunning ? Date.now() - state.baseTime : state.elapsed);
        renderButtons();
        renderLaps();
    }

    function tick() {
        if (!state.isRunning) return;
        setDisplay(Date.now() - state.baseTime);
        rafId = requestAnimationFrame(tick);
    }

    function onPrimary() {
        if (state.isRunning) {
            state.elapsed = Date.now() - state.baseTime;
            state.isRunning = false;
            cancelAnimationFrame(rafId);
        } else {
            state.baseTime = Date.now() - state.elapsed;
            state.isRunning = true;
            cancelAnimationFrame(rafId);
            tick();
        }
        renderButtons();
        saveState();
    }

    function onSecondary() {
        if (state.isRunning) {
            const now = Date.now() - state.baseTime;
            state.laps.unshift({ split: now - state.lastLapTime, total: now });
            state.lastLapTime = now;
            renderLaps();
        } else {
            cancelAnimationFrame(rafId);
            Object.assign(state, { elapsed: 0, baseTime: 0, laps: [], lastLapTime: 0, isRunning: false });
            renderAll();
        }
        renderButtons();
        saveState();
    }

    function togglePanel() {
        state.isOpen = !state.isOpen;
        saveState();
        applyVisibility();
    }

    function applyVisibility() {
        if (!$panel || !$fab) return;
        $panel.style.display = state.isOpen ? 'flex' : 'none';
        $fab.style.display = !state.isOpen && fabEnabled ? 'flex' : 'none';
    }

    function setupDrag(dragEl, handle) {
        let ox = 0, oy = 0;

        const onMove = (e) => {
            if (e.buttons === 0) return;
            const x = Math.max(0, Math.min(e.clientX - ox, window.innerWidth - dragEl.offsetWidth));
            const y = Math.max(0, Math.min(e.clientY - oy, window.innerHeight - dragEl.offsetHeight));
            dragEl.style.left = `${x}px`;
            dragEl.style.top = `${y}px`;
            dragEl.style.right = 'auto';
            dragEl.style.bottom = 'auto';
        };

        const onUp = (e) => {
            handle.releasePointerCapture(e.pointerId);
            handle.removeEventListener('pointermove', onMove);
            handle.removeEventListener('pointerup', onUp);
            if (dragEl === $panel) {
                state.pos = { left: dragEl.style.left, top: dragEl.style.top, right: 'auto', bottom: 'auto' };
                saveState();
            }
        };

        handle.addEventListener('pointerdown', (e) => {
            if (e.target.closest && e.target.closest('.close-btn')) return;
            e.preventDefault();
            handle.setPointerCapture(e.pointerId);
            const r = dragEl.getBoundingClientRect();
            ox = e.clientX - r.left;
            oy = e.clientY - r.top;
            handle.addEventListener('pointermove', onMove);
            handle.addEventListener('pointerup', onUp);
        });
    }

    const CSS = `
        :host {
            all: initial;
            position: fixed !important;
            top: 0; left: 0; width: 0; height: 0;
            z-index: 2147483647 !important;
            pointer-events: none;
            font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
            --gs-c-bg: rgba(15,15,18,0.92);
            --gs-c-border: rgba(255,255,255,0.09);
            --gs-c-text: #f0f0f2;
            --gs-c-muted: rgba(255,255,255,0.3);
            --gs-c-green: #34d399;
            --gs-c-red: #f87171;
            --gs-c-blue: #60a5fa;
            --gs-c-hover-bg: rgba(255,255,255,0.06);
            --gs-c-sep: rgba(255,255,255,0.05);
            --gs-blur: blur(18px);
            --gs-radius: 13px;
            --gs-shadow: 0 16px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08);
        }
        #fab {
            pointer-events: auto; position: fixed; bottom: 20px; right: 20px;
            width: 44px; height: 44px; border-radius: 50%;
            background: var(--gs-c-bg); backdrop-filter: var(--gs-blur);
            border: 1px solid var(--gs-c-border); box-shadow: var(--gs-shadow);
            color: var(--gs-c-text); font-size: 18px;
            display: none; align-items: center; justify-content: center;
            cursor: pointer; user-select: none;
            transition: transform 0.18s ease, background 0.18s ease;
        }
        #fab:hover { transform: scale(1.07); background: rgba(30,30,36,0.95); }
        #fab:active { transform: scale(0.94); }
        #panel {
            pointer-events: auto; position: fixed;
            background: var(--gs-c-bg); backdrop-filter: var(--gs-blur);
            border: 1px solid var(--gs-c-border); border-radius: var(--gs-radius);
            box-shadow: var(--gs-shadow); color: var(--gs-c-text); width: 240px;
            display: none; flex-direction: column; overflow: hidden; user-select: none;
        }
        .header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 10px 13px; cursor: grab; height: 28px; border-bottom: 1px solid var(--gs-c-sep);
            touch-action: none;
        }
        .header:active { cursor: grabbing; }
        .title { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--gs-c-muted); pointer-events: none; }
        .close-btn {
            all: unset; cursor: pointer; width: 22px; height: 22px; border-radius: 50%;
            display: inline-flex; align-items: center; justify-content: center;
            color: var(--gs-c-muted); transition: background 0.15s, color 0.15s;
        }
        .close-btn:hover { background: var(--gs-c-hover-bg); color: var(--gs-c-text); }
        .close-btn svg { width: 10px; height: 10px; display: block; pointer-events: none; }
        .display { font-size: 36px; font-weight: 300; text-align: center; padding: 20px 0 18px; letter-spacing: -1px; color: var(--gs-c-text); }
        .display .cs { font-size: 22px; opacity: 0.35; }
        .controls { display: flex; gap: 8px; padding: 0 13px 13px; }
        button {
            all: unset; cursor: pointer; flex: 1; text-align: center; padding: 8px 0; border-radius: 8px;
            font-size: 12px; font-weight: 500; border: 1px solid var(--gs-c-border); color: var(--gs-c-text);
            background: transparent; transition: background 0.15s, transform 0.1s;
        }
        button:active:not(:disabled) { transform: scale(0.96); }
        button:disabled { opacity: 0.22; cursor: default; }
        button[data-role="play"] { color: var(--gs-c-green); border-color: rgba(52,211,153,0.22); }
        button[data-role="play"]:hover { background: rgba(52,211,153,0.08); }
        button[data-role="pause"] { color: var(--gs-c-red); border-color: rgba(248,113,113,0.22); }
        button[data-role="pause"]:hover { background: rgba(248,113,113,0.08); }
        button[data-role="lap"], button[data-role="reset"] { color: var(--gs-c-blue); border-color: rgba(96,165,250,0.22); }
        button[data-role="lap"]:not(:disabled):hover, button[data-role="reset"]:not(:disabled):hover { background: rgba(96,165,250,0.08); }
        .laps { display: none; max-height: 120px; overflow-y: auto; border-top: 1px solid var(--gs-c-sep); }
        .laps::-webkit-scrollbar { width: 3px; }
        .laps::-webkit-scrollbar-thumb { background: var(--gs-c-muted); border-radius: 2px; }
        .lap { display: flex; justify-content: space-between; align-items: center; padding: 7px 13px; font-size: 11px; border-bottom: 1px solid var(--gs-c-sep); }
        .lap:last-child { border-bottom: none; }
        .lap-n { color: var(--gs-c-muted); min-width: 38px; }
        .lap-s { color: var(--gs-c-blue); }
        .lap-t { color: rgba(255,255,255,0.55); }
    `;

    function buildUI() {
        if (document.getElementById('gs-sw-root')) return;

        $host = document.createElement('div');
        $host.id = 'gs-sw-root';
        $host.style.cssText = 'all:initial;position:fixed!important;top:0;left:0;width:0;height:0;z-index:2147483647!important;pointer-events:none;';
        shadow = $host.attachShadow({ mode: 'closed' });

        const style = document.createElement('style');
        style.textContent = CSS;
        shadow.appendChild(style);

        $fab = el('div', { id: 'fab', title: 'Open Stopwatch', txt: '⏱' });
        shadow.appendChild($fab);

        const closeSvg = svgEl('svg', { viewBox: '0 0 10 10', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' });
        closeSvg.appendChild(svgEl('path', { d: 'M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5' }));
        const closeBtn = el('button', { cls: 'close-btn', title: 'Close' }, [closeSvg]);

        const header = el('div', { cls: 'header', id: 'drag-handle' }, [
            el('span', { cls: 'title', txt: 'Stopwatch' }),
            closeBtn,
        ]);

        $display = el('div', { cls: 'display', id: 'display' });
        $secondary = el('button', { id: 'btn-secondary', 'data-role': 'reset', disabled: true, txt: 'Reset' });
        $primary = el('button', { id: 'btn-primary', 'data-role': 'play', txt: 'Start' });
        
        $laps = el('div', { cls: 'laps', id: 'laps' });
        $panel = el('div', { id: 'panel' }, [header, $display, el('div', { cls: 'controls' }, [$secondary, $primary]), $laps]);
        shadow.appendChild($panel);

        document.documentElement.appendChild($host);
        applyPos($panel, state.pos);

        $fab.addEventListener('click', togglePanel);
        closeBtn.addEventListener('click', togglePanel);
        $primary.addEventListener('click', onPrimary);
        $secondary.addEventListener('click', onSecondary);
        setupDrag($panel, shadow.getElementById('drag-handle'));

        applyVisibility();
        renderAll();
        if (state.isRunning) tick();
    }

    GM_registerMenuCommand('⏱ Toggle Stopwatch', togglePanel);
    GM_registerMenuCommand('✨ Toggle FAB', () => {
        fabEnabled = !fabEnabled;
        localStorage.setItem(FAB_KEY, fabEnabled);
        applyVisibility();
    });

    document.addEventListener('visibilitychange', () => {
        if (state.isRunning) {
            cancelAnimationFrame(rafId);
            if (document.visibilityState === 'visible') tick();
        }
    });

    window.addEventListener('resize', () => {
        if (state.isOpen && state.pos.left !== 'auto') {
            state.pos = clampPos(state.pos);
            applyPos($panel, state.pos);
            saveState();
        }
    });

    loadState();
    buildUI();

    new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const removedNode of mutation.removedNodes) {
                if (removedNode === $host || removedNode.id === 'gs-sw-root') {
                    buildUI();
                    return;
                }
            }
        }
    }).observe(document.documentElement, { childList: true });
})();