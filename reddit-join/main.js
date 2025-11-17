// ==UserScript==
// @name         Reddit community list Join buttons 
// @namespace    https://github.com/quantavil/reddit-join
// @version      0.2
// @description  Add Reddit's native Join/Joined button to each subreddit row in .community-list, respecting already joined subs
// @author       you
// @match        https://www.reddit.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Cache to avoid repeated about.json calls
  const subStateCache = new Map(); // key: normalized subreddit name, value: true/false

  function normalizeSubName(text) {
    if (!text) return null;
    return text
      .trim()
      .replace(/^\/?r\//i, '') // remove leading /r/
      .replace(/\/$/, '');     // remove trailing slash
  }

  // Fetch /r/{name}/about.json and update the <shreddit-join-button>'s subscribed attribute
  async function ensureSubscribedState(name, joinEl) {
    const norm = normalizeSubName(name);
    if (!norm) return;

    // If cached, just apply and return
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

      if (!resp.ok) {
        // Could be not logged in or some other issue – default to unsubscribed
        return;
      }

      const json = await resp.json();
      const data = json && json.data;
      const isSub = !!(data && data.user_is_subscriber);
      subStateCache.set(norm, isSub);
      applySubscribedAttr(joinEl, isSub);
    } catch (e) {
      // Network or JSON error – ignore, button will just default to "Join"
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

  // Process all subreddit rows under .community-list
  function processCommunityList(root = document) {
    const rows = root.querySelectorAll(
      '.community-list > div[data-community-id]'
    );

    rows.forEach((row) => {
      if (row.dataset.joinButtonInjected === '1') return;
      row.dataset.joinButtonInjected = '1';

      const communityId = row.dataset.communityId; // e.g. t5_2qh33
      let prefixed = row.dataset.prefixedName;     // e.g. r/funny

      // Fallback: derive from anchor text or href
      if (!prefixed) {
        const link = row.querySelector('a[id^="/r/"], a[href^="/r/"]');
        if (link) {
          prefixed = (link.textContent || link.getAttribute('href') || '').trim();
        }
      }

      const normName = normalizeSubName(prefixed);
      if (!normName || !communityId) return;

      // Container aligned to the right
      const container = document.createElement('div');
      container.style.marginLeft = 'auto';
      container.style.display = 'flex';
      container.style.alignItems = 'center';

      // Use Reddit's own join component
      const join = document.createElement('shreddit-join-button');

      // Identity attributes (note: name can be with or without r/, both are seen in Reddit HTML)
      join.setAttribute('name', `r/${normName}`);
      join.setAttribute('subreddit-id', communityId);

      // Styling & labels to match your join/joined examples
      join.setAttribute('buttonsize', 'medium');
      join.setAttribute('button-classes', 'px-sm py-xs');
      join.setAttribute('subscribe-label', 'Join');
      join.setAttribute('unsubscribe-label', 'Joined');
      join.setAttribute('unsubscribe-button-type-override', 'bordered');

      // Ask Reddit API whether this sub is already joined for this user
      ensureSubscribedState(normName, join);

      container.appendChild(join);
      row.appendChild(container);
    });
  }

  function initObserver() {
    // First pass
    processCommunityList();

    // Watch for dynamic updates (infinite scroll / React rerenders)
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
