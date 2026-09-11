# InstaView — My Unfollowers (browser extension)

A **read-only** browser extension that shows **who doesn't follow you back** on Instagram and tracks **new unfollowers over time** — using your own logged-in session, in your own browser. No server, no passwords, no unfollow automation. All data stays local (`chrome.storage`).

Why an extension (and not the InstaView website): a page on another domain can't call Instagram's API with your session (browser same-origin rules). This extension runs the read on the `instagram.com` tab you're already logged into.

## Install (Chrome / Edge / Brave)

1. Go to `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Pin the **InstaView — My Unfollowers** icon.

## Use

1. Open **instagram.com** in a tab and make sure you're **logged in**.
2. Click the extension icon → **Scan my account**. Keep the popup open (a scan can take a minute; it paginates gently to respect rate limits).
3. You'll see three tabs:
   - **Don't follow back** — people you follow who don't follow you.
   - **New unfollowers** — followers you had at the last scan who are gone now.
   - **New followers** — people who followed you since the last scan.
4. The first scan is a **baseline**. Scan again later (hours/days) to see new unfollowers/new followers since then.

## How it works

- Reads `GET /api/v1/friendships/<you>/following/` and `/followers/` from the `instagram.com` origin using your session cookie and the public web app id — the same calls the Instagram website itself makes.
- Compares the current follower set against your last saved snapshot to compute changes.
- Read-only: it never follows or unfollows anyone.

## Limits & honesty

- Works only for **your own account** (the one you're logged into).
- Not affiliated with Instagram. Automated access to Instagram is against Instagram's Terms of Service; use at your own risk. It uses **your** session (doesn't bypass login) and paginates slowly, but heavy use can still trigger temporary rate limits.
- Very large accounts scan slowly and may be capped by the page-safety limits in `popup.js`.
- This is separate from the hosted InstaView app (which monitors any public profile via a data-provider API); this extension is a personal, own-account tool.
