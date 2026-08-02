import React, { useEffect } from 'react';

interface ToastProps {
  message: string | null;
  action?: { label: string; onClick: () => void };
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, action, onClose, duration = 3500 }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
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
        fontFamily: 'inherit',
        animation: 'twtbk-toast-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
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
    </div>
  );
};
