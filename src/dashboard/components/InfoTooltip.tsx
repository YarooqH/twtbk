import React from 'react';
import { InfoIcon } from '../icons';

interface InfoTooltipProps {
  text: string;
  size?: number;
  align?: 'left' | 'center' | 'right';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, size = 13, align = 'center' }) => {
  return (
    <span className="info-tooltip-wrap" title={text} tabIndex={0} aria-label={text}>
      <span className="info-tooltip-icon">
        <InfoIcon size={size} />
      </span>
      <span className={`info-tooltip-bubble align-${align}`}>
        {text}
      </span>
    </span>
  );
};
