# Reddit Community List – Native Join Buttons

Add Reddit’s native `Join/Joined` button to each subreddit row inside `.community-list` on `reddit.com`, using the official `shreddit-join-button` web component. The script detects whether you already subscribe to a subreddit and reflects the correct state.

## Features
- Injects Reddit’s native `shreddit-join-button` into each `.community-list` row.
- Checks `/r/{sub}/about.json` to respect existing subscriptions.
- Works with dynamically loaded content via a DOM observer.
- No special permissions required (`@grant none`).

## Installation
This is a userscript designed for browser managers like Tampermonkey, Violentmonkey, or Greasemonkey.

1. Install a userscript manager extension (e.g., Tampermonkey).
2. Create a new userscript.
3. Copy the contents of `reddit-join/main.js` into the new userscript.
4. Save the script.
5. Visit `https://www.reddit.com/` and open a page that contains a `.community-list` (e.g., community discovery/explore pages). Buttons will appear automatically.

## Usage
- On pages with a `.community-list`, each subreddit entry shows a `Join/Joined` button on the right.
- Clicking `Join` subscribes you to the subreddit; `Joined` indicates you’re already subscribed.
- If you are not logged in or the subscription state can’t be determined, the button defaults to `Join`.

## How It Works
- Normalizes subreddit names (e.g., `r/funny` → `funny`) and caches subscription state to avoid repeated requests.
- Fetches `https://www.reddit.com/r/{name}/about.json` with credentials to determine `user_is_subscriber`.
- Creates a `shreddit-join-button` for each row with appropriate attributes (name, subreddit ID, labels, and styles).
- Observes DOM mutations so newly added rows also receive buttons.

## Limitations & Notes
- Must be logged in for accurate subscription detection; otherwise it defaults to `Join`.
- Relies on Reddit’s current DOM (`.community-list`) and component APIs; changes by Reddit may require updates.
- Uses lightweight caching per session to reduce network calls.
- Network errors are ignored gracefully; the UI still offers `Join`.

## Development
- Edit `reddit-join/main.js` and reload the page to test changes.
- The script runs at `document-idle` and matches all `https://www.reddit.com/*` pages.