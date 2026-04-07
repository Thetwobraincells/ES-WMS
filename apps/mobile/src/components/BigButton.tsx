// File: es-wms/apps/mobile/src/components/BigButton.tsx

/**
 * BigButton — Glove-Friendly Full-Width Action Button
 *
 * PRD § 9.1 constraint: ALL interactive elements ≥ 56×56 dp.
 * Used for every primary action in the Driver App:
 *   Mark Complete, Skip Stop, Send OTP, Confirm Skip, etc.
 *
 * Props:
 *   label      — Button text (always shown alongside icon)
 *   icon       — Ionicons glyph name
 *   onPress    — Handler
 *   variant    — 'primary' | 'danger' | 'warning' | 'dark' | 'ghost'
 *   disabled   — Greys out and blocks press
 *   loading    — Shows spinner instead of icon
 *   iconRight  — Places icon on the right side (for "→" style CTAs)
 *   style      — Optional style override for the outer container
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'danger' | 'warning' | 'dark' | 'ghost' | 'skip';

interface BigButtonProps {
  label:      string;
  icon:       keyof typeof Ionicons.glyphMap;
  onPress:    () => void;
  variant?:   ButtonVariant;
  disabled?:  boolean;
  loading?:   boolean;
  iconRight?: boolean;
  style?:     ViewStyle;
  /** Smaller version — still ≥ 56dp but tighter padding */
  compact?:   boolean;
}

// ─── Variant style map ────────────────────────────────────────────────────────

const variantStyles: Record<
  ButtonVariant,
  { bg: string; text: string; border?: string; iconColor: string }
> = {
  primary: {
    bg:        Colors.green,
    text:      Colors.white,
    iconColor: Colors.white,
  },
  danger: {
    bg:        Colors.danger,
    text:      Colors.white,
    iconColor: Colors.white,
  },
  warning: {
    bg:        Colors.warning,
    text:      Colors.navyDark,
    iconColor: Colors.navyDark,
  },
  dark: {
    bg:        Colors.navyDark,
    text:      Colors.white,
    iconColor: Colors.white,
  },
  ghost: {
    bg:        Colors.transparent,
    text:      Colors.textPrimary,
    border:    Colors.border,
    iconColor: Colors.textSecondary,
  },
  skip: {
    bg:        Colors.skipWarning,
    text:      Colors.skipOrange,
    iconColor: Colors.skipOrange,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BigButton({
  label,
  icon,
  onPress,
  variant  = 'primary',
  disabled = false,
  loading  = false,
  iconRight = false,
  style,
  compact = false,
}: BigButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const v = variantStyles[variant];

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const buttonHeight = compact ? 56 : 64;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.88}
        style={[
          styles.button,
          {
            backgroundColor: disabled ? Colors.surfaceGrey : v.bg,
            borderWidth:      v.border ? 1.5 : 0,
            borderColor:      v.border ?? Colors.transparent,
            height:           buttonHeight,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: disabled || loading }}
      >
        {loading ? (
          <ActivityIndicator
            color={disabled ? Colors.textMuted : v.iconColor}
            size="small"
          />
        ) : (
          <View style={[styles.inner, iconRight && styles.innerReversed]}>
            <Ionicons
              name={icon}
              size={24}
              color={disabled ? Colors.textMuted : v.iconColor}
            />
            <Text
              style={[
                styles.label,
                {
                  color: disabled ? Colors.textMuted : v.text,
                  marginLeft:  iconRight ? 0  : 10,
                  marginRight: iconRight ? 10 : 0,
                },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
            {iconRight && (
              <Ionicons
                name="arrow-forward"
                size={20}
                color={disabled ? Colors.textMuted : v.iconColor}
                style={{ marginLeft: 8 }}
              />
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  button: {
    width:         '100%',
    borderRadius:  Theme.radiusMd,
    justifyContent:'center',
    alignItems:    'center',
    // Shadow for primary CTA feel
    shadowColor:   Colors.navyDark,
    shadowOffset:  { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius:  6,
    elevation:     4,
  },
  inner: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  innerReversed: {
    flexDirection: 'row-reverse',
  },
  label: {
    fontSize:   Theme.fontSize.md,
    fontWeight: Theme.fontWeight.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});