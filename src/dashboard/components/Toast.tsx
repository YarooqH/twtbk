import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
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

  if (!message) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 12, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      transition={toastTransition}
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        background: 'var(--accent)',
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: 'var(--radius-full)',
        boxShadow: 'var(--shadow-md)',
        fontSize: '14px',
        fontWeight: 600,
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontFamily: 'inherit'
      }}
    >
      <span>{message}</span>
      {action && (
        <button
          onClick={(e) => { e.stopPropagation(); action.onClick(); onClose(); }}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '4px 10px',
            borderRadius: '4px',
            fontWeight: 700,
            fontSize: '13px',
            marginLeft: '8px'
          }}
        >
          {action.label}
        </button>
      )}
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          padding: 0,
          fontWeight: 700,
          opacity: 0.8,
          fontSize: '16px',
          lineHeight: 1
        }}
      >
        ×
      </button>
    </motion.div>
  );
};
