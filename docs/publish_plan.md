# XMarks Chrome Web Store Publishing Plan

This document outlines the step-by-step process for publishing the **XMarks** extension to the Chrome Web Store.

---

## Phase 1: Package the Extension Code

The Chrome Web Store requires a `.zip` file containing only your production build output.

1. **Build the extension for production:**
   Run the following command from the root of the repository:
   ```bash
   npm run build
   ```
2. **Create the deployment archive:**
   Compress the **contents** of the `dist/` directory into a `.zip` archive (e.g., `xmarks-v1.0.0.zip`).
   *Important: Zip the files inside the `dist/` folder, not the `dist/` folder itself. The `manifest.json` must be at the root level of the ZIP file.*

---

## Phase 2: Set Up Chrome Developer Console

1. Navigate to the [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole/).
2. Log in with your Google account.
3. Complete the one-time **$5 Developer Registration** fee (if you haven't already).
4. Click **"Add new item"** and upload your `xmarks-v1.0.0.zip` file.

---

## Phase 3: Store Listing Details & Assets

You will need to provide metadata and promotional assets for your store page.

### A. Copy & Descriptions

*   **Extension Title**: `XMarks: Bookmark Manager for X`
*   **Short Description** (max 132 characters):
    `A privacy-first, local-first Chrome extension to search, tag, and organize your X bookmarks.`
*   **Detailed Description**:
    Provide a comprehensive overview of the features. Highlight:
    *   100% local-first IndexedDB storage (zero cloud servers).
    *   On-device AI categorization using Transformers.js (optional; the model is downloaded once from Hugging Face when enabled).
    *   Instant full-text search across tweet content, authors, and notes.
    *   Custom color-coded categories and private notes.
    *   Offline JSON backups and native X timeline integration.

### B. Required Visual Assets

*   **Store Icon**: `128x128` PNG format (already available at `public/icon-128.png`).
*   **Screenshots**: At least 1 required (size: 1280x800 or 640x400 PNG/JPEG). Recommended shots:
    1.  *Dashboard Overview*: Showcase the 3-column view, search bar, and color categories.
    2.  *Timeline Integration*: Show the custom save button injected on an x.com timeline post.
    3.  *In-Page Popover*: Display the category selection and note-adding popover interface.
*   **Promotional Tile** (Optional but highly recommended): `440x280` PNG format.
*   **Marquee Hero Banner** (Optional): `1400x560` PNG format.

---

## Phase 4: Privacy Practice Disclosures (Mandatory)

During submission, Google requires you to justify the permissions requested in your `manifest.json`.

### Single Purpose Statement
Provide a clear, single purpose for the extension:
> *"XMarks is a local-first extension designed to organize, search, and tag X/Twitter bookmarks."*

### Permission Justifications
You must explain why you need the following permissions:
*   **`storage` & `unlimitedStorage`**:
    > *"Needed to store the user's saved bookmarks, custom tags, categories, and private notes locally in the browser's IndexedDB without relying on external servers."*
*   **`host_permissions` (`*://*.x.com/*`, `*://*.twitter.com/*`)**:
    > *"Needed to detect bookmark actions on the X timeline, inject the custom save button beside tweets, and render the categorization popover interface directly within the page."*

### Data Usage Declaration
Fill out the data usage form accurately:
*   Do you sell user data? **No**
*   Do you use data for creditworthiness or advertising? **No**
*   Is data handled entirely locally? **Yes** (Emphasize the local-first architecture). No user data is transmitted. The only outbound request is the optional one-time download of the auto-categorize model from Hugging Face (huggingface.co), which carries no bookmark content.

### Privacy Policy URL
You must provide a link to a hosted privacy policy.
*   **URL**: `https://yarooqh.github.io/twtbk/privacy/` (source: `landing/src/pages/privacy.astro`). It goes live once the landing site is deployed to GitHub Pages, so deploy before submitting.

---

## Optional Enhancements

*   **Automated Packaging**: Add a script to `package.json` (e.g., using `bestzip` or a custom node script) to automatically build and zip the `dist/` folder, streamlining future updates.
*   **Publishing Automation**: Consider setting up a GitHub Action using the `chrome-webstore-upload-cli` tool to automate submissions to the Web Store directly from your repository on new release tags.
