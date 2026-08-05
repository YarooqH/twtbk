import { MSG } from '../messages';
import { showToast } from './toast';
import { currentAccentColor } from './settings';
import { markButtonAsSaved, markButtonAsUnsaved } from './inject';
import { getCategoryColor } from '../shared/colors';

export function showCategoryPopover(data: any, anchorEl: HTMLElement) {
  // Remove any existing popover
  const existing = document.getElementById('twtbk-picker');
  if (existing) existing.remove();

  const isSaved = anchorEl.dataset.saved === 'true';

  const container = document.createElement('div');
  container.id = 'twtbk-picker';
  container.className = 'twtbk-popover';

  // Helper: position popover relative to anchor using viewport coords
  const reposition = () => {
    const rect = anchorEl.getBoundingClientRect();
    const popoverWidth = 290;
    // Try to anchor right-edge of popover to right-edge of button
    let left = rect.right - popoverWidth;
    // Clamp to viewport
    if (left < 8) left = 8;
    if (left + popoverWidth > window.innerWidth - 8) left = window.innerWidth - popoverWidth - 8;
    container.style.top = (rect.bottom + 8) + 'px';
    container.style.left = left + 'px';
  };

  chrome.runtime.sendMessage({ type: MSG.GET_CATEGORIES }, (categories: any[]) => {
    const safeCats = categories || [];

    container.innerHTML = `
      <div class="twtbk-new-cat-row">
        <input type="text" id="twtbk-new-cat" placeholder="New category..." autocomplete="off" />
        <button id="twtbk-add-cat" class="twtbk-add-btn">Add</button>
      </div>

      <div class="twtbk-cat-list" id="twtbk-cat-list">
        <div class="twtbk-cat-item" data-cat-id="">
          <span class="twtbk-cat-dot" style="background:#71767b;"></span>
          <span>Uncategorized</span>
        </div>
        ${safeCats.map(cat => `
          <div class="twtbk-cat-item" data-cat-id="${cat.id}">
            <span class="twtbk-cat-dot" style="background:${getCategoryColor(cat.id, cat.color)};"></span>
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${cat.name}</span>
          </div>
        `).join('')}
      </div>

      <div class="twtbk-note-row">
        <textarea id="twtbk-note" placeholder="Add a note..."></textarea>
      </div>

      ${isSaved ? `
        <div class="twtbk-popover-footer" style="padding: 8px 12px; border-top: 1px solid rgba(255, 255, 255, 0.08); display: flex; justify-content: flex-end;">
          <button id="twtbk-remove-bookmark" style="background: none; border: none; color: #ef4444; font-size: 12px; font-weight: 600; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: background 0.15s;">
            Remove from XMarks
          </button>
        </div>
      ` : ''}
    `;

    document.body.appendChild(container);
    reposition();

    // Re-position on scroll so the popover tracks the button
    const onScroll = () => reposition();
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });

    const newCatInput = container.querySelector('#twtbk-new-cat') as HTMLInputElement;
    const catList = container.querySelector('#twtbk-cat-list') as HTMLDivElement;

    // Handle dynamically creating a category
    container.querySelector('#twtbk-add-cat')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = newCatInput.value.trim();
      if (!name) return;
      chrome.runtime.sendMessage({ type: MSG.CREATE_CATEGORY, payload: { name } }, (res) => {
        if (res && res.success) {
          const item = document.createElement('div');
          item.className = 'twtbk-cat-item';
          item.setAttribute('data-cat-id', res.category.id);
          const color = getCategoryColor(res.category.id, res.category.color);
          item.innerHTML = `
            <span class="twtbk-cat-dot" style="background:${color};"></span>
            <span>${res.category.name}</span>
          `;
          item.addEventListener('click', (evt) => {
            evt.stopPropagation();
            saveWithCategory(res.category.id);
          });
          catList.appendChild(item);
          newCatInput.value = '';
        } else {
          showToast('Failed to create category: ' + (res?.error || 'Unknown error'), false);
        }
      });
    });

    const saveWithCategory = (catId: string) => {
      const noteInput = container.querySelector('#twtbk-note') as HTMLTextAreaElement;
      const note = noteInput ? noteInput.value : '';
      data.note = note;
      data.categoryIds = catId ? [catId] : [];
      chrome.runtime.sendMessage({ type: MSG.SAVE_TWEET, payload: data }, (response) => {
        if (!response?.success) {
          showToast('Failed to save: ' + (response?.error || 'Unknown error'), false);
        } else {
          showToast("Saved to XMarks!");
          // The native bookmark control belongs to X. Only replace the icon on our clone.
          if (anchorEl.classList.contains('twtbk-save-btn')) {
            markButtonAsSaved(anchorEl);
          } else {
            anchorEl.dataset.saved = 'true';
            anchorEl.setAttribute('title', 'Saved in XMarks');
          }
        }
        cleanup();
      });
    };

    // Handle removing/unsaving a bookmark
    container.querySelector('#twtbk-remove-bookmark')?.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ type: MSG.DELETE_BOOKMARK, payload: { id: data.id } }, (res) => {
        if (res && res.success) {
          if (anchorEl.classList.contains('twtbk-save-btn')) {
            markButtonAsUnsaved(anchorEl);
          } else {
            anchorEl.dataset.saved = 'false';
            anchorEl.setAttribute('title', 'Save to XMarks');
          }
          showToast('Removed from XMarks');
        } else {
          showToast('Failed to remove: ' + (res?.error || 'Unknown error'), false);
        }
        cleanup();
      });
    });

    // Attach click handlers to all list items
    const items = container.querySelectorAll('.twtbk-cat-item');
    items.forEach(item => {
      item.addEventListener('click', (evt) => {
        evt.stopPropagation();
        const catId = item.getAttribute('data-cat-id') || '';
        saveWithCategory(catId);
      });
    });

    const cleanup = () => {
      container.remove();
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('click', onClickOutside);
    };

    const onClickOutside = (e: MouseEvent) => {
      if (!container.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) {
        cleanup();
      }
    };

    setTimeout(() => {
      document.addEventListener('click', onClickOutside);
    }, 10);
  });
}
