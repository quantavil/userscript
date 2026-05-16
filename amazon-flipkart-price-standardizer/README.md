# Flipkart & Amazon Price Per Unit Standardizer

A **Tampermonkey / Violentmonkey** userscript that adds a **standardized price per unit** (₹/100 g, ₹/100 ml, or ₹/item) to product listings on **Flipkart** and **Amazon**.  
No more mental math – instantly compare combos, single packs, and multi‑buys at their **true cost**.

---

## Features

- **Smart combo detection**  
  Sums identical units in a combo (e.g., `2 × 100 ml` becomes `200 ml`), then shows `₹/100 ml`.  
  Mixed units (`100 ml + 50 g`) automatically fall back to a clear **₹/item** label.

- **“Each” pattern handling**  
  Titles like `… (100 ml Each)` are correctly multiplied by the item count.

- **Works across multiple Amazon page types**  
  - Normal search results (`s-search-result`)  
  - Best‑seller pages / “Today’s Deals” grids (`.p13n-sc-uncoverable-faceout`)  
  - Handles truncated titles by reading the full `aria-label`.

- **Bold, large font**  
  The unit price is displayed in **14px bold** for instant readability.

- **Non‑intrusive & lightweight**  
  Marks processed cards with `data-rate-done` to avoid duplicates.  
  Uses a `MutationObserver` for infinite‑scroll pages.

---

## Supported Sites

| Site        | URL pattern               |
|-------------|---------------------------|
| Flipkart    | `https://www.flipkart.com/*` |
| Amazon India| `https://www.amazon.in/*`   |
| Amazon US   | `https://www.amazon.com/*`  |

Other Amazon domains can be added by editing the `@match` lines.

---

## Installation

1. Install a userscript manager for your browser:  
   - [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Edge, Safari)  
   - [Violentmonkey](https://violentmonkey.github.io/) (Chrome, Firefox)

2. Click the **extension icon** → **“Create a new script”**.

3. Delete the default template and **paste the entire script** from the [`amazon-flipkart-price.user.js`](./amazon-flipkart-price.user.js) file (or from the code block below).

4. Save (`Ctrl + S` or `Cmd + S`).  
   The script will run automatically on supported pages.

---

## How It Looks

**Flipkart**  
![Flipkart example](https://img.shields.io/badge/example-soon-blue)  
Price: `₹293` → now shows **(₹146.50 / 100 ml)** right below the price.

**Amazon**  
Price: `₹239.00 (incl. GST)` → now shows **(₹99.58 / 100 ml)** if Amazon’s own unit label is missing.

---

## Customization

Want a different font size or colour?  
Edit the `font-size`, `font-weight`, or `color` values inside the two `el.style.cssText` blocks (one for Flipkart, one for Amazon).  

Example (change all to green):  
```javascript
el.style.cssText = `
    font-size: 14px; margin-top: 2px; font-weight: 700;
    color: #388e3c;
`;