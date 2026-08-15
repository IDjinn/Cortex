export const durations = {
  instant: 80,
  micro: 140,
  fast: 220,
  base: 320,
  slow: 480,
  slower: 720,
} as const;

export type Duration = keyof typeof durations;

/**
 * Easing curves.
 *
 * Rules (from Emil Kowalski's framework):
 *  - Entering/exiting elements: ease-out (starts fast, feels responsive).
 *  - Moving/morphing on screen: ease-in-out.
 *  - Hover / color: ease.
 *  - Constant motion (spinners, progress): linear.
 *  - Never ease-in on UI elements: it delays the moment users watch most.
 */
export const easings = {
  // Strong ease-out for elements entering/exiting the viewport.
  decelerate: [0.23, 1, 0.32, 1] as [number, number, number, number],
  // Strong ease-in-out for on-screen movement / morphs.
  standard: [0.77, 0, 0.175, 1] as [number, number, number, number],
  // iOS-like drawer / sheet curve.
  drawer: [0.32, 0.72, 0, 1] as [number, number, number, number],
  // Plain `ease` for hover / color transitions.
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  // Linear for spinners, progress bars, hold-to-delete progress.
  linear: [0, 0, 1, 1] as [number, number, number, number],
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
  bouncy: { damping: 12, stiffness: 280, mass: 0.8 },
} as const;

export const motion = { durations, easings };
