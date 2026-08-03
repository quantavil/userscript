# Better AlternativeTo

Userscript for [alternativeto.net](https://alternativeto.net). Puts an app's real
links on its card, pins a compact filter bar to the top of the page, and moves
dark mode out of the hamburger menu.

## What it changes

**Links on the cards.** Every card gains a row of chips — 🌐 Website, ❯ GitHub,
⬇ App Stores (Play, iOS, Steam, F-Droid, Flathub, …) and 💬 Social. No more
opening each app's page to find out where it lives.

**A filter bar that stays put.** The site's filter bar is `sticky`, but opening
its facet panel makes the bar taller than the viewport, at which point sticky
stops holding it. A slim bar is pinned under the header instead, carrying:

- a text filter over the apps on the current page
- a **likes range** (min / max)
- **Has website** and **Has source** toggles
- chips for the facets in the URL, each removable with one click
- a **Filters ▾** button that hides the site's own facet panel until you want
  it, then shows it exactly as the site draws it

The search, likes range and toggles are kept in `sessionStorage`, so they
survive paging through a listing and are cleared when the tab closes.

The site's facets are left in charge of server-side filtering, so their live
counts, their `+19 platforms` expanders and their soft navigation all keep
working. The search, likes range and link toggles filter the rendered page
instantly, client-side.

**Dark mode in the header.** A ☾ / ☀ button next to Sign In, instead of the item
buried in the hamburger menu. It drives the same `localStorage.theme` and
`<html data-theme>` the site uses, so it stays in sync with the menu item.

Works on every listing page — `/browse/new-apps/`, `/browse/all/`,
`/browse/all/?category=…`, tag and platform listings — and follows the site's
client-side navigation between them. The bar wraps to a phone-width layout
below 640px.

## Install

```bash
bun install
bun run build
```

Then add `dist/better-alternativeto.user.js` to Tampermonkey / Violentmonkey.

```bash
bun test          # unit tests for the parsing and filtering logic
bun run typecheck
```

## How the links are fetched

AlternativeTo is a Next.js app-router site. Requesting an app page with an
`RSC: 1` header returns the flight payload — about 110KB against 430KB for the
rendered HTML — and it contains `"externalLinks":[{name,url,type}]` verbatim.

Fetches are lazy (an `IntersectionObserver` fires when a card scrolls near the
viewport), capped at 4 in flight, deduplicated, and cached in `localStorage`
under `bat:links:<slug>` for 7 days. A full page scroll costs roughly 2–3MB the
first time and nothing on revisits.

## Notes

- The likes range and text filter apply to the 25 apps on the current page, not
  the whole site — AlternativeTo has no server-side likes filter. Pair them with
  **Sort → Likes** in the Filters panel to range over the top of the list.
- Nothing depends on the site's CSS class names, which are content-hashed per
  build and rewritten by React. Everything is keyed off `data-testid`
  attributes, and no class is ever added to a React-owned element — React drops
  those on its next render. Cards are hidden and marked with `data-` attributes
  for the same reason.
- Paging is a client-side navigation that reuses the card elements, rendering a
  different app into each one. Every card carries its app's slug in `data-bat`,
  so a node whose app changed is re-read and its old link row discarded.
- Colours come from the site's own CSS custom properties, so both themes are
  handled without a second palette.
