// ==UserScript==
// @name         Wallhaven Enhancer
// @namespace    https://github.com/quantavil/userscript/
// @version      1.1
// @description  Stats on thumbs + hover preview + click open + D download + arrow browse
// @match        *://wallhaven.cc/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        .wh-bar {
            position: absolute !important;
            bottom: 0 !important; left: 0 !important; right: 0 !important;
            z-index: 9999 !important;
            background: rgba(0,0,0,.88) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 4px 7px !important;
            font: 600 11px/1.3 Arial, sans-serif !important;
            color: #fff !important;
            pointer-events: none !important;
            gap: 5px !important;
            box-sizing: border-box !important;
        }
        .wh-bar .wr { color: #ccc; white-space: nowrap; }
        .wh-bar .wf { color: #f5c518; white-space: nowrap; }
        .wh-bar .ws { color: #8ef; white-space: nowrap; }
        figure.thumb { position: relative !important; }
        figure.thumb > .thumb-info { display: none !important; }

        #whOv {
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            max-width: 92vw; max-height: 88vh;
            width: auto; height: auto;
            background: rgba(15,15,15,0.96);
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 10px 50px rgba(0,0,0,0.9);
            display: none;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            z-index: 999999;
            cursor: pointer;
            pointer-events: auto;
        }
        #whOv.on { display: flex !important; }
        #whOv img {
            max-width: 100%; max-height: 78vh;
            object-fit: contain; border-radius: 4px;
        }
        #whOv img:not([src]), #whOv img[src=""] { display: none; }
        #whPb {
            color: #fff; font: 600 13px Arial; background: rgba(0,0,0,.75);
            padding: 6px 16px; border-radius: 5px; display: flex; gap: 16px;
            align-items: center;
        }
        #whPb:empty { display: none; }
        #whPb .bf { color: #f5c518; }
        #whPb .bs { color: #8ef; }
        #whPb .bh { color: #777; font-size: 11px; margin-left: 8px; }
        #whSp { color: #fff; font: 16px Arial; position: absolute; }
        #whSp:empty { display: none; }
    `);

    const ov = document.createElement('div'); ov.id = 'whOv';
    const sp = document.createElement('div'); sp.id = 'whSp';
    const pi = document.createElement('img');
    const pb = document.createElement('div'); pb.id = 'whPb';
    ov.append(sp, pi, pb);
    document.body.appendChild(ov);

    let cachedThumbs = [];
    let tmr = null, cur = null, abt = false, curData = null;
    let closeTimer = null;
    let activeHover = null; 
    
    const networkQueue = [];
    let isProcessingQueue = false;

    const isOpen = () => ov.classList.contains('on');

    const C = (() => {
        let d;
        try { d = JSON.parse(localStorage.getItem('whc2') || '{}'); } catch { d = {}; }
        return {
            get: id => d[id],
            set(id, v) {
                d[id] = v;
                const k = Object.keys(d);
                if (k.length > 2000) k.slice(0, k.length - 1500).forEach(x => delete d[x]);
                try { localStorage.setItem('whc2', JSON.stringify(d)); } catch {}
            }
        };
    })();

    function fmtSz(b) {
        if (!b) return '';
        if (b < 1024) return b + ' B';
        if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
        return (b / 1048576).toFixed(2) + ' MB';
    }

    function resolve(id, cb) {
        const c = C.get(id);
        if (c) return cb(c);
        const pre = id.substring(0, 2), exts = ['jpg', 'png', 'webp'];
        let i = 0;
        (function next() {
            if (i >= exts.length) return cb(null);
            const url = `https://w.wallhaven.cc/full/${pre}/wallhaven-${id}.${exts[i]}`;
            GM_xmlhttpRequest({
                method: 'HEAD', url,
                onload(r) {
                    if (r.status >= 200 && r.status < 400) {
                        const m = r.responseHeaders.match(/content-length:\s*(\d+)/i);
                        const v = { url, size: m ? +m[1] : 0 };
                        C.set(id, v); cb(v);
                    } else { i++; next(); }
                },
                onerror() { i++; next(); }
            });
        })();
    }

    function executeNextQueueItem() {
        if (isProcessingQueue || networkQueue.length === 0) return;
        isProcessingQueue = true;

        const task = networkQueue.shift();
        resolve(task.id, d => {
            task.cb(d);
            setTimeout(() => {
                isProcessingQueue = false;
                executeNextQueueItem();
            }, 50);
        });
    }

    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const thumb = entry.target;
                const id = thumb.getAttribute('data-wallpaper-id');
                if (id) {
                    networkQueue.push({
                        id,
                        cb: d => {
                            if (d) {
                                const wsEl = thumb.querySelector('.ws');
                                if (wsEl) wsEl.textContent = fmtSz(d.size);
                            }
                        }
                    });
                    executeNextQueueItem();
                }
                io.unobserve(thumb);
            }
        });
    }, { rootMargin: '200px' });

    function dlFile(url, name) {
        if (typeof GM_download === 'function') {
            GM_download({ url, name });
        } else {
            GM_xmlhttpRequest({
                method: 'GET', url, responseType: 'blob',
                onload(r) {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(r.response);
                    a.download = name;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
                }
            });
        }
    }

    function inject(thumb) {
        if (thumb.querySelector('.wh-bar')) return;
        const id = thumb.getAttribute('data-wallpaper-id');
        if (!id) return;
        const resEl = thumb.querySelector('.thumb-info .wall-res');
        const favEl = thumb.querySelector('.thumb-info .wall-favs');
        const bar = document.createElement('div');
        bar.className = 'wh-bar';
        bar.innerHTML =
            `<span class="wr">${resEl ? resEl.textContent.trim() : ''}</span>` +
            `<span class="wf">★ ${favEl ? favEl.textContent.replace(/[^\d]/g, '') : '0'}</span>` +
            `<span class="ws">…</span>`;
        thumb.appendChild(bar);
        io.observe(thumb);
    }

    function processAll() { 
        document.querySelectorAll('figure.thumb').forEach(inject); 
    }

    function startCloseTimer() {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => {
            if (!activeHover) hide();
        }, 250);
    }
    
    function clearCloseTimer() {
        clearTimeout(closeTimer);
    }

    function show(t) {
        const id = t.getAttribute('data-wallpaper-id');
        if (!id) return;
        
        if (!isOpen()) {
            cachedThumbs = [...document.querySelectorAll('figure.thumb[data-wallpaper-id]')];
        }

        cur = t; abt = false; curData = null;
        pi.removeAttribute('src'); pb.innerHTML = ''; sp.textContent = 'Loading…';
        ov.classList.add('on');
        
        resolve(id, d => {
            if (abt || cur !== t) return;
            if (!d) { sp.textContent = 'Failed'; return; }
            curData = d;
            
            const wsEl = t.querySelector('.ws');
            if (wsEl) wsEl.textContent = fmtSz(d.size);

            pi.src = d.url;
        });
    }

    pi.onload = () => {
        if (abt || !cur || !curData) return;
        sp.textContent = '';
        const r = cur.querySelector('.wr'), f = cur.querySelector('.wf');
        pb.innerHTML =
            `<span>📐 ${r ? r.textContent : ''}</span>` +
            `<span class="bf">⭐ ${f ? f.textContent : ''}</span>` +
            `<span class="bs">💾 ${fmtSz(curData.size)}</span>` +
            `<span class="bh">Click: open · D: save · ← →: browse</span>`;
    };

    pi.onerror = () => { 
        if (!abt && cur) sp.textContent = 'Failed'; 
    };

    function hide() {
        clearTimeout(tmr); tmr = null;
        clearTimeout(closeTimer); closeTimer = null;
        abt = true; cur = null; curData = null; cachedThumbs = []; activeHover = null;
        ov.classList.remove('on');
        sp.textContent = ''; pi.removeAttribute('src'); pb.innerHTML = '';
    }

    function navigate(dir) {
        if (!cur || cachedThumbs.length === 0) return;
        const idx = cachedThumbs.indexOf(cur);
        if (idx === -1) return;
        const t = cachedThumbs[idx + dir];
        if (t) { 
            abt = true; 
            show(t); 
            t.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    document.body.addEventListener('mouseover', e => {
        const t = e.target.closest('figure.thumb');
        const o = e.target.closest('#whOv');
        
        if (t) {
            activeHover = 'thumb';
            clearCloseTimer();
            if (t !== cur) {
                if (isOpen()) {
                    show(t);
                } else {
                    clearTimeout(tmr);
                    tmr = setTimeout(() => show(t), 250);
                }
            }
        } else if (o) {
            activeHover = 'overlay';
            clearCloseTimer();
        } else {
            activeHover = null;
            if (isOpen()) startCloseTimer();
        }
    });

    document.body.addEventListener('mouseout', e => {
        if (!e.relatedTarget) {
            activeHover = null;
            if (isOpen()) startCloseTimer();
        }
    });

    const handleManualScroll = () => {
        if (isOpen()) hide();
    };
    window.addEventListener('wheel', handleManualScroll, { passive: true });
    window.addEventListener('touchmove', handleManualScroll, { passive: true });

    ov.addEventListener('click', () => {
        if (cur) {
            const id = cur.getAttribute('data-wallpaper-id');
            if (id) window.open(`https://wallhaven.cc/w/${id}`, '_blank');
        }
    });

    document.addEventListener('keydown', e => {
        if (!isOpen()) return;
        switch (e.key) {
            case 'Escape': hide(); break;
            case 'ArrowLeft':  e.preventDefault(); navigate(-1); break;
            case 'ArrowRight': e.preventDefault(); navigate(1); break;
            case 'd': case 'D':
                if (!e.ctrlKey && !e.altKey && !e.metaKey && curData) {
                    e.preventDefault();
                    dlFile(curData.url, curData.url.split('/').pop());
                }
                break;
        }
    });

    processAll();
    
    const targetNode = document.querySelector('#thumbs, .thumb-list, main') || document.body;
    const observer = new MutationObserver(mutations => {
        let shouldProcess = false;
        for (let i = 0; i < mutations.length; i++) {
            if (mutations[i].target.closest('#whOv')) continue;
            const addedNodes = mutations[i].addedNodes;
            for (let j = 0; j < addedNodes.length; j++) {
                const node = addedNodes[j];
                if (node.nodeType === 1 && (node.matches('figure.thumb') || node.querySelector('figure.thumb'))) {
                    shouldProcess = true;
                    break;
                }
            }
            if (shouldProcess) break;
        }
        if (shouldProcess) processAll();
    });

    observer.observe(targetNode, { childList: true, subtree: true });
})();