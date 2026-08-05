// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useTour } from './useTour';

// Mock driver.js
const mockDrive = vi.fn();
const mockDestroy = vi.fn();
let mockOptions: any = null;

vi.mock('driver.js', () => ({
  driver: (options: any) => {
    mockOptions = options;
    return {
      drive: mockDrive,
      destroy: mockDestroy,
      isLastStep: () => true,
    };
  },
}));

function TestComponent({ props, onTourRef }: { props: any; onTourRef: (tour: any) => void }) {
  const tour = useTour(props);
  onTourRef(tour);
  return null;
}

describe('useTour', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('filters steps based on available data-onboarding DOM elements', async () => {
    const searchEl = document.createElement('div');
    searchEl.setAttribute('data-onboarding', 'search-input');
    document.body.appendChild(searchEl);

    const markCompleted = vi.fn();
    const markDismissed = vi.fn();
    let tourInstance: any;

    const root = createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(TestComponent, {
          props: { markTourCompleted: markCompleted, markTourDismissed: markDismissed },
          onTourRef: (t) => { tourInstance = t; },
        })
      );
    });

    await act(async () => {
      tourInstance.startTour();
    });

    expect(mockDrive).toHaveBeenCalledTimes(1);
    expect(mockOptions.steps).toHaveLength(1);
    expect(mockOptions.steps[0].element).toBe('[data-onboarding="search-input"]');
  });

  it('triggers settings expansion callback when highlighting settings step', async () => {
    const settingsToggleEl = document.createElement('div');
    settingsToggleEl.setAttribute('data-onboarding', 'settings-toggle');
    document.body.appendChild(settingsToggleEl);

    const setSettingsExpanded = vi.fn();
    let tourInstance: any;

    const root = createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(TestComponent, {
          props: { markTourCompleted: vi.fn(), markTourDismissed: vi.fn(), setSettingsExpanded },
          onTourRef: (t) => { tourInstance = t; },
        })
      );
    });

    await act(async () => {
      tourInstance.startTour();
      mockOptions.onHighlightStarted?.(settingsToggleEl);
    });

    expect(setSettingsExpanded).toHaveBeenCalledWith(true);
  });

  it('calls markTourCompleted when tour is destroyed on the last step', async () => {
    const searchEl = document.createElement('div');
    searchEl.setAttribute('data-onboarding', 'search-input');
    document.body.appendChild(searchEl);

    const markCompleted = vi.fn();
    const markDismissed = vi.fn();
    const onToast = vi.fn();
    let tourInstance: any;

    const root = createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(TestComponent, {
          props: { markTourCompleted: markCompleted, markTourDismissed: markDismissed, onToastMessage: onToast },
          onTourRef: (t) => { tourInstance = t; },
        })
      );
    });

    await act(async () => {
      tourInstance.startTour();
      mockOptions.onDestroyStarted?.();
    });

    expect(markCompleted).toHaveBeenCalledTimes(1);
    expect(onToast).toHaveBeenCalledWith('Tour completed! You are ready to use XMarks.');
  });
});
