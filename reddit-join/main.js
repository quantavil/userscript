// ==UserScript==
// @name         Reddit community list Join buttons 
// @namespace    https://github.com/quantavil/reddit-join
// @version      0.4
// @description  Add Reddit's native Join/Joined button with 2-column grid layout
// @author       you
// @match        https://www.reddit.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Inject custom CSS to fix layout
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Force 2-column grid layout for community list */
      .community-list {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 1rem !important;
        width: 100% !important;
      }
      
      /* Remove flex-wrap that causes multiple columns */
      .community-list > div[data-community-id] {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        gap: 0.75rem !important;
        flex-wrap: nowrap !important;
        padding: 0.75rem !important;
        box-sizing: border-box !important;
        width: 100% !important;
      }
      
      /* Remove truncation and width restrictions */
      .community-list > div[data-community-id] h6,
      .community-list > div[data-community-id] a {
        overflow: visible !important;
        text-overflow: clip !important;
        white-space: normal !important;
        max-width: none !important;
        width: auto !important;
      }
      
      /* Title and description section - allow growth */
      .community-list > div[data-community-id] > div:not([style*="margin-left"]) {
        flex-grow: 1 !important;
        min-width: 0 !important;
        display: flex !important;
        flex-direction: column !important;
      }
      
      /* Position join button container inline */
      .community-list > div[data-community-id] > div[style*="margin-left"] {
        margin-left: auto !important;
        order: 3 !important;
        flex-shrink: 0 !important;
      }
      
      /* Ensure icon stays at start */
      .community-list > div[data-community-id] > span {
        order: 1 !important;
        flex-shrink: 0 !important;
      }
      
      /* Ensure rank number stays first */
      .community-list > div[data-community-id] > h6:first-child {
        order: 0 !important;
        flex-shrink: 0 !important;
        width: 2rem !important;
      }
      
      /* Text content container */
      .community-list > div[data-community-id] > div.flex-col {
        order: 2 !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Cache to avoid repeated about.json calls
  const subStateCache = new Map();

  function normalizeSubName(text) {
    if (!text) return null;
    return text
      .trim()
      .replace(/^\/?r\//i, '')
      .replace(/\/$/, '');
  }

  async function ensureSubscribedState(name, joinEl) {
    const norm = normalizeSubName(name);
    if (!norm) return;

    if (subStateCache.has(norm)) {
      const isSub = subStateCache.get(norm);
      applySubscribedAttr(joinEl, isSub);
      return;
    }

    try {
      const resp = await fetch(`https://www.reddit.com/r/${norm}/about.json`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json, text/javascript, */*; q=0.01'
        }
      });

      if (!resp.ok) return;

      const json = await resp.json();
      const data = json && json.data;
      const isSub = !!(data && data.user_is_subscriber);
      subStateCache.set(norm, isSub);
      applySubscribedAttr(joinEl, isSub);
    } catch (e) {
      console.error('Failed to check subscribed state for', norm, e);
    }
  }

  function applySubscribedAttr(joinEl, isSub) {
    if (!joinEl) return;
    if (isSub) {
      joinEl.setAttribute('subscribed', '');
    } else {
      joinEl.removeAttribute('subscribed');
    }
  }

  function processCommunityList(root = document) {
    const rows = root.querySelectorAll(
      '.community-list > div[data-community-id]'
    );

    rows.forEach((row) => {
      if (row.dataset.joinButtonInjected === '1') return;
      row.dataset.joinButtonInjected = '1';

      const communityId = row.dataset.communityId;
      let prefixed = row.dataset.prefixedName;

      if (!prefixed) {
        const link = row.querySelector('a[id^="/r/"], a[href^="/r/"]');
        if (link) {
          prefixed = (link.textContent || link.getAttribute('href') || '').trim();
        }
      }

      const normName = normalizeSubName(prefixed);
      if (!normName || !communityId) return;

      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.marginLeft = 'auto';

      const join = document.createElement('shreddit-join-button');
      join.setAttribute('name', `r/${normName}`);
      join.setAttribute('subreddit-id', communityId);
      join.setAttribute('buttonsize', 'medium');
      join.setAttribute('button-classes', 'px-sm py-xs');
      join.setAttribute('subscribe-label', 'Join');
      join.setAttribute('unsubscribe-label', 'Joined');
      join.setAttribute('unsubscribe-button-type-override', 'bordered');

      ensureSubscribedState(normName, join);

      container.appendChild(join);
      row.appendChild(container);
    });
  }

  function initObserver() {
    injectStyles();
    processCommunityList();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;

          if (
            node.matches('.community-list') ||
            node.querySelector?.('.community-list')
          ) {
            processCommunityList(node);
          } else if (
            node.matches('[data-community-id]') &&
            node.parentElement?.classList.contains('community-list')
          ) {
            processCommunityList(node.parentElement);
          }
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initObserver);
  } else {
    initObserver();
  }
})();
