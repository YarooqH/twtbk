import React, { useState } from 'react';
import { DEFAULT_PROFILE_ID } from '../../db';
import { MAX_PROFILE_LABEL } from '../../db/profiles';
import { useProfiles } from '../hooks/useProfiles';
import { Modal } from './Modal';

export const ProfileSwitcher: React.FC = () => {
  const { profiles, savingProfileId, viewingProfileId, create, rename, view, saveTo, remove } = useProfiles();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const multiple = profiles.length > 1;
  const viewing = profiles.find(p => p.id === viewingProfileId);
  const saving = profiles.find(p => p.id === savingProfileId);
  const deleting = profiles.find(p => p.id === deletingId);

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await create(newName);
    setNewName('');
    setAdding(false);
  };

  const submitRename = async (id: string) => {
    if (renameValue.trim()) await rename(id, renameValue);
    setRenamingId(null);
  };

  // A single library gets no switcher, only a quiet way to add a second one.
  if (!multiple && !open) {
    return (
      <button type="button" className="profile-add-link" onClick={() => { setOpen(true); setAdding(true); }}>
        + Add a separate library
      </button>
    );
  }

  return (
    <div className="profile-switcher">
      <button
        type="button"
        className="profile-current"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span className="profile-current-label">{viewing?.label ?? 'Default'}</span>
        <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>

      {multiple && viewingProfileId !== savingProfileId && (
        <div className="profile-chip" role="status">
          Viewing {viewing?.label}. New saves go to {saving?.label}.
        </div>
      )}

      {open && (
        <div className="profile-menu">
          <ul>
            {profiles.map(p => (
              <li key={p.id} className={`profile-row ${p.id === viewingProfileId ? 'active' : ''}`}>
                {renamingId === p.id ? (
                  <input
                    className="profile-input"
                    autoFocus
                    value={renameValue}
                    maxLength={MAX_PROFILE_LABEL}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => submitRename(p.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') submitRename(p.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                  />
                ) : (
                  <button type="button" className="profile-row-name" onClick={() => view(p.id)}>
                    {p.label}
                    {p.id === savingProfileId && <span className="profile-badge">saving</span>}
                  </button>
                )}
                <span className="profile-row-actions">
                  {p.id !== savingProfileId && (
                    <button type="button" onClick={() => saveTo(p.id)} title="Save new bookmarks from X here">Save here</button>
                  )}
                  <button type="button" onClick={() => { setRenamingId(p.id); setRenameValue(p.label); }}>Rename</button>
                  {p.id !== DEFAULT_PROFILE_ID && (
                    <button type="button" className="danger" onClick={() => setDeletingId(p.id)}>Delete</button>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {adding ? (
            <form className="profile-add-form" onSubmit={submitNew}>
              <input
                className="profile-input"
                autoFocus
                placeholder="Library name, e.g. @work"
                value={newName}
                maxLength={MAX_PROFILE_LABEL}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setNewName(''); } }}
              />
              <button type="submit" disabled={!newName.trim()}>Add</button>
            </form>
          ) : (
            <button type="button" className="profile-add-link" onClick={() => setAdding(true)}>+ Add a separate library</button>
          )}

          <p className="profile-note">
            Libraries are stored in this browser profile. Anyone who can open it can open every library.
          </p>
        </div>
      )}

      <Modal
        isOpen={Boolean(deleting)}
        title={`Delete "${deleting?.label ?? ''}"?`}
        message="This permanently deletes every bookmark, category and note in this library. Export it first if you want a copy."
        confirmText="Delete library"
        isDanger
        onConfirm={async () => { if (deletingId) await remove(deletingId); setDeletingId(null); }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
