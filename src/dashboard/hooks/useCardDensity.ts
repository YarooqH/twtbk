import { useState, useEffect, useCallback } from 'react';

export type CardDensity = 'ultra' | 'compact' | 'comfortable' | 'spacious';

export function useCardDensity() {
  const [cardDensity, setCardDensityState] = useState<CardDensity>('compact');

  useEffect(() => {
    chrome.storage?.sync?.get(['cardDensity'], (result) => {
      if (result.cardDensity) {
        setCardDensityState(result.cardDensity as CardDensity);
      }
    });
  }, []);

  const setCardDensity = useCallback((density: CardDensity) => {
    setCardDensityState(density);
    chrome.storage?.sync?.set({ cardDensity: density });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', cardDensity);
  }, [cardDensity]);

  return [cardDensity, setCardDensity] as const;
}
