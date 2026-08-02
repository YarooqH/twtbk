# Inject Script Review

## Fixed Issues

1. **Persisted settings race:** Content-script startup previously injected using default settings before `chrome.storage.sync.get` completed. Injection now waits for settings to load, so a configured native-replace mode does not briefly or permanently show an injected button.
2. **Replace Click was not an override:** The native click handler opened the picker but allowed X to process the same click. X could rerender the button before the asynchronous category response positioned the picker. Replace mode now prevents the native action and owns the click.
3. **Saved native state was missed:** X may use `data-testid="removeBookmark"` after a bookmark is saved. The native listener now recognizes both bookmark states; passive saving only runs for the initial bookmark action.
4. **Native SVG was overwritten:** Saving from the native control called `markButtonAsSaved`, which replaces the SVG. The success handler now changes the extension clone only and leaves X's SVG intact.
5. **Over-broad observer:** The mutation observer previously rescanned every tweet on any added DOM node, including picker UI. It now reacts only to tweet/action-bar additions or action-bar child updates.

## Remaining Risks

- X's DOM and test IDs are private implementation details and can change without notice. The selector fallbacks should be validated against live timeline, detail, reply, and search views after X UI updates.
- The picker still relies on an asynchronous background response. The native-replace path now preserves its anchor, but a navigation while the request is outstanding can still close or detach the view.

## Hardening Roadmap

Treat X's DOM as an unreliable integration surface and isolate it behind an adapter rather than spreading selectors through the injector.

1. **Create an `xDomAdapter` module.** Centralize tweet, action-bar, action, tweet-ID, and action-wrapper lookup. Use stable attributes first, accessible names second, and structural heuristics last. Return typed results with a confidence level instead of raw nullable elements.
2. **Use semantic action detection.** Normalize selector variants into an action model. For example, both `bookmark` and `removeBookmark` should resolve to a bookmark action with a `saved` or `unsaved` state. Keep the selector variants in one versioned configuration object.
3. **Inject only into a verified action bar.** Score candidate `role="group"` elements by their recognized actions, and require a minimum score before injecting. This prevents selecting unrelated groups nested within a tweet.
4. **Make injection idempotent and self-healing.** Put a stable tweet identifier on the injected wrapper. Track injection state in a `WeakMap`, validate the wrapper after relevant mutations, and rebuild only when it is detached, stale, or in the wrong placement.
5. **Observe narrowly and batch work.** Queue changed tweets/action bars in a `Set` and process them in the next animation frame. Prefer timeline-container observation and avoid full-document scans; use a bounded health check only if a UI change cannot be detected through mutations.
6. **Separate XMarks and X click semantics.** Keep `injected`, `replace`, `augment`, and `arrow` as explicit modes with independent handlers. `replace` prevents X's bookmark operation; `augment` allows it and uses an anchor rectangle captured before X rerenders.
7. **Use fixture-driven tests.** Add sanitized DOM fixtures for timeline, detail, reply, search, quote, and saved-bookmark views. Test adapter recognition, placement, rerender recovery, and click semantics for every fixture. Retain a browser smoke test because JSDOM cannot reproduce X's production event delegation.

## Test Coverage Added

The inject tests cover saved-state selectors and native-replace injection behavior. The suite still uses JSDOM, so it cannot fully model React's event delegation or X's production DOM.
