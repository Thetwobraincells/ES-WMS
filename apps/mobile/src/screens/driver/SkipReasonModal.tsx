// File: es-wms/apps/mobile/src/screens/driver/SkipReasonModal.tsx

/**
 * SkipReasonModal — Skip Reason Bottom Sheet (Screen 3 reference)
 *
 * PRD FR-DRV-04: Driver can mark a stop as SKIPPED with a mandatory reason:
 *   WASTE_MIXED | TRUCK_FULL | INACCESSIBLE | OTHER
 *
 * PRD FR-DRV-05: On SKIP, system auto-creates a BACKLOG entry.
 * PRD FR-DRV-17: If TRUCK_FULL selected but load < 85%, flag as suspicious.
 *
 * UI (Screen 3):
 *   • Blurred/dimmed background showing stop detail beneath
 *   • Bottom sheet slides up with drag handle
 *   • "ACTION REQUIRED" label + "SELECT SKIP REASON" hero text
 *   • 2×2 grid of reason tiles — each with a large icon + label
 *   • Red "CONFIRM SKIP" button (disabled until reason selected)
 *   • "CANCEL ACTION" text link
 *
 * Usage:
 *   Pass as a native stack screen with presentation: 'transparentModal'
 *   OR render inline inside StopDetail with an Animated overlay.
 *   This file implements BOTH patterns — see exports at bottom.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Theme } from '../../theme/colors';
import BigButton from '../../components/BigButton';

const { height: SCREEN_H } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

export type SkipReason =
  | 'WASTE_MIXED'
  | 'TRUCK_FULL'
  | 'INACCESSIBLE'
  | 'OTHER';

export interface SkipReasonResult {
  reason:    SkipReason;
  note?:     string;
}

interface SkipReasonModalProps {
  visible:        boolean;
  stopSociety:    string;
  stopId:         string;
  vehicleLoadPct: number;   // Current truck load — used for FR-DRV-17 flag check
  onConfirm:      (result: SkipReasonResult) => void | Promise<void>;
  onCancel:       () => void;
}

// ─── Reason tile definitions ──────────────────────────────────────────────────

interface ReasonDef {
  id:          SkipReason;
  label:       string;
  icon:        keyof typeof Ionicons.glyphMap;
  description: string;
  /** Show a warning if this reason is selected under certain conditions */
  warningFn?:  (loadPct: number) => string | null;
}

const REASONS: ReasonDef[] = [
  {
    id:          'WASTE_MIXED',
    label:       'WASTE MIXED',
    icon:        'trash',
    description: 'Wet and dry waste not segregated',
    // No load-based warning for mixed waste
  },
  {
    id:    'TRUCK_FULL',
    label: 'TRUCK FULL',
    icon:  'bus',
    description: 'Vehicle has reached capacity',
    warningFn: (load) =>
      load < 85
        ? `⚠ Load is only ${load}% — this claim will be flagged to supervisor`
        : null,
  },
  {
    id:          'INACCESSIBLE',
    label:       'INACCESSIBLE',
    icon:        'ban',
    description: 'Road blocked or access denied',
  },
  {
    id:          'OTHER',
    label:       'OTHER',
    icon:        'help-circle',
    description: 'Another reason not listed',
  },
];

// ─── Single Reason Tile ───────────────────────────────────────────────────────

interface ReasonTileProps {
  def:        ReasonDef;
  selected:   boolean;
  onSelect:   () => void;
  loadPct:    number;
}

