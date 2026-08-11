import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { InfoIcon } from '../icons';

interface InfoTooltipProps {
  text: string;
  size?: number;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, size = 13 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeBelow: boolean }>({ top: 0, left: 0, placeBelow: false });
  const iconRef = useRef<HTMLSpanElement>(null);

  const updatePosition = () => {
    if (!iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    const placeBelow = rect.top < 90;
    setCoords({
      top: placeBelow ? rect.bottom + 6 : rect.top - 6,
      left: Math.min(Math.max(130, rect.left + rect.width / 2), window.innerWidth - 130),
      placeBelow,
    });
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    if (!isVisible) return;
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isVisible]);

  return (
    <span
      ref={iconRef}
      className="info-tooltip-anchor"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      tabIndex={0}
      aria-label={text}
      style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '5px', cursor: 'help', outline: 'none' }}
    >
      <span
        className="info-tooltip-icon-svg"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          color: isVisible ? 'var(--accent)' : 'var(--text-muted)',
          opacity: isVisible ? 1 : 0.65,
          transition: 'opacity 0.15s, color 0.15s',
        }}
      >
        <InfoIcon size={size} />
      </span>

      {createPortal(
        <AnimatePresence>
          {isVisible && (
            <motion.div
              className="info-tooltip-portal"
              initial={{ opacity: 0, scale: 0.94, y: coords.placeBelow ? -4 : 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: coords.placeBelow ? -4 : 4 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'fixed',
                top: coords.placeBelow ? `${coords.top}px` : undefined,
                bottom: !coords.placeBelow ? `${window.innerHeight - coords.top}px` : undefined,
                left: `${coords.left}px`,
                transform: 'translateX(-50%)',
                zIndex: 99999,
                pointerEvents: 'none',
              }}
            >
              <div className="info-tooltip-content">
                {text}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </span>
  );
};
