// app/components/theme.ts
// One place for the palette, spacing and radii so surfaces stay consistent.

export const colors = {
  /** Page background. */
  bg: '#0B0B0C',
  /** Slightly lifted background, behind glass. */
  bgLift: '#141416',
  /** Brand gold. */
  gold: '#E7BC10',
  goldSoft: '#E7BC1026',
  /** Warm off-white text. */
  text: '#FFFAF0',
  textMuted: '#FFFAF0A0',
  textFaint: '#FFFAF061',
  /** Hairlines and glass edges. */
  line: '#FFFAF01A',
  /** The rule between two items in a flowing list. */
  divider: '#FFFAF014',
  edge: '#FFFAF024',
  edgeStrong: '#FFFAF040',
  /** Glass fills, layered over whatever is behind. */
  glass: '#FFFAF00F',
  glassStrong: '#FFFAF01A',
  /** Faint lift under a field or a row, without turning it into a card. */
  fill: '#FFFAF00A',
  /**
   * Laid over the blurred header bar. The page colour at part strength: the
   * content still reads through it, blurred, but titles stay legible on top
   * of whatever happens to be passing underneath.
   */
  bgVeil: '#0B0B0CA6',
  danger: '#E71022',
} as const;

/**
 * The drop shadow under a gold button. Kept small and tight on purpose —
 * a wide, strong one reads as a glow and makes the button look like it is
 * floating off the page.
 */
export const goldGlow = '0px 2px 6px rgba(231, 188, 16, 0.18)';

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const font = {
  regular: 'Nunito-Regular',
  bold: 'Nunito-Bold',
} as const;

/** Distance from the bottom of the screen to the top of the floating nav. */
export const NAV_HEIGHT = 78;
/** Bottom padding for any scroll view that sits behind the nav. */
export const SCROLL_BOTTOM = NAV_HEIGHT + 32;
/** Standard top inset for a screen's content. */
export const SCREEN_TOP = 64;
