# Twitter Bookmark Library Extension Plan

## Product Goal

Build a Chrome extension for X (formerly Twitter) that lets users save tweets
to a personal library, organize them into categories, and import their existing
X bookmarks in bulk.

The first version should be local-first. Users do not need an account, and all
data remains in their browser. A later release can add authentication and
cross-device sync.

## Recommended Storage

Use IndexedDB for bookmark and category data, with Dexie.js as the database
wrapper.

Why:

- It supports large bookmark collections and indexed searches well.
- It is designed for structured, local browser data.
- It supports queries, migrations, and bulk writes needed for imports.
- It can later be synchronized to a hosted database without changing the core
  data model.

Use `chrome.storage.sync` only for small extension settings, such as the
selected save interaction mode. Do not use it as the primary bookmark database.

## Extension Architecture

### Content Script

Runs on `x.com` and `twitter.com`.

- Detects tweet action bars and injects the extension's save control.
- Extracts tweet metadata: tweet ID, URL, author, text preview, timestamps,
  and media URLs.
- Shows a category picker with options to create categories, add tags, and add
  a note.
- Uses a `MutationObserver` to handle X's dynamic page navigation and
  virtualized timeline content.

### Background Service Worker

- Owns database reads and writes through message passing.
- Deduplicates saved tweets using the tweet ID.
- Coordinates imports, settings, and background tasks.
- Keeps content scripts focused on the page UI and data extraction.

### Extension Interface

- Popup: recent saves, quick access to the library, and settings.
- Full-page dashboard: categories, search, filters, editing, deletion, and
  export/import.
- Options page: save interaction mode and bookmark import controls.

## Save Interaction Modes

Provide both modes as a user setting.

### Add Extension Button

Add a separate library icon beside the existing X tweet actions. Clicking it
opens the category picker and saves the tweet to the extension library.

This should be the default because it is less likely to interfere with X's
native interface or behavior.

### Also Save Native Bookmarks

Listen for users clicking X's native bookmark action, then save a copy to the
extension library as well.

Do not replace, block, or alter X's native bookmark action. Treat this as an
advanced mode because X DOM changes can affect detection and because native
bookmark removal should not automatically delete the library copy.

The extension library should remain independent from X bookmarks.

## Bookmark Import

The import flow should work from the user's X bookmarks page.

1. The user opens their bookmarks page on X.
2. The extension presents an import panel.
3. The importer reads currently loaded bookmark tweets and stores unique tweet
   IDs in batches.
4. It progressively scrolls to load additional items, while reporting progress.
5. Imported bookmarks receive a default category such as `Imported from X`.
6. The user can stop and resume the import. Existing records are skipped.
7. Add support for automatic categorization during import (e.g., matching keywords, hashtags, or handles to specific categories, or letting the user choose/create a target category for the imported batch before starting).

Avoid relying on undocumented X APIs or private network responses. A DOM-based
importer is more appropriate for an extension, although selectors will need to
be maintained as X changes its interface.

## Initial Data Model

```ts
type Bookmark = {
  id: string; // Tweet ID; primary key
  tweetUrl: string;
  authorHandle: string;
  authorName?: string;
  text?: string;
  createdAt?: Date;
  savedAt: Date;
  categoryIds: string[];
  tags: string[];
  note?: string;
  media: MediaItem[];
  source: "extension" | "x-bookmark-import";
  archived?: boolean;
};

type Category = {
  id: string;
  name: string;
  color?: string;
  createdAt: Date;
  sortOrder: number;
};
```

## Future Sync and Authentication

When cross-device sync becomes necessary, use PostgreSQL as the server-side
database. Supabase is a practical initial provider because it provides managed
Postgres, authentication, row-level security, and straightforward client APIs.

Prepare the local model for sync by adding these fields before introducing the
server:

- `userId`
- `updatedAt`
- `deletedAt`
- client-generated UUIDs and sync status

This permits incremental synchronization and conflict handling while preserving
existing local-only records.

## Future Auto-Categorization Technology

To automatically categorize bookmarks during bulk imports, we can use the following tech options (starting from lightweight to advanced):

1. **Option A: User-Defined RegEx Rules (Local-First)**
   - **Tech:** standard JavaScript RegExp engine.
   - **How:** Users define key-value match rules (e.g., matching `#reactjs` or `@typescript` triggers classification to a `Dev` category). Fast, private, and deterministic.

2. **Option B: Chrome's Built-in Gemini Nano AI (Local-First AI)**
   - **Tech:** Chrome Prompt API (`window.ai`).
   - **How:** Uses the user's local Gemini Nano model built directly into Chrome. We prompt it with: *"Categorize this tweet text into one of these categories: [list_of_categories]"*. Zero API cost and complete user privacy.

3. **Option C: Semantic Auto-Categorization via Transformers.js (Local-First NLP)**
   - **Tech:** `@huggingface/transformers` library running in a Background Web Worker. (Previously `@xenova/transformers`, now deprecated.)
   - **How:** Downloads a lightweight embedding model (like `Xenova/all-MiniLM-L6-v2`, ~45MB) dynamically from the Hugging Face CDN to run semantic cosine-match categorization locally. A true zero-shot alternative is `Xenova/distilbert-base-uncased-mnli` (~130MB).
   - **UI Requirement:** Before triggering the download or enabling the feature, the Dashboard must display a clear message explaining that a ~45MB AI model will be downloaded, cached locally, and used to semantically analyze and organize their bookmarks. Explicit user consent/activation is required.

## Delivery Phases

1. Create the IndexedDB data layer and library dashboard.
2. Add the injected save button, category picker, deduplication, and search.
3. Build the bookmark-page importer with batching, progress, and resume.
4. Add the optional native-bookmark listener mode.
5. Add JSON export and import for data portability.
6. Add authentication, PostgreSQL sync, data migration, and conflict handling.

## Key Product Decision

Treat the extension library as separate from the user's native X bookmarks.
This keeps categorization and saved records stable, even when users later remove
a tweet from their X bookmark list, and makes the future synchronization model
clearer.
