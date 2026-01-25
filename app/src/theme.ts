// Theme constants for Railroad Heritage design system
// Design doc: docs/plans/2026-01-25-railroad-heritage-design.md

export const THEME = {
  // Primary colors - vintage railroad burgundy
  burgundy: '#6B1C23',
  burgundyDark: '#4A1219',
  burgundyLight: '#8B2C35',

  // Accent colors - brass & gold
  brass: '#C9A227',
  brassLight: '#E8C547',
  brassDark: '#A68B1F',

  // Background - aged wood & leather (warmer, more visible)
  bgDark: '#1E1815',
  bgMid: '#2D2622',
  bgCard: '#3D342D',
  bgElevated: '#4A403A',

  // Text - cream & parchment
  textPrimary: '#F5EDE0',
  textSecondary: '#B8A99A',
  textMuted: '#7A6E62',
  textInverse: '#1A1512',

  // Semantic colors
  success: '#4A7C4E',
  successLight: 'rgba(74, 124, 78, 0.4)',
  successFaint: 'rgba(74, 124, 78, 0.2)',
  warning: '#C47F17',
  danger: '#9B3B3B',
  dangerDark: '#7A2E2E',
  info: '#4A6B8B',

  // Decorative
  border: '#5A4F45',
  borderLight: '#6A5F55',
  shadow: '#0D0B09',
} as const;

// Type scale
export const TYPE = {
  displayXL: { fontSize: 48, fontWeight: '700' as const, lineHeight: 53 },
  displayL: { fontSize: 36, fontWeight: '700' as const, lineHeight: 43 },
  displayM: { fontSize: 28, fontWeight: '600' as const, lineHeight: 34 },
  heading: { fontSize: 20, fontWeight: '600' as const, lineHeight: 26 },
  bodyL: { fontSize: 18, fontWeight: '500' as const, lineHeight: 25 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyS: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 17 },
  micro: { fontSize: 10, fontWeight: '500' as const, lineHeight: 13 },
} as const;

// Spacing scale
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Border radii
export const RADIUS = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
} as const;
