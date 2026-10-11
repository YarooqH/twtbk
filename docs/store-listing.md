# Chrome Web Store submission sheet

Everything to paste into the [Developer Dashboard](https://chrome.google.com/webstore/devconsole/), field by field. The step-by-step plan is in [publish_plan.md](publish_plan.md).

## Package

- Upload: `release/xmarks-v1.0.0.zip` (5.5 MB, `manifest.json` at the root).
- To rebuild it after a change: bump `version` in `manifest.json`, run `npm run build`, then zip the **contents** of `dist/` with forward-slash paths. Don't use PowerShell's `Compress-Archive`: it writes backslash paths, which the store can reject.

## Store listing tab

**Name** (from the manifest): `XMarks: Bookmark Manager for X`

**Summary** (from the manifest, 113/132 characters):
`Search, sort and add notes to your X (Twitter) bookmarks. Free, no account, and everything stays in your browser.`

**Description** (plain text; the store doesn't render Markdown):

```text
You said you'd read it later. Now you can find it.

XMarks turns your X (Twitter) bookmarks into a library you can search, sort into categories and add notes to. It all stays in your browser: no account, no server, no tracking.

BRING IN WHAT YOU'VE ALREADY SAVED
Open your Bookmarks on X and click Sync Bookmarks. XMarks scrolls through the list and keeps a copy of every post, skipping ones it already has. Pause and pick up later at any time.

SAVE NEW POSTS AS YOU SCROLL
A book button sits in every post's action bar. Click it, pick a category and add a note. Or keep using X's own bookmark button and let XMarks save a copy.

FIND ANYTHING
• Search post text, quoted posts, authors, tags and your notes
• Color-coded categories, tags and private notes
• Tick several posts to move, export or delete them in one go
• Keyboard shortcuts: / to search, E to edit a note, C for a new category, ? for the full list
• Four card densities, light and dark themes, and your choice of accent color

KEEP IT
• Saved posts stay readable even if the author deletes them or goes private (images still load from X)
• Export your whole library, or just selected posts, to a JSON file and import it in another browser

OPTIONAL AUTO-CATEGORIZE
Turn it on and XMarks sorts posts into your categories with a small AI model that runs in your browser. The model is downloaded once from Hugging Face when you switch it on; your bookmarks are never sent anywhere. It's off until you turn it on.

PRIVATE BY DESIGN
Your library lives in your browser's own storage. There is no XMarks account and no XMarks server, so we never see your bookmarks. Free and open source (MIT): https://github.com/YarooqH/twtbk

XMarks is not affiliated with X Corp.
```

**Category:** Productivity → Workflow & Planning (or Tools)

**Language:** English

**Graphic assets**

| Field | File | Size |
| --- | --- | --- |
| Store icon | `public/icon-128.png` | 128×128 |
| Screenshot 1 | `store-assets/output/01-dashboard.jpg` | 1280×800 |
| Screenshot 2 | `store-assets/output/05-timeline-popover.jpg` | 1280×800 |
| Screenshot 3 | `store-assets/output/09-sync-panel.jpg` | 1280×800 |
| Screenshot 4 | `store-assets/output/02-dashboard-search.jpg` | 1280×800 |
| Screenshot 5 | `store-assets/output/04-timeline-button.jpg` | 1280×800 |
| Small promo tile (required) | `store-assets/output/promo-small-440x280.jpg` | 440×280 |
| Marquee promo tile (optional) | `store-assets/output/promo-marquee-1400x560.jpg` | 1400×560 |

Regenerate the screenshots with `npm run capture` and the promo tiles with `npm run marketing` (both in `store-assets/`).

**Homepage URL:** `https://yarooqh.github.io/twtbk/`
**Support URL:** `https://github.com/YarooqH/twtbk/issues`

## Privacy practices tab

**Single purpose:**

```text
XMarks saves the user's X (Twitter) bookmarks into a local library in their browser, where they can search, categorize, tag and annotate them.
```

**Permission justifications:**

`storage`
```text
Stores the user's settings (save mode, button position, accent color, theme, card density) and onboarding progress.
```

`unlimitedStorage`
```text
The user's bookmark library (post text, categories, tags and notes) is kept in IndexedDB on their device. Libraries of several thousand posts can exceed the default storage quota, and losing saved bookmarks to quota eviction would lose user data.
```

Host permissions (`*://*.x.com/*`, `*://*.twitter.com/*`)
```text
The extension adds its save button to posts on X, shows the category picker next to it, and reads a post's content from the page when the user saves it. Sync Bookmarks reads the user's own Bookmarks page on X to import their existing bookmarks. It runs on no other sites.
```

**Remote code:** No, I am not using remote code.

```text
All JavaScript and WebAssembly ships in the package, including the ONNX runtime used by the optional auto-categorize feature (wasm/). When the user turns that feature on, the extension downloads model weights (Xenova/all-MiniLM-L6-v2) from huggingface.co. These are data files, not executable code.
```

**Data usage:** nothing the extension stores leaves the user's device, so no category is collected in the sense of being sent to the developer. If you'd rather be conservative, tick **Website content** (the extension stores the text of posts the user saves, locally). Then tick all three certifications:

- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** `https://yarooqh.github.io/twtbk/privacy/` (deploy the landing site before submitting, so this page is live).

## Distribution tab

- Payments: Free
- Visibility: Public
- Regions: All regions

## Notes for the reviewer (submission dialog)

```text
To test: sign in to x.com in the browser, then
1. Scroll the Home timeline. Each post has a book button in its action bar; click it to save the post and pick a category.
2. Open x.com/i/bookmarks and click "Sync Bookmarks" in the left sidebar to import existing bookmarks.
3. Click the extension's toolbar icon, then "Open Full Dashboard" to search and organize saved posts.

Auto-categorize (dashboard, AI Assistant panel) is optional and off by default. Turning it on downloads model weights from huggingface.co; the ONNX runtime that runs them is bundled in the package (wasm/). No user data leaves the device.
```
