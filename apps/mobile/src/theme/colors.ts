export const Colors = {
  // ─── Brand Primaries ───────────────────────────────────────────────────────
  navyDark:    '#0D1B2A',   // Primary dark background (header, cards)
  navyMid:     '#1A2F46',   // Secondary dark surface
  navyLight:   '#1E3A5F',   // Hover / active state on dark surfaces

  green:       '#2D7A3A',   // Primary action / success (BMC green)
  greenLight:  '#3A9B4A',   // Hover state for green
  greenMuted:  '#1F5429',   // Pressed state for green

  // ─── Semantic / Status Colors ──────────────────────────────────────────────
  statusPending:    '#F59E0B',   // Amber  — PENDING stops
  statusProgress:   '#3B82F6',   // Blue   — IN_PROGRESS
  statusComplete:   '#2D7A3A',   // Green  — COMPLETED
  statusSkipped:    '#DC2626',   // Red    — SKIPPED
  statusBacklogged: '#7C3AED',   // Purple — BACKLOGGED

  // ─── Skip Reason Accent ────────────────────────────────────────────────────
  skipWarning:  '#92400E',   // Dark amber background for skip modal
  skipOrange:   '#F97316',   // Skip reason text / icon tint

  // ─── Alert / Destructive ──────────────────────────────────────────────────
  danger:       '#DC2626',
  dangerDark:   '#991B1B',
  dangerMuted:  '#FEE2E2',

  // ─── Warning ──────────────────────────────────────────────────────────────
  warning:      '#F59E0B',
  warningDark:  '#B45309',
  warningMuted: '#FEF3C7',

  // ─── Surfaces ─────────────────────────────────────────────────────────────
  background:   '#F0F4F3',   // Off-white app background (light screens)
  surface:      '#FFFFFF',   // Card / sheet surface
  surfaceGrey:  '#E8EDEC',   // Subtle separator / disabled background

  // ─── Typography ───────────────────────────────────────────────────────────
  textPrimary:   '#0D1B2A',   // High contrast body text on light bg
  textSecondary: '#4B5C6B',   // Subheadings, captions
  textMuted:     '#7A8E9E',   // Placeholder, disabled
  textOnDark:    '#FFFFFF',   // Text on navy/green surfaces
  textOnDarkMuted: 'rgba(255,255,255,0.65)',

  // ─── Borders ──────────────────────────────────────────────────────────────
  border:        '#D1DAD9',
  borderDark:    '#9BADB8',

  // ─── Misc ─────────────────────────────────────────────────────────────────
  transparent:   'transparent',
  overlay:       'rgba(13, 27, 42, 0.6)',   // Modal backdrop
  white:         '#FFFFFF',
  black:         '#000000',
} as const;

// ─── Semantic Aliases (for readability at usage sites) ──────────────────────
export const Theme = {
  primary:      Colors.green,
  primaryDark:  Colors.greenMuted,
  primaryLight: Colors.greenLight,

  background:   Colors.background,
  surface:      Colors.surface,

  navPrimary:   Colors.navyDark,
  navSecondary: Colors.navyMid,

  text:         Colors.textPrimary,
  textSub:      Colors.textSecondary,
  textInverse:  Colors.textOnDark,

  danger:       Colors.danger,
  warning:      Colors.warning,
  success:      Colors.statusComplete,
  info:         Colors.statusProgress,

  // Touch target minimum (56dp per PRD § 9.1)
  minTouchTarget: 56,

  // Border radius
  radiusSm:  8,
  radiusMd:  12,
  radiusLg:  16,
  radiusXl:  24,
  radiusFull: 9999,

  // Spacing scale
  spacing: {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  32,
    xxl: 48,
  },

  // Typography scale
  fontSize: {
    xs:   11,
    sm:   13,
    base: 15,
    md:   17,
    lg:   20,
    xl:   24,
    xxl:  30,
    hero: 40,
  },

  fontWeight: {
    regular:   '400' as const,
    medium:    '500' as const,
    semibold:  '600' as const,
    bold:      '700' as const,
    extrabold: '800' as const,
  },
} as const;

export type ColorKey = keyof typeof Colors;