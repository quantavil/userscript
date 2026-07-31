# Greasy Fork Filter

A Tampermonkey/Greasemonkey userscript that adds a persistent filter panel to
Greasy Fork script listings. Hide low-quality scripts by install count, block
specific keywords or authors, and carry your settings across sessions.

---

## Usage

A small dark button appears in the bottom-right corner of every script listing
page. Click it to open the filter panel.

### Install threshold

Set minimum values for daily and total installs. Scripts below either threshold
are hidden immediately as you type. Both fields default to 0 (no filtering).

### Block keywords

Type a word or phrase and press Enter or click Block. The filter checks against
each script's name and description. Matching is exact — typing `mod menu` hides
only scripts containing that full phrase, not scripts containing just `mod` or
just `menu` independently. To block both words separately, add them as two
distinct entries.

### Reset all

Clears all thresholds, keywords, and authors in one click.

---

## Import and Export

Settings can be exported to a JSON file and re-imported later. This lets you
back up your configuration, share it with another browser profile, or transfer
it to a different machine.

**Export** — downloads `gf-filter-settings.json` to your default download folder.

**Import** — opens a file picker. Select a previously exported JSON file. Invalid
or malformed files are rejected with a notice; no existing settings are
overwritten on failure.

The JSON structure is:
```json
{
  "daily": 5,
  "total": 100,
  "keywords": ["cheat", "mod menu"],
}
```

You can edit this file manually before importing. All four keys are optional —
missing keys are ignored and existing settings for those keys are left unchanged.

---

## Filtering behaviour

Filtering runs at most once every 120ms regardless of how fast you type
(debounced). It also re-runs automatically if the page loads more scripts via
infinite scroll.

A script is hidden if any one of the following is true:

- Its daily install count is below the daily threshold
- Its total install count is below the total threshold
- Its name or description contains a blocked keyword phrase

---

## License

MIT