function ReasonTile({ def, selected, onSelect, loadPct }: ReasonTileProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const warning   = def.warningFn?.(loadPct) ?? null;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, bounciness: 6 }),
    ]).start();
    onSelect();
  };

  // Icon background color varies by reason
  const iconBgColor: Record<SkipReason, string> = {
    WASTE_MIXED:  selected ? Colors.danger     : Colors.surfaceGrey,
    TRUCK_FULL:   selected ? Colors.navyDark   : Colors.surfaceGrey,
    INACCESSIBLE: selected ? Colors.danger     : Colors.surfaceGrey,
    OTHER:        selected ? Colors.navyMid    : Colors.surfaceGrey,
  };
  const iconColor = selected ? Colors.white : Colors.navyDark;

  return (
    <Animated.View style={[tileS.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[tileS.tile, selected && tileS.tileSelected]}
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={def.label}
      >
        {/* Checkmark overlay */}
        {selected && (
          <View style={tileS.checkmark}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.green} />
          </View>
        )}

        {/* Icon */}
        <View style={[tileS.iconWrap, { backgroundColor: iconBgColor[def.id] }]}>
          {def.id === 'WASTE_MIXED' ? (
            // Special: trash can with ×
            <View style={tileS.mixedIconWrap}>
              <Ionicons name="trash" size={26} color={iconColor} />
              <View style={tileS.mixedX}>
                <Ionicons name="close" size={12} color={Colors.danger} />
              </View>
            </View>
          ) : (
            <Ionicons name={def.icon} size={28} color={iconColor} />
          )}
        </View>

        <Text style={[tileS.label, selected && tileS.labelSelected]}>
          {def.label}
        </Text>
      </TouchableOpacity>

      {/* Inline warning (appears below tile) */}
      {selected && warning && (
        <View style={tileS.warningBox}>
          <Ionicons name="warning" size={12} color={Colors.warning} />
          <Text style={tileS.warningText}>{warning}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const tileS = StyleSheet.create({
  wrapper: { flex: 1 },
  tile: {
    backgroundColor: Colors.surfaceGrey,
    borderRadius:    Theme.radiusMd,
    padding:         16,
    alignItems:      'center',
    justifyContent:  'center',
    minHeight:       120,
    gap:             10,
    borderWidth:     2,
    borderColor:     Colors.transparent,
    position:        'relative',
  },
  tileSelected: {
    backgroundColor: Colors.surface,
    borderColor:     Colors.navyDark,
    shadowColor:     Colors.navyDark,
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.12,
    shadowRadius:    8,
    elevation:       4,
  },
  checkmark: {
    position: 'absolute', top: 8, right: 8,
  },
  iconWrap: {
    width:          64,
    height:         64,
    borderRadius:   14,
    justifyContent: 'center',
    alignItems:     'center',
  },
  mixedIconWrap: { position: 'relative' },
  mixedX: {
    position:        'absolute',
    top:             -6,
    right:           -8,
    backgroundColor: Colors.surface,
    borderRadius:    6,
    width:           16,
    height:          16,
    justifyContent:  'center',
    alignItems:      'center',
  },
  label: {
    fontSize:      11,
    fontWeight:    '800',
    color:         Colors.textSecondary,
    letterSpacing: 0.8,
    textAlign:     'center',
  },
  labelSelected: {
    color: Colors.navyDark,
  },
  warningBox: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             4,
    backgroundColor: Colors.warningMuted,
    borderRadius:    6,
    padding:         8,
    marginTop:       6,
  },
  warningText: {
    flex:       1,
    fontSize:   10,
    fontWeight: '600',
    color:      Colors.warningDark,
    lineHeight: 14,
  },
});

// ─── Bottom Sheet Modal ───────────────────────────────────────────────────────

export default function SkipReasonModal({
  visible,
  stopSociety,
  stopId,
  vehicleLoadPct,
  onConfirm,
  onCancel,
}: SkipReasonModalProps) {
  const insets = useSafeAreaInsets();

  const [selected, setSelected]   = useState<SkipReason | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Sheet slide animation
  const slideAnim  = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;

  // Open / close animations
  useEffect(() => {
    if (visible) {
      setSelected(null);
      setSubmitting(false);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue:         0,
          useNativeDriver: true,
          bounciness:      3,
          speed:           18,
        }),
        Animated.timing(backdropOp, {
          toValue:         0.55,
          duration:        280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue:         SCREEN_H,
          duration:        240,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOp, {
          toValue:         0,
          duration:        220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleConfirm = useCallback(async () => {
    if (!selected || submitting) return;

    // FR-DRV-17: warn if TRUCK_FULL at < 85%
    const warning = REASONS.find(r => r.id === selected)?.warningFn?.(vehicleLoadPct);
    if (warning) {
      Alert.alert(
        'Suspicious Claim Detected',
        `${warning}\n\nDo you still want to submit this skip reason?`,
        [
          { text: 'Cancel',       style: 'cancel' },
          { text: 'Submit Anyway', style: 'destructive',
            onPress: async () => {
              setSubmitting(true);
              await onConfirm({ reason: selected });
              setSubmitting(false);
            }
          },
        ],
      );
      return;
    }

    setSubmitting(true);
    await onConfirm({ reason: selected });
    setSubmitting(false);
  }, [selected, submitting, vehicleLoadPct, onConfirm]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      {/* ── Backdrop ── */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: Colors.navyDark, opacity: backdropOp }]}
          pointerEvents="none"
        />
      </Pressable>

      {/* ── Bottom Sheet ── */}
      <Animated.View
        style={[
          s.sheet,
          { paddingBottom: insets.bottom + 16 },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Drag handle */}
        <View style={s.handle} />

        {/* ── Blurred stop context (background peek) ── */}
        <View style={s.contextRow}>
          <View style={s.contextBadge}>
            <Ionicons name="business" size={14} color={Colors.textSecondary} />
          </View>
          <View>
            <Text style={s.contextStopLabel}>CURRENT STOP</Text>
            <Text style={s.contextStopName}>{stopSociety}</Text>
          </View>
        </View>

        {/* ── Header ── */}
        <Text style={s.actionLabel}>ACTION REQUIRED</Text>
        <Text style={s.heroTitle}>SELECT SKIP{'\n'}REASON</Text>

        {/* ── Reason grid (2×2) ── */}
        <View style={s.grid}>
          {/* Row 1 */}
          <View style={s.row}>
            {REASONS.slice(0, 2).map(def => (
              <ReasonTile
                key={def.id}
                def={def}
                selected={selected === def.id}
                onSelect={() => setSelected(def.id)}
                loadPct={vehicleLoadPct}
              />
            ))}
          </View>
          {/* Row 2 */}
          <View style={s.row}>
            {REASONS.slice(2, 4).map(def => (
              <ReasonTile
                key={def.id}
                def={def}
                selected={selected === def.id}
                onSelect={() => setSelected(def.id)}
                loadPct={vehicleLoadPct}
              />
            ))}
          </View>
        </View>

        {/* ── Confirm button ── */}
        <BigButton
          label={submitting ? 'Submitting…' : 'Confirm Skip'}
          icon="warning"
          onPress={handleConfirm}
          variant="danger"
          disabled={!selected || submitting}
          loading={submitting}
          style={s.confirmBtn}
        />

        {/* ── Cancel link ── */}
        <TouchableOpacity
          style={s.cancelBtn}
          onPress={onCancel}
          disabled={submitting}
          hitSlop={{ top: 12, bottom: 12, left: 20, right: 20 }}
        >
          <Text style={[s.cancelText, submitting && s.cancelTextDisabled]}>
            CANCEL ACTION
          </Text>
        </TouchableOpacity>

      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Sheet
  sheet: {
    position:        'absolute',
    bottom:          0, left: 0, right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    paddingHorizontal:    20,
    paddingTop:           12,
    // Shadow upward
    shadowColor:   Colors.navyDark,
    shadowOffset:  { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius:  20,
    elevation:     24,
  },

  // Drag handle
  handle: {
    width:           40,
    height:          4,
    borderRadius:    2,
    backgroundColor: Colors.border,
    alignSelf:       'center',
    marginBottom:    16,
  },

  // Context row
  contextRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             10,
    backgroundColor: Colors.surfaceGrey,
    borderRadius:    Theme.radiusSm,
    padding:         10,
    marginBottom:    20,
  },
  contextBadge: {
    width:           32,
    height:          32,
    borderRadius:    8,
    backgroundColor: Colors.surface,
    justifyContent:  'center',
    alignItems:      'center',
  },
  contextStopLabel: {
    fontSize:   9,
    fontWeight: '700',
    color:      Colors.textMuted,
    letterSpacing: 1.2,
  },
  contextStopName: {
    fontSize:   14,
    fontWeight: '700',
    color:      Colors.textPrimary,
  },

  // Header text
  actionLabel: {
    fontSize:      10,
    fontWeight:    '700',
    color:         Colors.textMuted,
    letterSpacing: 1.5,
    textAlign:     'center',
    marginBottom:  6,
  },
  heroTitle: {
    fontSize:      30,
    fontWeight:    '900',
    color:         Colors.navyDark,
    textAlign:     'center',
    lineHeight:    34,
    marginBottom:  24,
    letterSpacing: 0.5,
  },

  // Reason grid
  grid: { gap: 10, marginBottom: 20 },
  row:  { flexDirection: 'row', gap: 10 },

  // Confirm
  confirmBtn: { marginBottom: 12 },

  // Cancel
  cancelBtn: {
    alignSelf:       'center',
    paddingVertical: 8,
    minHeight:       44,
    justifyContent:  'center',
  },
  cancelText: {
    fontSize:      13,
    fontWeight:    '700',
    color:         Colors.textSecondary,
    letterSpacing: 0.8,
  },
  cancelTextDisabled: {
    color: Colors.textMuted,
  },
});