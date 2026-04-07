// File: es-wms/apps/mobile/src/components/StatusBadge.tsx

/**
 * StatusBadge — Compact Status Pill
 *
 * Used throughout the Driver App to visually communicate:
 *   • Stop status    (PENDING / IN_PROGRESS / COMPLETED / SKIPPED / BACKLOGGED)
 *   • Waste type     (WET / DRY / MIXED)
 *   • GPS validity   (VALID / INVALID)
 *   • Custom label   (pass variant='custom' with bg/text color overrides)
 *
 * Design: pill shape, bold uppercase label, optional leading icon.
 * Follows the high-contrast BMC palette from colors.ts.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BadgeVariant =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'backlogged'
  | 'wet'
  | 'dry'
  | 'mixed'
  | 'gps_valid'
  | 'gps_invalid'
  | 'custom';

interface StatusBadgeProps {
  variant:   BadgeVariant;
  label?:    string;           // Overrides default label for the variant
  icon?:     keyof typeof Ionicons.glyphMap;  // Overrides default icon
  /** For variant='custom' only */
  bgColor?:  string;
  textColor?: string;
  style?:    ViewStyle;
  /** Larger pill for hero status display (e.g. stop detail header) */
  size?:     'sm' | 'md' | 'lg';
}

// ─── Variant definitions ──────────────────────────────────────────────────────

interface VariantDef {
  label:     string;
  bg:        string;
  text:      string;
  icon:      keyof typeof Ionicons.glyphMap;
}

const VARIANTS: Record<Exclude<BadgeVariant, 'custom'>, VariantDef> = {
  pending: {
    label: 'Pending',
    bg:    Colors.warningMuted,
    text:  Colors.warningDark,
    icon:  'time-outline',
  },
  in_progress: {
    label: 'In Progress',
    bg:    Colors.navyDark,
    text:  Colors.white,
    icon:  'ellipse',
  },
  completed: {
    label: 'Complete',
    bg:    '#D1FAE5',
    text:  Colors.greenMuted,
    icon:  'checkmark-circle',
  },
  skipped: {
    label: 'Skipped',
    bg:    Colors.dangerMuted,
    text:  Colors.dangerDark,
    icon:  'close-circle',
  },
  backlogged: {
    label: 'Backlogged',
    bg:    '#EDE9FE',
    text:  '#5B21B6',
    icon:  'refresh-circle-outline',
  },
  wet: {
    label: 'Wet Waste',
    bg:    Colors.navyDark,
    text:  Colors.white,
    icon:  'water',
  },
  dry: {
    label: 'Dry Waste',
    bg:    '#FEF3C7',
    text:  '#92400E',
    icon:  'leaf-outline',
  },
  mixed: {
    label: 'Mixed',
    bg:    '#FEE2E2',
    text:  Colors.dangerDark,
    icon:  'warning',
  },
  gps_valid: {
    label: 'GPS Geofence: Valid',
    bg:    '#D1FAE5',
    text:  Colors.greenMuted,
    icon:  'checkmark-circle',
  },
  gps_invalid: {
    label: 'GPS: Out of Range',
    bg:    Colors.dangerMuted,
    text:  Colors.dangerDark,
    icon:  'location-outline',
  },
};

// ─── Size config ──────────────────────────────────────────────────────────────

const SIZE_CONFIG = {
  sm: { fontSize: 10, iconSize: 11, paddingH: 8,  paddingV: 3, gap: 4, radius: 6  },
  md: { fontSize: 12, iconSize: 13, paddingH: 10, paddingV: 5, gap: 5, radius: 8  },
  lg: { fontSize: 14, iconSize: 16, paddingH: 14, paddingV: 7, gap: 6, radius: 10 },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function StatusBadge({
  variant,
  label,
  icon,
  bgColor,
  textColor,
  style,
  size = 'md',
}: StatusBadgeProps) {
  const sz = SIZE_CONFIG[size];

  let bg:        string;
  let text:      string;
  let iconName:  keyof typeof Ionicons.glyphMap;
  let badgeLabel: string;

  if (variant === 'custom') {
    bg         = bgColor   ?? Colors.surfaceGrey;
    text       = textColor ?? Colors.textPrimary;
    iconName   = icon      ?? 'ellipse';
    badgeLabel = label     ?? '';
  } else {
    const def  = VARIANTS[variant];
    bg         = bgColor   ?? def.bg;
    text       = textColor ?? def.text;
    iconName   = icon      ?? def.icon;
    badgeLabel = label     ?? def.label;
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          paddingHorizontal: sz.paddingH,
          paddingVertical:   sz.paddingV,
          borderRadius:      sz.radius,
          gap:               sz.gap,
        },
        style,
      ]}
    >
      <Ionicons name={iconName} size={sz.iconSize} color={text} />
      <Text
        style={[
          styles.label,
          { fontSize: sz.fontSize, color: text },
        ]}
        numberOfLines={1}
      >
        {badgeLabel.toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  badge: {
    flexDirection:  'row',
    alignItems:     'center',
    alignSelf:      'flex-start',
  },
  label: {
    fontWeight:    '700',
    letterSpacing: 0.6,
  },
});