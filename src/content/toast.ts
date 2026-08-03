import { MSG } from '../messages';

export function showToast(message: string, showViewBtn: boolean = true) {
  const existing = document.getElementById('twtbk-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'twtbk-toast';
  
  // Style it to look EXACTLY like X's native bottom toast notification
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background-color: var(--twtbk-accent, #1d9bf0);
    color: #ffffff;
    padding: 12px 20px;
    border-radius: 9999px;
    font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px;
    font-weight: 700;
    z-index: 100000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    gap: 16px;
    transition: opacity 0.25s, transform 0.25s;
    opacity: 0;
    pointer-events: auto;
  `;

  toast.innerHTML = `
    <span>${message}</span>
    ${showViewBtn ? '<button style="background: none; border: none; color: #ffffff; text-decoration: underline; font-weight: 800; cursor: pointer; padding: 0; font-family: inherit; font-size: inherit;">View</button>' : ''}
  `;

  if (showViewBtn) {
    toast.querySelector('button')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: MSG.OPEN_DASHBOARD });
      toast.remove();
    });
  }

  document.body.appendChild(toast);

  // Trigger animation frame
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  // Remove after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}
