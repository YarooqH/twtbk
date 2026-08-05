import type { Transition } from 'motion/react';

export const motionEase = [0.22, 1, 0.36, 1] as const;
export const motionDuration = 0.28;

export const getMotionTransition = (reducedMotion: boolean): Transition => ({
  duration: reducedMotion ? 0 : motionDuration,
  ease: motionEase,
});
