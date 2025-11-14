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

  function chooseTheme(){
    const names = Object.keys(THEMES)
    const current = getValue('sbTheme', DEFAULT_THEME)
    const input = prompt('Pick scrollbar theme:\n' + names.map((n,i)=>`${i+1}. ${n}`).join('\n'), current)
    if(!input) return
    let chosen = input.trim()
    const idx = parseInt(chosen, 10)
    if(!isNaN(idx) && idx >= 1 && idx <= names.length) chosen = names[idx-1]
    if(!THEMES[chosen]) return
    setValue('sbTheme', chosen)
    applyTheme(chosen)
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
    GM_registerMenuCommand('Choose Scrollbar Theme', chooseTheme)
    GM_registerMenuCommand('Cycle Scrollbar Theme', cycleTheme)
  }
})()