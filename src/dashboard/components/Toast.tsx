import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { getMotionTransition } from '../../motion/presets';

interface ToastProps {
  message: string | null;
  action?: { label: string; onClick: () => void };
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, action, onClose, duration = 3500 }) => {
  const reducedMotion = useReducedMotion();
  const toastTransition = getMotionTransition(Boolean(reducedMotion));

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: reducedMotion ? 0 : 12, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : 8, x: '-50%' }}
          transition={toastTransition}
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        background: 'var(--accent)',
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: 'var(--radius-full)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
        fontSize: '14px',
        fontWeight: 600,
        zIndex: 9999999,
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontFamily: 'inherit'
      }}
    >
      <span>{message}</span>
      {action && (
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); action.onClick(); onClose(); }}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '4px 10px',
            borderRadius: '4px',
            fontWeight: 700,
            fontSize: '13px',
            marginLeft: '8px',
            pointerEvents: 'auto'
          }}
        >
          {action.label}
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClose();
        }}
        style={{
          background: 'none',
          border: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          padding: '4px 8px',
          margin: '-4px -8px -4px 0',
          fontWeight: 700,
          opacity: 0.9,
          fontSize: '18px',
          lineHeight: 1,
          pointerEvents: 'auto'
        }}
        aria-label="Close notification"
      >
        ×
      </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
