# YouTube Video Filter

> Filter YouTube videos by views, upload date, and duration. Ignores Shorts.

## 🚀 Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Edge) or [Violentmonkey](https://violentmonkey.github.io/) (Firefox)
2. Click **[Install Script](link-to-script)** or create new script and paste the code
3. Refresh YouTube

## 📖 Usage

**Open Filter Panel:**  
Click the **⚙ FILTER** button on the right edge of the page

**Set Filters:**
- **Views:** Use format like `10K`, `1.5M`, or `1000000`
- **Date Range:** From = oldest, To = newest
- **Duration:** In minutes (e.g., `5` for 5min videos)

**Apply:**  
Click **Apply Filter** → Only matching videos show  
Click **Disable Filter** → Restore all videos  
Click **Reset** → Clear all filters

## ✨ Features

- ✅ Works on Home, Search, Subscriptions pages
- ✅ Survives page reloads (saves to localStorage)
- ✅ Ignores YouTube Shorts (never filtered)
- ✅ Real-time validation with helpful error messages
- ✅ Shows filtered count (`Showing X of Y videos`)

## 🔧 What's Fixed (v3.0)

- **Infinity storage bug** - Filters persist correctly after reload
- **Timezone issues** - Dates normalized to local time (no off-by-one errors)
- **Unknown metadata handling** - Videos without date/duration filtered properly
- **Performance** - Debounced DOM scanning for smooth scrolling

## 🎯 Examples

**Show popular recent videos:**
- Min Views: `100K`
- Date Range: From `2024-01-01` To `(today)`
- Apply

**Find long-form content:**
- Min Duration: `20` (minutes)
- Max Duration: `(leave empty)`
- Apply

**Filter out old videos:**
- Date Range: From `2023-01-01`
- Apply

## 📝 Notes

- Empty fields = no limit for that filter
- Shorts are **never** filtered (always visible)
- Filters only apply when **enabled** (green button)
- Unknown dates/durations are **hidden** when filters are active

