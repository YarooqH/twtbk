# XMarks

**Save it on X. Find it in XMarks.**

> A privacy-first, local-first Chrome extension that lets you organize, search, and bulk-import your X (Twitter) bookmarks into a searchable reference library.

X's native bookmark feature is highly limited—folders are locked behind a paid X subscription, search only matches keywords in post text, and there are no tags, notes, or offline backups. For free users, it's a single, chaotic chronological list. **XMarks** solves this for everyone by embedding directly into your X interface and building a powerful, local-first reference database.

---

## Key Features

* 🚀 **Automated Bulk Importer**
  Open your native X Bookmarks page and click "Sync Bookmarks" in your sidebar. XMarks will automatically scroll through and index all your existing bookmarks in minutes, skipping duplicates. You can pause and resume the sync at any time.
* 🔒 **Local-First & Privacy-First**
  All your bookmark data, tags, categories, and notes are stored strictly inside your browser's `IndexedDB` database. There are no external databases, no cloud accounts, and no data leaks. Your data remains yours.
* 👤 **Separate Libraries, One Per X Account If You Want**
  Out of the box everything goes into one library. From the library menu in the dashboard sidebar you can add more libraries and choose which one new saves go to. In the same menu, turn on "Follow the X account I'm logged into" and XMarks saves each account's bookmarks to its own library, creating it the first time it sees that account; your existing library is linked to the first account it detects. All libraries live in the same browser profile, so anyone who can open that profile can open every library. Use separate Chrome profiles to keep people apart.
* 🤖 **Local AI Auto-Categorizer**
  Uses a semantic embedding model (~45MB, `all-MiniLM-L6-v2`) that runs locally via `Transformers.js` in the dashboard page. When enabled, it generates embeddings for each bookmark and cosine-matches them against your category names to auto-categorize your bookmarks. The model is downloaded once from Hugging Face the first time you turn the feature on and cached in your browser; after that it works offline, and your bookmark text never leaves your device.
* 🎨 **Clean 3-Column Dashboard**
  A full-page dashboard to search, browse, tag, and organize your bookmarks. Features a collapsible, X-style widget settings panel on the bottom-right for configuring save modes, accent colors, and AI settings.
* ⚡ **Seamless X Integration**
  Adds a pixel-perfect "Sync Bookmarks" button directly below X's native "Post" button that adapts to Light, Dim, and Dark themes. Features a space-aware popup menu that adjusts coordinates dynamically based on available viewport space.
* 📂 **Backup & Portability**
  Easy JSON data export and import tools so you can backup your library or transfer it to another browser.

---

## Technical Stack

* **Frontend:** React, TypeScript, Vite
* **Styling:** Vanilla CSS (X-matching HSL variables, fluid layouts, collapsible transitions)
* **Database:** IndexedDB (via Dexie.js)
* **Local NLP:** Transformers.js (`@huggingface/transformers` with `all-MiniLM-L6-v2`)
* **Extension Platform:** Chrome Extension Manifest V3 (MV3)

---

## Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* NPM (comes with Node.js)

### Installation & Development

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd twtbk
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the extension:**
   - For a production build:
     ```bash
     npm run build
     ```
   - For active development (with hot-reload):
     ```bash
     npm run dev
     ```

4. **Load the extension in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in the top-right corner)
   - Click **Load unpacked** (top-left)
   - Select the `dist` directory in your project folder

---

## Save Modes

XMarks supports two different modes of operation:
1. **Injected (Default):** Adds a dedicated XMarks save button beside native X actions on each tweet. Clicking it pops open a folder and tag picker to organize the bookmark on the spot.
2. **Native Override:** Captures when you click X's native bookmark button to automatically save a copy in your local XMarks library.

---

## License

[MIT](LICENSE)
