import { useCallback, useRef } from 'react';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface UseTourProps {
  markTourCompleted: () => void;
  markTourDismissed: () => void;
  setSettingsExpanded?: (val: boolean) => void;
  setMobileSettingsOpen?: (val: boolean) => void;
  onToastMessage?: (msg: string) => void;
}

export function useTour({
  markTourCompleted,
  markTourDismissed,
  setSettingsExpanded,
  setMobileSettingsOpen,
  onToastMessage,
}: UseTourProps) {
  const driverRef = useRef<Driver | null>(null);

  const startTour = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
    }

    const isMobile = typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 900px)').matches;
    const categoriesTarget = isMobile
      ? '[data-onboarding="mobile-categories"]'
      : '[data-onboarding="desktop-categories"]';
    const settingsTarget = isMobile
      ? '.mobile-settings-btn'
      : '[data-onboarding="settings-toggle"]';

    const steps = [
      {
        element: '[data-onboarding="search-input"]',
        popover: {
          title: 'Search & Filter',
          description: 'Quickly find saved bookmarks by keywords, authors, or text.',
          side: 'bottom' as const,
          align: 'start' as const,
        },
      },
      {
        element: categoriesTarget,
        popover: {
          title: 'Custom Categories',
          description: 'Organize your bookmarks into color-coded categories or view Uncategorized items.',
          side: 'right' as const,
          align: 'start' as const,
        },
      },
      {
        element: '[data-onboarding="ai-assistant"]',
        popover: {
          title: 'AI Smart Assistant',
          description: 'Automatically categorize and analyze your bookmarks using private, local AI.',
          side: 'right' as const,
          align: 'start' as const,
        },
      },
      {
        element: settingsTarget,
        popover: {
          title: 'Settings & Overrides',
          description: 'Configure bookmark save modes, button positions, accent color, and native X overrides.',
          side: 'top' as const,
          align: 'center' as const,
        },
      },
      {
        element: '[data-onboarding="bookmark-list"]',
        popover: {
          title: 'Your Library',
          description: 'Browse, edit notes, categorize, or select multiple bookmarks for bulk export and deletion.',
          side: 'top' as const,
          align: 'center' as const,
        },
      },
    ];

    // Filter out steps whose element isn't currently in the DOM
    const isVisible = (element: Element) => {
      let current: Element | null = element;
      while (current) {
        const styles = window.getComputedStyle(current);
        if (styles.display === 'none' || styles.visibility === 'hidden') return false;
        current = current.parentElement;
      }
      return true;
    };

    const validSteps = steps.filter(step => {
      const elements = Array.from(document.querySelectorAll(step.element));
      return elements.some(isVisible);
    });

    if (validSteps.length === 0) return;

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: 'rgba(0, 0, 0, 0.65)',
      steps: validSteps,
      onHighlightStarted: (element, step) => {
        const attr = element?.getAttribute?.('data-onboarding') || (typeof step?.element === 'string' ? step.element : '');
        if (
          attr === 'settings-toggle' ||
          attr === 'settings-panel' ||
          attr.includes('settings-toggle') ||
          attr.includes('settings-panel') ||
          element?.classList?.contains('mobile-settings-btn')
        ) {
          // Trigger Motion transition for Settings drawer before step highlight
          setSettingsExpanded?.(true);
          if (window.innerWidth <= 1100) {
            setMobileSettingsOpen?.(true);
          }
          // Allow Motion drawer transition to complete before refreshing highlight positioning
          window.setTimeout(() => {
            driverObj.refresh();
          }, 300);
        }
      },
      onDestroyStarted: () => {
        const isLastStep = driverObj.isLastStep();
        if (isLastStep) {
          markTourCompleted();
          onToastMessage?.('Tour completed! You are ready to use XMarks.');
        } else {
          markTourDismissed();
        }
      },
    });

    driverRef.current = driverObj;
    driverObj.drive();
  }, [markTourCompleted, markTourDismissed, setSettingsExpanded, setMobileSettingsOpen, onToastMessage]);

  return { startTour };
}
