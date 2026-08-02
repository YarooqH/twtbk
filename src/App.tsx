import React, { useEffect } from 'react';
import { db } from './db';
import { useLiveQuery } from 'dexie-react-hooks';
import './index.css';

const BookmarkIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"/>
  </svg>
);

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);

const hoverMap: Record<string, string> = {
  '#1d9bf0': '#1a8cd8',
  '#00c4b6': '#00a89b',
  '#f91880': '#e01673',
  '#7856ff': '#6c4de6',
  '#ff7a00': '#e66e00',
  '#00ba7c': '#00a36c',
};

const categoryColors = ['#1d9bf0', '#00c4b6', '#f91880', '#7856ff', '#ff7a00', '#00ba7c'];
const getCategoryColor = (id: string, customColor?: string) => {
  if (customColor) return customColor;
  return categoryColors[id.charCodeAt(id.length - 1) % categoryColors.length];
};

function App() {
  const recentBookmarks = useLiveQuery(
    () => db.bookmarks.orderBy('savedAt').reverse().limit(5).toArray()
  );
  const totalCount = useLiveQuery(() => db.bookmarks.count());
  const categories = useLiveQuery(() => db.categories.toArray());


  // Apply accent color from storage so popup reflects user's choice
  useEffect(() => {
    chrome.storage?.sync?.get(['accentColor'], (result) => {
      if (result.accentColor) {
        const color = result.accentColor as string;
        document.documentElement.style.setProperty('--accent', color);
        document.documentElement.style.setProperty('--accent-hover', hoverMap[color] || color);
        document.documentElement.style.setProperty('--accent-light', color + '14');
      }
    });
  }, []);

  const openDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  };

  const getInitials = (name: string) => name.trim().charAt(0).toUpperCase();

  return (
    <div className="popup-wrap" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Header */}
      <div className="popup-header">
        <div className="popup-logo">
          <img src="/logo.svg" alt="XMarks Logo" width={14} height={14} />
        </div>
        <h1 className="popup-title">XMarks</h1>
        <span className="popup-count">
          {totalCount ?? 0} saved
        </span>
      </div>

      {/* Recent Bookmarks */}
      <div className="popup-recent-label">Recent Saves</div>

      {recentBookmarks && recentBookmarks.length > 0 ? (
        <div>
          {recentBookmarks.map(bm => (
            <div 
              key={bm.id} 
              className="popup-bm-item" 
              onClick={() => window.open(bm.tweetUrl, '_blank')}
              onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  window.open(bm.tweetUrl, '_blank');
                }
              }}
            >
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                {/* Left Side: Author Profile + Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="popup-bm-author">
                    <div className="popup-bm-avatar" style={{ overflow: 'hidden' }}>
                      {bm.authorAvatarUrl ? (
                        <img 
                          src={bm.authorAvatarUrl} 
                          alt={bm.authorName} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        getInitials(bm.authorName || bm.authorHandle)
                      )}
                    </div>
                    <span className="popup-bm-name">{bm.authorName || bm.authorHandle}</span>
                    <span className="popup-bm-handle">@{bm.authorHandle}</span>
                  </div>
                  <div className="popup-bm-text" style={{ WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', whiteSpace: 'normal', overflow: 'hidden' }}>
                    {bm.text || '(No text)'}
                  </div>
                </div>

                {/* Right Side: Flexed Categories and Media Thumbnail */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                  {/* Category Badges */}
                  {bm.categoryIds && bm.categoryIds.length > 0 && categories && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {bm.categoryIds.map(catId => {
                        const cat = categories.find(c => c.id === catId);
                        if (!cat) return null;
                        const catColor = getCategoryColor(catId, cat.color);
                        return (
                          <span key={catId} style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px', 
                            fontSize: '11px', 
                            padding: '3px 6px', 
                            borderRadius: '4px', 
                            background: `${catColor}18`,
                            color: catColor,
                            fontWeight: 600,
                            lineHeight: 1
                          }}>
                            <div style={{ width: '6.5px', height: '6.5px', borderRadius: '50%', background: catColor }}></div>
                            {cat.name}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Media Thumbnail */}
                  {bm.media && bm.media.length > 0 && (
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '8px', 
                      overflow: 'hidden', 
                      flexShrink: 0, 
                      border: '1px solid var(--border)',
                      position: 'relative'
                    }}>
                      <img 
                        src={bm.media[0].previewUrl || bm.media[0].url} 
                        alt="media preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                      {bm.media[0].type === 'video' && (
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(0,0,0,0.2)'
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="popup-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"/>
          </svg>
          <p>No bookmarks yet.<br />Click the save button on any tweet!</p>
        </div>
      )}



      {/* Open Dashboard Button */}
      <div className="popup-footer">
        <button className="btn btn-primary" onClick={openDashboard} style={{ width: '100%', justifyContent: 'center', gap: '8px' }}>
          Open Full Dashboard
          <ArrowIcon />
        </button>
      </div>
    </div>
  );
}

export default App;
