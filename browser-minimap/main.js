// ==UserScript==
// @name         VSCode Minimap — Fast Scroll
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Compact, fast minimap with snap-to-section scrolling. Toggle with M. Numbers jump by percent.
// @author       Your Name
// @match        *://*/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

 (function () {
  'use strict';
  const MM_WIDTH = 120;
  const MIN_VP_PX = 18;
  const HOVER_THROTTLE_MS = 150;
  const START_HIDDEN = true;
  const TOGGLE_KEY = 'm';
  const SELECTORS = ['main','article','section','nav','aside','header','footer','h1','h2','h3','h4','h5','h6','p','pre','code','blockquote','img','table','ul','ol'].join(',');
  let initialized = false;
  let activeEl = null;
  let dragging = false;
  let dragStartY = null;
  let dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  let scheduled = false;
  let cacheInvalidated = true;
  let cachedElements = null;
  let headings = [];
  let host, shadow, mm, canvas, ctx, viewport;

  const CSS = `:host{position:fixed;top:0;right:0;width:${MM_WIDTH}px;height:100vh;z-index:2147483647;display:block}
  :host(.hidden){display:none}
  #mm{position:relative;width:100%;height:100%;cursor:crosshair;background:rgba(15,15,20,.45);border-left:1px solid rgba(255,255,255,.06)}
  #canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:crisp-edges}
  #viewport{position:absolute;left:0;width:100%;pointer-events:none;background:rgba(255,255,255,.1)}`;

  function init(){
    if(initialized||!document.body) return setTimeout(init,200);
    initialized=true; createShadowMinimap();
    setActive(document.scrollingElement||document.documentElement);
    attachGlobalListeners(); sizeCanvas(); scheduleRender();
  }

  function createShadowMinimap(){
    host=document.createElement('mm-minimap'); shadow=host.attachShadow({mode:'open'});
    const style=document.createElement('style'); style.textContent=CSS;
    mm=document.createElement('div'); mm.id='mm'; if(START_HIDDEN) host.classList.add('hidden');
    canvas=document.createElement('canvas'); canvas.id='canvas'; viewport=document.createElement('div'); viewport.id='viewport';
    mm.appendChild(canvas); mm.appendChild(viewport); shadow.appendChild(style); shadow.appendChild(mm); document.body.appendChild(host);
    ctx=canvas.getContext('2d',{alpha:false});
    mm.addEventListener('mousedown',e=>{ if(e.button!==0) return; dragging=true; dragStartY=e.clientY; e.preventDefault(); handlePointer(e.clientY); });
    window.addEventListener('mousemove',e=>{ if(!dragging) return; handlePointer(e.clientY); },{passive:true,capture:true});
    window.addEventListener('mouseup',()=>{ dragging=false; },{passive:true,capture:true});
    mm.addEventListener('click',e=>{ if(dragStartY!==null&&Math.abs(e.clientY-dragStartY)<3) handlePointer(e.clientY); dragStartY=null; });
    mm.addEventListener('wheel',e=>{ e.preventDefault(); const {scrollHeight,viewportHeight}=getMetrics(); const delta=Math.sign(e.deltaY)*Math.max(24,viewportHeight*0.15); scrollToY(clamp(getMetrics().scrollTop+delta,0,Math.max(0,scrollHeight-viewportHeight))); },{passive:false});
  }

  function isEventInsideMinimap(e){ const p=typeof e.composedPath==='function'?e.composedPath():[]; return p.includes(host)||p.includes(mm); }

  function sizeCanvas(){ const cssW=MM_WIDTH; const cssH=host.clientHeight||window.innerHeight||0; canvas.style.width=cssW+'px'; canvas.style.height=cssH+'px'; canvas.width=Math.max(1,Math.floor(cssW*dpr)); canvas.height=Math.max(1,Math.floor(cssH*dpr)); if(ctx&&ctx.setTransform) ctx.setTransform(dpr,0,0,dpr,0,0); }

  function setActive(el){
    const root=document.scrollingElement||document.documentElement; const a=el||root; if(a===activeEl) return;
    if(host&&(a===host||host.contains(a))) return;
    if(a!==root&&!isVisibleContainer(a)) return;
    if(activeEl) detachContainerListeners(activeEl); activeEl=a; cacheInvalidated=true; sizeCanvas(); scheduleRender();
  }

  function isVisibleContainer(node){ if(!node||node.nodeType!==1) return false; const cs=getComputedStyle(node); if(cs.display==='none'||cs.visibility==='hidden'||cs.opacity==='0') return false; const r=node.getBoundingClientRect(); if(r.width<=0||r.height<=0) return false; return isScrollable(node); }

  function isScrollable(node){ if(!node||node.nodeType!==1) return false; const cs=getComputedStyle(node); if(cs.display==='none') return false; const oy=cs.overflowY,ox=cs.overflowX,o=cs.overflow; const sy=/(auto|scroll)/.test(oy)||/(auto|scroll)/.test(o); const sx=/(auto|scroll)/.test(ox)||/(auto|scroll)/.test(o); if(!sy&&!sx) return false; return (sy&&node.scrollHeight>node.clientHeight)||(sx&&node.scrollWidth>node.clientWidth); }

  function findScrollableParent(el){ if(!el) return document.scrollingElement||document.documentElement; let c=el; while(c&&c!==document.documentElement){ if(c===document.body) return document.scrollingElement||document.documentElement; if(c===host) return activeEl||(document.scrollingElement||document.documentElement); if(isScrollable(c)) return c; c=c.parentElement; } return document.scrollingElement||document.documentElement; }

  function getMetrics(){ const root=document.scrollingElement||document.documentElement; if(!activeEl||!activeEl.isConnected) activeEl=root; const isMain=activeEl===root; if(isMain){ return {isMain,scrollTop:root.scrollTop||window.pageYOffset||0,scrollHeight:root.scrollHeight||document.body.scrollHeight||0,viewportHeight:window.innerHeight||root.clientHeight||0,containerRect:{top:0,left:0},containerWidth:window.innerWidth||root.clientWidth||1}; } else { const r=activeEl.getBoundingClientRect(); return {isMain,scrollTop:activeEl.scrollTop,scrollHeight:activeEl.scrollHeight,viewportHeight:activeEl.clientHeight,containerRect:r,containerWidth:activeEl.clientWidth||1}; } }

  function withRAF(fn){ if(scheduled) return; scheduled=true; requestAnimationFrame(()=>{ try{ fn(); } finally{ scheduled=false; } }); }
  function scheduleRender(){ withRAF(render); }
  function scheduleRenderLight(){ withRAF(render); }

  function render(){ if(!ctx) return; const cssW=canvas.clientWidth||0, cssH=canvas.clientHeight||0; if(!cssW||!cssH) return; ctx.fillStyle='rgba(18,18,22,0.9)'; ctx.fillRect(0,0,cssW,cssH);
    const {isMain,scrollHeight,containerRect,containerWidth}=getMetrics(); const scaleY=cssH/Math.max(1,scrollHeight); const root=isMain?(document.body||document.documentElement):activeEl;
    if(!root||!root.querySelectorAll){ updateViewport(); return; }
    if(cacheInvalidated){ try{ cachedElements=Array.from(root.querySelectorAll(SELECTORS)).filter(isVisibleElement); } catch{ cachedElements=[]; } headings=Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6,section,article')).filter(isVisibleElement).map(el=>{ const r=el.getBoundingClientRect(); const t=isMain?(r.top+(document.scrollingElement.scrollTop||window.pageYOffset||0)): (r.top-containerRect.top)+activeEl.scrollTop; return t; }).sort((a,b)=>a-b); cacheInvalidated=false; }
    const cw=Math.max(1,containerWidth);
    for(const el of cachedElements){ const rect=el.getBoundingClientRect(); const top=isMain? rect.top+(document.scrollingElement.scrollTop||window.pageYOffset||0) : (rect.top-containerRect.top)+activeEl.scrollTop; const left=isMain? rect.left : (rect.left-containerRect.left)+activeEl.scrollLeft; const height=rect.height, width=rect.width; if(height<=0||width<=8) continue; const x=Math.max(0,Math.min(cssW,(left/cw)*cssW)); const w=Math.max(1,Math.min(cssW-x,(width/cw)*cssW)); const y=Math.max(0,top*scaleY); const h=Math.max(1,height*scaleY); ctx.fillStyle=colorFor(el.tagName.toLowerCase()); ctx.fillRect(x,y,w,h);} updateViewport(); }

  function isVisibleElement(el){ if(!el||el.nodeType!==1) return false; const t=el.tagName; if(!t||t==='SCRIPT'||t==='STYLE'||t==='LINK'||t==='META'||t==='NOSCRIPT') return false; const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden'||cs.opacity==='0'||cs.position==='fixed') return false; const r=el.getBoundingClientRect(); return r.width>0&&r.height>0; }

  function colorFor(tag){ const m={h1:'#5BC0EB',h2:'#4FA8E0',h3:'#3F95D0',h4:'#2E86C1',h5:'#2278B6',h6:'#1B6AA7',a:'#4EC9B0',code:'#CE9178',pre:'#CE9178',blockquote:'#7CB342',img:'#C792EA',table:'#A5D6A7',ul:'#B2CCD6',ol:'#B2CCD6',li:'#B2CCD6',section:'#9CDCFE',article:'#9CDCFE',main:'#9CDCFE',aside:'#9CDCFE',nav:'#9CDCFE',header:'#9CDCFE',footer:'#9CDCFE',div:'#8A8A8A',span:'#6E6E6E',iframe:'#F78C6C'}; return m[tag]||'#7A7A7A'; }

  function updateViewport(){ if(!viewport) return; const {scrollTop,scrollHeight,viewportHeight}=getMetrics(); const h=canvas.clientHeight||0; if(!h||!scrollHeight){ viewport.style.top='0px'; viewport.style.height=MIN_VP_PX+'px'; return; } const s=h/Math.max(1,scrollHeight); viewport.style.top=Math.max(0,Math.floor(scrollTop*s))+'px'; viewport.style.height=Math.max(MIN_VP_PX,Math.floor(viewportHeight*s))+'px'; }

  function handlePointer(clientY){ const rect=canvas.getBoundingClientRect(); const h=Math.max(1,canvas.clientHeight||(rect.bottom-rect.top)); const y=clamp(clientY-rect.top,0,h); const {scrollHeight,viewportHeight}=getMetrics(); if(!scrollHeight) return; const target=(y/h)*scrollHeight-(viewportHeight/2); if(!dragging&&headings.length){ let best=0,bd=Infinity; for(const t of headings){ const d=Math.abs(t-target); if(d<bd){bd=d; best=t;} } scrollToY(clamp(best,0,Math.max(0,scrollHeight-viewportHeight))); } else { scrollToY(clamp(target,0,Math.max(0,scrollHeight-viewportHeight))); } }

  function scrollToY(y){ const root=document.scrollingElement||document.documentElement; const el=(!activeEl||!activeEl.isConnected)?root:activeEl; if(el===root) root.scrollTop=y; else el.scrollTop=y; }

  function jumpToPercent(p){ const {scrollHeight,viewportHeight}=getMetrics(); const max=Math.max(0,scrollHeight-viewportHeight); scrollToY(p*max); }

  function clamp(v,min,max){ return v<min?min:(v>max?max:v); }
  function attachGlobalListeners(){ let lastHoverCheck=0;
    document.addEventListener('mouseover',e=>{ if(isEventInsideMinimap(e)) return; const now=Date.now(); if(now-lastHoverCheck<HOVER_THROTTLE_MS) return; lastHoverCheck=now; const el=findScrollableParent(e.target); if(el!==activeEl) setActive(el); },true);
    document.addEventListener('wheel',e=>{ if(isEventInsideMinimap(e)) return; const el=findScrollableParent(e.target); if(el!==activeEl) setActive(el); },{passive:true});
    document.addEventListener('keydown',e=>{ const tag=e.target&&e.target.tagName; if(tag==='INPUT'||tag==='TEXTAREA'||(e.target&&e.target.isContentEditable)) return; const key=(e.key||'').toLowerCase(); if(key===TOGGLE_KEY){ e.preventDefault(); host.classList.toggle('hidden'); if(!host.classList.contains('hidden')){ cacheInvalidated=true; scheduleRender(); } return; } if(key>='0'&&key<='9'){ e.preventDefault(); if(key==='1'){ jumpToPercent(0); return;} if(key==='0'){ jumpToPercent(1); return;} jumpToPercent(parseInt(key,10)/10); } });
    window.addEventListener('resize',()=>{ dpr=Math.max(1,Math.min(3,window.devicePixelRatio||1)); sizeCanvas(); cacheInvalidated=true; scheduleRender(); },{passive:true});
  }

  function attachContainerListeners(){ if(!activeEl) return; const onScroll=()=>scheduleRenderLight(); const root=document.scrollingElement||document.documentElement; const options=activeEl===root?{passive:true,capture:true}:{passive:true}; const target=activeEl===root?window:activeEl; target.addEventListener('scroll',onScroll,options); activeEl.__mmScrollHandler=onScroll; activeEl.__mmScrollOptions=options; const observeTarget=activeEl===root?(document.body||document.documentElement):activeEl; const mo=new MutationObserver(()=>{ cacheInvalidated=true; scheduleRender(); }); try{ mo.observe(observeTarget,{childList:true,subtree:true,attributes:true}); } catch{} activeEl.__mmMutObserver=mo; }

  function detachContainerListeners(target){ const prev=target||(document.scrollingElement||document.documentElement); if(prev.__mmMutObserver){ try{ prev.__mmMutObserver.disconnect(); } catch{} delete prev.__mmMutObserver; } if(prev.__mmScrollHandler){ const root=document.scrollingElement||document.documentElement; const isMain=prev===root; const st=isMain?window:prev; const opt=prev.__mmScrollOptions||undefined; try{ st.removeEventListener('scroll',prev.__mmScrollHandler,opt); } catch{ st.removeEventListener('scroll',prev.__mmScrollHandler); } delete prev.__mmScrollHandler; delete prev.__mmScrollOptions; } }

  if(document.readyState==='complete'){ init(); } else { window.addEventListener('load',init,{once:true}); }
})();