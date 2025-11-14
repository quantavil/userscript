// ==UserScript==
// @name         Beautiful Scrollbar — Themes
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Replaces minimap with a themed, beautiful scrollbar. Change theme from menu.
// @author       Your Name
// @match        *://*/*
// @run-at       document-start
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// ==/UserScript==

;(function(){
  'use strict'
  const DEFAULT_THEME = 'Midnight'
  const THEMES = {
    Midnight: { width: 12, track: '#0f1115', thumb: '#44576d', thumbHover: '#5a6e86', thumbActive: '#6f8aa6', corner: '#0f1115', ffWidth: 'thin', ffColors: '#44576d #0f1115' },
    Aurora: { width: 12, track: '#0b0f14', thumb: '#5BC0EB', thumbHover: '#4FA8E0', thumbActive: '#3F95D0', corner: '#0b0f14', ffWidth: 'thin', ffColors: '#5BC0EB #0b0f14' },
    Solar: { width: 12, track: '#edf2f7', thumb: '#cbd5e0', thumbHover: '#b7c3d0', thumbActive: '#a3b1c2', corner: '#edf2f7', ffWidth: 'auto', ffColors: '#96a5b3 #edf2f7' },
    Oceanic: { width: 12, track: '#0e141b', thumb: '#42b5a4', thumbHover: '#3aa092', thumbActive: '#2f867a', corner: '#0e141b', ffWidth: 'thin', ffColors: '#42b5a4 #0e141b' },
    Monochrome: { width: 12, track: '#1e1e1e', thumb: '#9e9e9e', thumbHover: '#bdbdbd', thumbActive: '#e0e0e0', corner: '#1e1e1e', ffWidth: 'thin', ffColors: '#9e9e9e #1e1e1e' }
  }
  let styleEl = null

  function getValue(k, d){ try{ if(typeof GM_getValue === 'function') return GM_getValue(k, d) }catch{} try{ const v = localStorage.getItem(k); return v == null ? d : v }catch{} return d }
  function setValue(k, v){ try{ if(typeof GM_setValue === 'function'){ GM_setValue(k, v); return } }catch{} try{ localStorage.setItem(k, v) }catch{} }

  function buildCSS(t){
    const w = t.width
    return `html, body, * { scrollbar-color: ${t.ffColors}; scrollbar-width: ${t.ffWidth}; }
*::-webkit-scrollbar { width: ${w}px; height: ${w}px; }
*::-webkit-scrollbar-track { background: ${t.track}; border-radius: 8px; }
*::-webkit-scrollbar-thumb { background: ${t.thumb}; border-radius: 10px; border: 3px solid ${t.track}; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.2); }
*::-webkit-scrollbar-thumb:hover { background: ${t.thumbHover}; }
*::-webkit-scrollbar-thumb:active { background: ${t.thumbActive}; }
*::-webkit-scrollbar-corner { background: ${t.corner}; }`
  }

  function applyTheme(name){
    const t = THEMES[name] || THEMES[DEFAULT_THEME]
    const css = buildCSS(t)
    if(typeof GM_addStyle === 'function'){ GM_addStyle(css); return }
    if(!styleEl){ styleEl = document.createElement('style'); styleEl.id = 'sb-theme'; (document.head || document.documentElement).appendChild(styleEl) }
    styleEl.textContent = css
  }

  let activeEl = null
  let settingsEl = null
  let settingsCssEl = null

  function isScrollable(node){
    if(!node || node.nodeType !== 1) return false
    const cs = getComputedStyle(node)
    if(cs.display === 'none') return false
    const oy = cs.overflowY, ox = cs.overflowX, o = cs.overflow
    const sy = /(auto|scroll)/.test(oy) || /(auto|scroll)/.test(o)
    const sx = /(auto|scroll)/.test(ox) || /(auto|scroll)/.test(o)
    if(!sy && !sx) return false
    return (sy && node.scrollHeight > node.clientHeight) || (sx && node.scrollWidth > node.clientWidth)
  }

  function findScrollableParent(el){
    if(!el) return document.scrollingElement || document.documentElement
    let c = el
    while(c && c !== document.documentElement){
      if(c === document.body) return document.scrollingElement || document.documentElement
      if(settingsEl && settingsEl.contains(c)) return activeEl || (document.scrollingElement || document.documentElement)
      if(isScrollable(c)) return c
      c = c.parentElement
    }
    return document.scrollingElement || document.documentElement
  }

  function setActive(el){
    const root = document.scrollingElement || document.documentElement
    activeEl = el || root
  }

  function getMetrics(){
    const root = document.scrollingElement || document.documentElement
    const el = activeEl && activeEl.isConnected ? activeEl : root
    const isMain = el === root
    if(isMain){
      return { el, isMain, scrollTop: root.scrollTop || window.pageYOffset || 0, scrollHeight: root.scrollHeight || document.body.scrollHeight || 0, viewportHeight: window.innerHeight || root.clientHeight || 0 }
    } else {
      return { el, isMain, scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, viewportHeight: el.clientHeight }
    }
  }

  function scrollToY(y){
    const root = document.scrollingElement || document.documentElement
    const el = activeEl && activeEl.isConnected ? activeEl : root
    if(el === root){ root.scrollTop = y } else { el.scrollTop = y }
  }

  function jumpToPercent(p){
    const m = getMetrics()
    const max = Math.max(0, m.scrollHeight - m.viewportHeight)
    scrollToY(p * max)
  }

  function openSettings(){
    const names = Object.keys(THEMES)
    const current = getValue('sbTheme', DEFAULT_THEME)
    if(!settingsCssEl){
      const css = `#sb-settings-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center}#sb-settings{background:#12161c;color:#e6edf3;min-width:320px;max-width:420px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.35);padding:18px;font:14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif}#sb-settings h2{margin:0 0 12px 0;font-size:16px;font-weight:600}#sb-list{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}#sb-list button{border:0;padding:10px 12px;border-radius:10px;background:#1a2029;color:#e6edf3;cursor:pointer;display:flex;align-items:center;justify-content:center}#sb-list button:hover{background:#222a35}#sb-actions{display:flex;gap:8px;margin-top:14px;justify-content:flex-end}#sb-actions button{border:0;padding:8px 12px;border-radius:8px;background:#2a3342;color:#e6edf3;cursor:pointer}#sb-actions button:hover{background:#354257}`
      settingsCssEl = document.createElement('style')
      settingsCssEl.id = 'sb-settings-css'
      settingsCssEl.textContent = css
      ;(document.head || document.documentElement).appendChild(settingsCssEl)
    }
    const overlay = document.createElement('div')
    overlay.id = 'sb-settings-overlay'
    const modal = document.createElement('div')
    modal.id = 'sb-settings'
    const title = document.createElement('h2')
    title.textContent = 'Scrollbar Theme'
    const list = document.createElement('div')
    list.id = 'sb-list'
    names.forEach(n=>{
      const b = document.createElement('button')
      b.textContent = n + (n===current?' ✓':'')
      b.addEventListener('click',()=>{ setValue('sbTheme', n); applyTheme(n); closeSettings() })
      list.appendChild(b)
    })
    const actions = document.createElement('div')
    actions.id = 'sb-actions'
    const closeBtn = document.createElement('button')
    closeBtn.textContent = 'Close'
    closeBtn.addEventListener('click',()=>closeSettings())
    actions.appendChild(closeBtn)
    modal.appendChild(title)
    modal.appendChild(list)
    modal.appendChild(actions)
    overlay.appendChild(modal)
    overlay.addEventListener('click',e=>{ if(e.target === overlay) closeSettings() })
    settingsEl = overlay
    ;(document.body || document.documentElement).appendChild(overlay)
    document.addEventListener('keydown', onSettingsKeyDown, { once: true })
  }

  function closeSettings(){
    if(settingsEl && settingsEl.parentNode){ settingsEl.parentNode.removeChild(settingsEl) }
    settingsEl = null
  }

  function onSettingsKeyDown(e){
    if(e.key === 'Escape') closeSettings()
  }

  function cycleTheme(){
    const names = Object.keys(THEMES)
    const current = getValue('sbTheme', DEFAULT_THEME)
    const i = Math.max(0, names.indexOf(current))
    const next = names[(i+1)%names.length]
    setValue('sbTheme', next)
    applyTheme(next)
  }

  const initial = getValue('sbTheme', DEFAULT_THEME)
  applyTheme(initial)

  if(typeof GM_registerMenuCommand === 'function'){
    GM_registerMenuCommand('Choose Scrollbar Theme', openSettings)
    GM_registerMenuCommand('Cycle Scrollbar Theme', cycleTheme)
  }

  setActive(document.scrollingElement || document.documentElement)
  document.addEventListener('mouseover',e=>{ if(settingsEl && settingsEl.contains(e.target)) return; const el = findScrollableParent(e.target); if(el !== activeEl) setActive(el) }, true)
  document.addEventListener('wheel',e=>{ if(settingsEl && settingsEl.contains(e.target)) return; const el = findScrollableParent(e.target); if(el !== activeEl) setActive(el) }, { passive: true })
  document.addEventListener('keydown',e=>{
    const t = e.target && e.target.tagName
    if(t === 'INPUT' || t === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return
    const k = (e.key||'').toLowerCase()
    if(k >= '0' && k <= '9'){
      e.preventDefault()
      if(k === '1'){ jumpToPercent(0); return }
      if(k === '0'){ jumpToPercent(1); return }
      jumpToPercent(parseInt(k,10)/10)
    }
  })
})()
