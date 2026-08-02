import React from 'react';
import { db, Bookmark } from '../../db';
import { getInitials, getCategoryColor, formatDate, formatRelativeTime } from '../helpers';
import { LinkIcon, TrashIcon, MoreHorizontalIcon } from '../icons';
import { Dropdown } from './Dropdown';

interface BookmarkCardProps {
  bookmark: Bookmark;
  categories: any[] | undefined;
  getCategoryName: (id: string) => string;
  editingNoteId: string | null;
  setEditingNoteId: (id: string | null) => void;
  tempNote: string;
  setTempNote: (val: string) => void;
  activePickerBookmarkId: string | null;
  setActivePickerBookmarkId: (id: string | null) => void;
  handleDelete: (id: string, e: React.MouseEvent) => void;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

function repairTweetText(raw: string): string {
  if (!raw) return '';
  let text = raw;
  // 1. Join http:// or https:// separated from domain by newlines: "http://\ngithub.com" -> "http://github.com"
  text = text.replace(/(https?:\/\/)\s*\n+\s*/gi, '$1');

  // 2. Join URL paths split across newlines: "github.com/elayadesign/re\ndesign-skill"
  text = text.replace(/((?:https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})\S*?)\n+(\S+)/gi, (match, p1, p2) => {
    if (/^[a-zA-Z0-9_\-\.\/\?%\=\#]+$/.test(p2)) {
      return p1 + p2;
    }
    return match;
  });

  // 3. Clean up accidental single newlines before/after mentions, hashtags, and apostrophes
  text = text
    .replace(/([^\n])\n+(@[A-Za-z0-9_]+|#[A-Za-z0-9_]+)/gi, '$1 $2')
    .replace(/(@[A-Za-z0-9_]+|#[A-Za-z0-9_]+)\n+([^\n])/gi, '$1 $2')
    .replace(/([^\n])\n+(['’]s|['’]re|['’]ve|['’]t|['’]m|['’]d|['’]ll)/gi, '$1$2');

  return text;
}

function isUrlToken(str: string): boolean {
  if (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('www.')) return true;
  return /^(?:[a-zA-Z0-9-]+\.)+(?:com|org|net|io|co|ai|dev|app|me|edu|gov|gg|tv|xyz|design|tech|link|site|store)(?:\/[^\s]*)?$/i.test(str);
}

function renderFormattedTweetText(rawText: string | undefined) {
  if (!rawText) return null;

  const cleanedText = repairTweetText(rawText);
  const lines = cleanedText.split('\n');

  return lines.map((line, lineIdx) => {
    const regex = /(@[A-Za-z0-9_]+|#[A-Za-z0-9_]+|https?:\/\/[^\s]+|www\.[^\s]+|(?:[a-zA-Z0-9-]+\.)+(?:com|org|net|io|co|ai|dev|app|me|edu|gov|gg|tv|xyz|design|tech|link|site|store)(?:\/[^\s]*)?)/gi;
    const parts = line.split(regex);

    return (
      <React.Fragment key={lineIdx}>
        {lineIdx > 0 && <br />}
        {parts.map((part, partIdx) => {
          if (!part) return null;
          if (part.startsWith('@')) {
            const handle = part.slice(1);
            return (
              <a
                key={partIdx}
                href={`https://x.com/${handle}`}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ color: 'var(--accent)', textDecoration: 'none' }}
                className="bm-tweet-link"
              >
                {part}
              </a>
            );
          } else if (part.startsWith('#')) {
            const tag = part.slice(1);
            return (
              <a
                key={partIdx}
                href={`https://x.com/hashtag/${tag}`}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ color: 'var(--accent)', textDecoration: 'none' }}
                className="bm-tweet-link"
              >
                {part}
              </a>
            );
          } else if (isUrlToken(part)) {
            const href = part.startsWith('http://') || part.startsWith('https://') ? part : `https://${part}`;
            let displayUrl = part.replace(/^https?:\/\//, '').replace(/^www\./, '');
            if (displayUrl.length > 30) {
              displayUrl = displayUrl.slice(0, 27) + '...';
            }
            return (
              <a
                key={partIdx}
                href={href}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ color: 'var(--accent)', textDecoration: 'none' }}
                className="bm-tweet-link"
              >
                {displayUrl}
              </a>
            );
          }
          return <span key={partIdx}>{part}</span>;
        })}
      </React.Fragment>
    );
  });
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({
  bookmark, categories, getCategoryName,
  editingNoteId, setEditingNoteId, tempNote, setTempNote,
  activePickerBookmarkId, setActivePickerBookmarkId, handleDelete,
  isSelected = false, onToggleSelection
}) => {
  const [isEditingTags, setIsEditingTags] = React.useState(false);
  const [tempTagInput, setTempTagInput] = React.useState('');
  return (
    <div 
      className={`bookmark-card ${isSelected ? 'selected' : ''}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a, button, input, textarea, .bm-cat-dropdown-menu')) return;
        window.open(bookmark.tweetUrl, '_blank');
      }}
      style={{
        position: 'relative',
        cursor: 'default',
        boxShadow: isSelected ? '0 0 0 2px var(--accent)' : undefined,
        background: isSelected ? 'var(--bg-hover)' : undefined
      }}
    >
      <div className="bm-author-row">
        <div className="bm-author-info">
          <label
            className={`bm-selection-checkbox ${isSelected ? 'is-checked' : ''}`}
            onClick={(e) => e.stopPropagation()}
            title={isSelected ? 'Deselect bookmark' : 'Select bookmark'}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelection?.()}
              aria-label={`${isSelected ? 'Deselect' : 'Select'} bookmark by ${bookmark.authorName || bookmark.authorHandle}`}
            />
            <span className="bm-selection-checkmark" aria-hidden="true" />
          </label>
          <div className="bm-avatar" style={{ overflow: 'hidden' }}>
            {bookmark.authorAvatarUrl ? (
              <img 
                src={bookmark.authorAvatarUrl} 
                alt={bookmark.authorName} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              getInitials(bookmark.authorName || bookmark.authorHandle)
            )}
          </div>
          <div>
            <div className="bm-author-name">{bookmark.authorName || bookmark.authorHandle}</div>
            <div className="bm-handle">@{bookmark.authorHandle}</div>
          </div>
        </div>
          <Dropdown
            align="right"
            trigger={<MoreHorizontalIcon />}
            triggerClassName="bm-action-btn"
            className="bm-actions"
            items={[
              {
                id: 'view',
                label: 'View on X',
                icon: <LinkIcon />,
                href: bookmark.tweetUrl,
                target: '_blank',
              },
              {
                id: 'delete',
                label: 'Delete',
                icon: <TrashIcon />,
                onClick: (e?: any) => handleDelete(bookmark.id, e),
                style: { color: 'var(--danger)' }
              }
            ]}
          />
      </div>

      <p className="bm-text">{bookmark.text ? renderFormattedTweetText(bookmark.text) : <em style={{ color: 'var(--text-muted)' }}>(No text)</em>}</p>

      {/* Quoted Tweet Block */}
      {bookmark.quotedTweet && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            let targetUrl = bookmark.quotedTweet?.tweetUrl 
              || (bookmark.quotedTweet?.authorHandle && bookmark.quotedTweet?.id 
                  ? `https://x.com/${bookmark.quotedTweet.authorHandle}/status/${bookmark.quotedTweet.id}` 
                  : undefined);
            if (targetUrl) {
              targetUrl = targetUrl.replace(/\/photo\/\d+.*$/i, '').replace(/\/video\/\d+.*$/i, '');
              window.open(targetUrl, '_blank');
            }
          }}
          style={{
            marginTop: '12px',
            marginBottom: '12px',
            padding: '12px',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            cursor: 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
            boxSizing: 'border-box'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
            {bookmark.quotedTweet.authorAvatarUrl && (
              <img 
                src={bookmark.quotedTweet.authorAvatarUrl} 
                alt={bookmark.quotedTweet.authorName || bookmark.quotedTweet.authorHandle} 
                style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} 
              />
            )}
            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
              {bookmark.quotedTweet.authorName || bookmark.quotedTweet.authorHandle}
            </span>
            {bookmark.quotedTweet.authorHandle && (
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                @{bookmark.quotedTweet.authorHandle}
              </span>
            )}
          </div>
          {bookmark.quotedTweet.text && (
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)', lineHeight: '1.45', whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
              {renderFormattedTweetText(bookmark.quotedTweet.text)}
            </p>
          )}
          {bookmark.quotedTweet.media && bookmark.quotedTweet.media.length > 0 && (
            <div style={{ marginTop: '8px', borderRadius: '12px', overflow: 'hidden', display: 'grid', gridTemplateColumns: bookmark.quotedTweet.media.length === 1 ? '1fr' : '1fr 1fr', gap: '2px' }}>
              {bookmark.quotedTweet.media.map((m, idx) => (
                <img key={idx} src={m.url} alt="" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Articles / Card Links */}
      {bookmark.articles && bookmark.articles.length > 0 && bookmark.articles.map((art, idx) => (
        <div 
          key={idx}
          onClick={(e) => {
            e.stopPropagation();
            window.open(art.url, '_blank');
          }}
          style={{
            marginTop: '10px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'rgba(255, 255, 255, 0.02)',
            cursor: 'pointer'
          }}
        >
          {art.thumbnailUrl && (
            <img 
              src={art.thumbnailUrl} 
              alt={art.title || art.domain} 
              style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} 
            />
          )}
          <div style={{ overflow: 'hidden', flex: 1 }}>
            {art.domain && (
              <div style={{ fontSize: '11px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                {art.domain}
              </div>
            )}
            {art.title && (
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {art.title}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Media Grid */}
      {bookmark.media && bookmark.media.length > 0 && (
        <div 
          onClick={e => e.stopPropagation()}
          style={{
            marginTop: '10px',
            marginBottom: '10px',
            display: 'grid',
            gridTemplateColumns: bookmark.media.length > 1 ? 'repeat(2, 1fr)' : '1fr',
            gap: '8px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid var(--border)'
          }}
        >
          {bookmark.media.slice(0, 4).map((item, idx) => (
            <div 
              key={idx} 
              style={{ 
                position: 'relative', 
                paddingBottom: bookmark.media.length === 1 ? '56.25%' : '75%',
                height: 0, 
                overflow: 'hidden',
                background: 'var(--bg-secondary)',
                cursor: 'pointer'
              }}
              onClick={() => window.open(item.url, '_blank')}
            >
              <img 
                src={item.previewUrl || item.url} 
                alt="media preview" 
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              {item.type === 'video' && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.15)'
                }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#fff'
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Note section */}
      <div 
        style={{ 
          marginTop: '8px', 
          marginBottom: '12px',
          borderLeft: '2px solid var(--accent)', 
          paddingLeft: '10px', 
          fontSize: '13px', 
          color: 'var(--text-muted)' 
        }}
      >
        {editingNoteId === bookmark.id ? (
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <textarea
              value={tempNote}
              onChange={e => setTempNote(e.target.value)}
              placeholder="Add a note to this bookmark..."
              style={{
                width: '100%',
                background: 'var(--bg-secondary)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px 10px',
                fontSize: '13px',
                fontFamily: 'inherit',
                resize: 'none',
                height: '50px',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingNoteId(null)}
                className="btn"
                style={{ 
                  padding: '4px 10px', 
                  fontSize: '11px', 
                  background: 'transparent',
                  color: 'var(--text)',
                  border: '1px solid var(--border-strong)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await db.bookmarks.update(bookmark.id, { note: tempNote });
                  setEditingNoteId(null);
                }}
                className="btn btn-primary"
                style={{ padding: '4px 12px', fontSize: '11px' }}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setEditingNoteId(bookmark.id);
              setTempNote(bookmark.note || '');
            }}
            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            title="Click to edit note"
          >
            <span>
              {bookmark.note ? (
                <><strong>Note:</strong> {bookmark.note}</>
              ) : (
                <em style={{ opacity: 0.6 }}>+ Add note...</em>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Tags section */}
      <div 
        style={{ 
          marginBottom: '12px',
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '6px',
          alignItems: 'center'
        }}
        onClick={e => e.stopPropagation()}
      >
        {bookmark.tags?.map((tag, idx) => (
          <span 
            key={idx}
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            #{tag}
            <button 
              onClick={async (e) => {
                e.stopPropagation();
                const newTags = bookmark.tags.filter(t => t !== tag);
                await db.bookmarks.update(bookmark.id, { tags: newTags });
              }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, fontSize: '10px' }}
            >
              ×
            </button>
          </span>
        ))}
        {isEditingTags ? (
          <input
            type="text"
            autoFocus
            value={tempTagInput}
            onChange={e => setTempTagInput(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const trimmed = tempTagInput.trim().replace(/^#/, '');
                if (trimmed) {
                  const currentTags = bookmark.tags || [];
                  if (!currentTags.includes(trimmed)) {
                    await db.bookmarks.update(bookmark.id, { tags: [...currentTags, trimmed] });
                  }
                }
                setTempTagInput('');
                setIsEditingTags(false);
              } else if (e.key === 'Escape') {
                setIsEditingTags(false);
              }
            }}
            onBlur={() => setIsEditingTags(false)}
            placeholder="type and press enter"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              outline: 'none',
              width: '120px'
            }}
          />
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingTags(true);
            }}
            style={{
              background: 'none',
              border: '1px dashed var(--border-strong)',
              color: 'var(--text-muted)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            + Tag
          </button>
        )}
      </div>

      <div className="bm-footer">
        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <Dropdown
            align="left"
            trigger={
              <>
                {bookmark.categoryIds[0] && (
                  <span 
                    style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      background: getCategoryColor(bookmark.categoryIds[0], categories?.find((c: any) => c.id === bookmark.categoryIds[0])?.color) 
                    }} 
                  />
                )}
                {bookmark.categoryIds[0] ? getCategoryName(bookmark.categoryIds[0]) : 'No Category'}
                <span style={{ fontSize: '9px', opacity: 0.6 }}>▼</span>
              </>
            }
            triggerStyle={{
              background: bookmark.categoryIds[0] ? `${getCategoryColor(bookmark.categoryIds[0], categories?.find((c: any) => c.id === bookmark.categoryIds[0])?.color)}15` : 'var(--bg-secondary)',
              color: bookmark.categoryIds[0] ? getCategoryColor(bookmark.categoryIds[0], categories?.find((c: any) => c.id === bookmark.categoryIds[0])?.color) : 'var(--text-muted)',
              border: '1px solid ' + (bookmark.categoryIds[0] ? `${getCategoryColor(bookmark.categoryIds[0], categories?.find((c: any) => c.id === bookmark.categoryIds[0])?.color)}40` : 'var(--border)'),
              borderRadius: 'var(--radius-full)',
              padding: '4px 12px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.15s'
            }}
            items={[
              {
                id: 'no-cat',
                label: 'No Category',
                icon: <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#71767b' }} />,
                onClick: async () => {
                  await db.bookmarks.update(bookmark.id, { categoryIds: [] });
                }
              },
              ...(categories || []).map(cat => ({
                id: cat.id,
                label: cat.name,
                icon: <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getCategoryColor(cat.id, cat.color) }} />,
                onClick: async () => {
                  await db.bookmarks.update(bookmark.id, { categoryIds: [cat.id] });
                },
                style: { fontWeight: bookmark.categoryIds.includes(cat.id) ? 700 : 400 }
              }))
            ]}
          />
        </div>
        <span 
          className="bm-date" 
          title={bookmark.createdAt ? `Posted: ${formatDate(bookmark.createdAt)} | Saved: ${formatDate(bookmark.savedAt)}` : `Saved: ${formatDate(bookmark.savedAt)}`}
        >
          {bookmark.createdAt 
            ? `posted ${formatDate(bookmark.createdAt)} · saved ${formatRelativeTime(bookmark.savedAt)}` 
            : `saved ${formatRelativeTime(bookmark.savedAt)}`}
        </span>
        <a href={bookmark.tweetUrl} target="_blank" rel="noreferrer" className="bm-link" onClick={e => e.stopPropagation()}>
          View tweet ↗
        </a>
      </div>
    </div>
  );
};
