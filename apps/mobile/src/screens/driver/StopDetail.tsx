// File: es-wms/apps/mobile/src/screens/driver/StopDetail.tsx

/**
 * StopDetail — Current Assignment Detail (Screen 2 reference)
 *
 * Layout (top → bottom):
 *   1. App header with back arrow
 *   2. Society name (large hero text) + Waste Type badge + GPS badge
 *   3. Map thumbnail with BIN ID overlay + directions icon
 *   4. MARK COMPLETE button (green, full-width, camera icon)
 *   5. SKIP STOP expandable (brown/amber, collapses to show reason modal)
 *   6. Volume Est. | Frequency split panel
 *   7. Supervisor Note (dark navy info card)
 *
 * Navigation params:
 *   stopId — used to fetch stop details (mock data in Phase 2)
 *
 * On "Mark Complete" → CameraProof screen
 * On "Confirm Skip"  → SkipReasonModal (Phase 2 addition)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import SkipReasonModal, { type SkipReasonResult } from './SkipReasonModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';

import { Colors, Theme } from '../../theme/colors';
import StatusBadge from '../../components/StatusBadge';
import BigButton   from '../../components/BigButton';
import type { DriverRouteStackParams } from '../../navigation/DriverStack';

// ─── Mock stop data lookup ────────────────────────────────────────────────────

const MOCK_STOPS: Record<string, {
  id: string; society: string; address: string;
  binType: 'wet' | 'dry' | 'mixed'; binId: string;
  gpsValid: boolean; volumeEst: number; frequency: string;
  supervisorNote: string | null; lat: number; lng: number;
}> = {
  'stop-001': {
    id: 'stop-001', society: 'Crystal Heights',
    address: 'Worli Sea Face, Mumbai 400018',
    binType: 'wet', binId: 'CH-402-B', gpsValid: true,
    volumeEst: 85, frequency: 'Daily',
    supervisorNote: 'Access via Gate 4 only. Secondary sensor needs manual reset after clearing.',
    lat: 19.0072, lng: 72.8172,
  },
  'stop-002': {
    id: 'stop-002', society: 'Oceanic View',
    address: 'Bandra West, Mumbai 400050',
    binType: 'dry', binId: 'OV-201-A', gpsValid: true,
    volumeEst: 60, frequency: 'Alternate Days',
    supervisorNote: null,
    lat: 19.0544, lng: 72.8402,
  },
  'stop-003': {
    id: 'stop-003', society: 'Sea Breeze CHS',
    address: 'Andheri West, Mumbai 400058',
    binType: 'mixed', binId: 'SB-114-C', gpsValid: false,
    volumeEst: 40, frequency: 'Daily',
    supervisorNote: 'Building is under renovation. Use rear lane entrance.',
    lat: 19.1136, lng: 72.8697,
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type NavProp   = NativeStackNavigationProp<DriverRouteStackParams, 'StopDetail'>;
type RoutePropT = RouteProp<DriverRouteStackParams, 'StopDetail'>;

// ─── Volume Fill Bar ──────────────────────────────────────────────────────────

function VolumeFillBar({ percent }: { percent: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: percent / 100, duration: 700, delay: 200, useNativeDriver: false }).start();
  }, []);
  const color = percent >= 80 ? Colors.danger : percent >= 60 ? Colors.warning : Colors.green;
  return (
    <View style={vfS.track}>
      <Animated.View style={[vfS.fill, {
        width: anim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }),
        backgroundColor: color,
      }]} />
    </View>
  );
}
const vfS = StyleSheet.create({
  track: { height: 6, backgroundColor: Colors.surfaceGrey, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  fill:  { height: '100%', borderRadius: 3 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function StopDetail() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route      = useRoute<RoutePropT>();

  const stopId   = route.params?.stopId ?? 'stop-001';
  const stop     = MOCK_STOPS[stopId] ?? MOCK_STOPS['stop-001'];

  const [skipExpanded,    setSkipExpanded]    = useState(false);
  const [skipModalVisible, setSkipModalVisible] = useState(false);
  const skipHeight = useRef(new Animated.Value(0)).current;

  const toggleSkip = () => {
    const expand = !skipExpanded;
    setSkipExpanded(expand);
    Animated.spring(skipHeight, {
      toValue:         expand ? 1 : 0,
      useNativeDriver: false,
      bounciness:      0,
      speed:           20,
    }).start();
  };

  const handleMarkComplete = () => {
    navigation.navigate('CameraProof', { stopId: stop.id });
  };

  const handleConfirmSkip = () => {
    setSkipModalVisible(true);
  };

  const handleSkipConfirmed = async (result: SkipReasonResult) => {
    setSkipModalVisible(false);
    setSkipExpanded(false);
    // Phase 3: call PATCH /api/v1/stops/:id/skip with result.reason
    Alert.alert(
      'Stop Skipped',
      `Reason: ${result.reason}\nA backlog entry has been created for the next shift.`,
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  };

  const wasteTypeBadge: 'wet' | 'dry' | 'mixed' = stop.binType;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}
          hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
          <Ionicons name="arrow-back" size={22} color={Colors.textOnDark} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.logoBox}>
            <Ionicons name="reload-circle" size={18} color={Colors.green} />
          </View>
          <Text style={s.appName}>ES-WMS</Text>
        </View>
        <TouchableOpacity style={s.alertBtn} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
          <Ionicons name="warning" size={20} color={Colors.warning} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}>

        {/* ── Assignment label ── */}
        <Text style={s.assignLabel}>CURRENT ASSIGNMENT</Text>
        <Text style={s.societyName}>{stop.society}</Text>

        {/* ── Waste type + GPS badges ── */}
        <View style={s.badgeRow}>
          <StatusBadge variant={wasteTypeBadge} size="lg" />
        </View>
        <View style={s.gpsBadgeRow}>
          <StatusBadge
            variant={stop.gpsValid ? 'gps_valid' : 'gps_invalid'}
            size="md"
          />
        </View>

        {/* ── Map / Bin ID card ── */}
        <View style={s.mapCard}>
          {/* Map placeholder */}
          <View style={s.mapBg}>
            <Ionicons name="map" size={40} color={Colors.textMuted} style={{ opacity: 0.3 }} />
            <Text style={s.mapPlaceholderText}>
              {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
            </Text>
          </View>
          {/* Bin ID overlay */}
          <View style={s.binIdOverlay}>
            <Text style={s.binIdLabel}>BIN ID</Text>
            <Text style={s.binId}>{stop.binId}</Text>
          </View>
          {/* Directions button */}
          <TouchableOpacity style={s.dirBtn}>
            <Ionicons name="navigate" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* ── MARK COMPLETE (primary CTA) ── */}
        <BigButton
          label="Mark Complete"
          icon="camera-outline"
          onPress={handleMarkComplete}
          variant="primary"
          iconRight
          style={s.completeCta}
        />

        {/* ── SKIP STOP (expandable) ── */}
        <View style={s.skipContainer}>
          <TouchableOpacity style={s.skipHeader} onPress={toggleSkip} activeOpacity={0.85}>
            <View style={s.skipLeft}>
              <Ionicons name="ban" size={22} color={Colors.skipOrange} />
              <Text style={s.skipLabel}>SKIP STOP</Text>
            </View>
            <Animated.View style={{
              transform: [{
                rotate: skipHeight.interpolate({ inputRange: [0,1], outputRange: ['0deg','180deg'] })
              }]
            }}>
              <Ionicons name="chevron-down" size={20} color={Colors.skipOrange} />
            </Animated.View>
          </TouchableOpacity>

          <Animated.View style={[s.skipExpand, {
            maxHeight: skipHeight.interpolate({ inputRange: [0,1], outputRange: [0, 80] }),
            opacity:   skipHeight,
          }]}>
            <View style={s.skipExpandInner}>
              <BigButton
                label="Confirm Skip"
                icon="warning-outline"
                onPress={handleConfirmSkip}
                variant="danger"
                compact
              />
            </View>
          </Animated.View>
        </View>

        {/* ── Volume + Frequency split panel ── */}
        <View style={s.statsRow}>
          <View style={[s.statCell, s.statCellLeft]}>
            <Text style={s.statLabel}>VOLUME EST.</Text>
            <Text style={s.statValue}>{stop.volumeEst}%</Text>
            <VolumeFillBar percent={stop.volumeEst} />
          </View>
          <View style={s.statDivider} />
          <View style={s.statCell}>
            <Text style={s.statLabel}>FREQUENCY</Text>
            <Text style={s.statValue}>{stop.frequency}</Text>
          </View>
        </View>

        {/* ── Supervisor Note ── */}
        {stop.supervisorNote && (
          <View style={s.noteCard}>
            <View style={s.noteHeader}>
              <View style={s.noteIconWrap}>
                <Ionicons name="information-circle" size={18} color={Colors.statusProgress} />
              </View>
              <Text style={s.noteTitle}>SUPERVISOR NOTE</Text>
            </View>
            <Text style={s.noteBody}>{stop.supervisorNote}</Text>
          </View>
        )}

      </ScrollView>

      {/* ── Skip Reason Modal ── */}
      <SkipReasonModal
        visible={skipModalVisible}
        stopSociety={stop.society}
        stopId={stop.id}
        vehicleLoadPct={84}
        onConfirm={handleSkipConfirmed}
        onCancel={() => setSkipModalVisible(false)}
      />

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content:{ padding: 16, gap: 12 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.navyDark,
  },
  backBtn:      { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBox:      { width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)',
                  justifyContent: 'center', alignItems: 'center' },
  appName:      { fontSize: 16, fontWeight: '800', color: Colors.white, letterSpacing: 1.5 },
  alertBtn:     { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  // Hero text
  assignLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted,
                 letterSpacing: 1.5, marginTop: 4 },
  societyName: { fontSize: 32, fontWeight: '900', color: Colors.navyDark,
                 lineHeight: 36, marginBottom: 12 },

  // Badges
  badgeRow:   { marginBottom: 8 },
  gpsBadgeRow:{ marginBottom: 4 },

  // Map card
  mapCard: {
    borderRadius: Theme.radiusMd, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border, position: 'relative',
  },
  mapBg: {
    height: 160, backgroundColor: '#C8D8D4',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  mapPlaceholderText: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  binIdOverlay: {
    position: 'absolute', left: 12, bottom: 12,
    backgroundColor: Colors.surface, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    shadowColor: Colors.navyDark, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  binIdLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
  binId:      { fontSize: 18, fontWeight: '900', color: Colors.navyDark, letterSpacing: 1 },
  dirBtn: {
    position: 'absolute', right: 12, bottom: 12,
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: Colors.navyDark,
    justifyContent: 'center', alignItems: 'center',
  },

  // Mark complete CTA
  completeCta: { marginTop: 4 },

  // Skip
  skipContainer: {
    backgroundColor: Colors.skipWarning, borderRadius: Theme.radiusMd, overflow: 'hidden',
  },
  skipHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 64,
  },
  skipLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  skipLabel: { fontSize: 15, fontWeight: '800', color: Colors.skipOrange, letterSpacing: 0.5 },
  skipExpand:{ overflow: 'hidden' },
  skipExpandInner: { paddingHorizontal: 16, paddingBottom: 12 },

  // Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Theme.radiusMd, borderWidth: 1, borderColor: Colors.border,
  },
  statCell:      { flex: 1, padding: 16 },
  statCellLeft:  { borderRightWidth: 1, borderRightColor: Colors.border },
  statDivider:   { width: 1, backgroundColor: Colors.border },
  statLabel:     { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.2 },
  statValue:     { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },

  // Supervisor note
  noteCard: {
    backgroundColor: Colors.navyDark, borderRadius: Theme.radiusMd, padding: 16, gap: 10,
  },
  noteHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteIconWrap:{ width: 26, height: 26, borderRadius: 13,
                 backgroundColor: 'rgba(59,130,246,0.2)', justifyContent: 'center', alignItems: 'center' },
  noteTitle:   { fontSize: 10, fontWeight: '700', color: Colors.statusProgress, letterSpacing: 1.5 },
  noteBody:    { fontSize: 14, color: Colors.textOnDark, lineHeight: 22, fontWeight: '400' },
});