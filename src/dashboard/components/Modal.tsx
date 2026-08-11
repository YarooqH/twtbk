import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { getMotionTransition } from '../../motion/presets';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'confirm' | 'alert';
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isBusy?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  message,
  type = 'confirm',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  onConfirm,
  onCancel,
  isBusy = false,
}) => {
  const reducedMotion = useReducedMotion();
  const modalTransition = getMotionTransition(Boolean(reducedMotion));

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={modalTransition}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }}
      onClick={onCancel}
    >
      <motion.div
          initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.96, y: reducedMotion ? 0 : 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.98, y: reducedMotion ? 0 : 4 }}
          transition={modalTransition}
        role="dialog"
        aria-modal="true"
        aria-labelledby="twtbk-modal-title"
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'var(--bg)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          fontFamily: 'inherit',
          margin: '16px'
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 id="twtbk-modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
          {title}
        </h3>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          {type === 'confirm' && (
            <button
              onClick={onCancel}
              disabled={isBusy}
              className="btn btn-ghost"
              style={{ padding: '8px 16px', fontSize: '14px', borderRadius: 'var(--radius-full)' }}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            disabled={isBusy}
            className="btn"
            style={{
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: 700,
              borderRadius: 'var(--radius-full)',
              background: isDanger ? 'var(--danger)' : 'var(--accent)',
              color: isDanger ? '#ffffff' : 'var(--accent-contrast, #ffffff)',
              border: 'none',
              cursor: isBusy ? 'wait' : 'pointer',
              opacity: isBusy ? 0.7 : 1
            }}
          >
            {isBusy ? 'Working…' : (type === 'alert' ? (confirmText === 'Confirm' ? 'OK' : confirmText) : confirmText)}
          </button>
        </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
