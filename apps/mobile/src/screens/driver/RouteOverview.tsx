// File: es-wms/apps/mobile/src/screens/driver/RouteOverview.tsx

/**
 * RouteOverview — Driver Dashboard
 *
 * Wired to the live backend via useRouteStore.
 * Fetches the driver's current shift route on mount and displays:
 *   1. Route Progress card with animated progress bar
 *   2. Vehicle Load gauge (SVG)
 *   3. Eco tip banner (dismissible)
 *   4. "Up Next" stop list — PENDING / IN_PROGRESS stops
 *   5. Map strip placeholder
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle } from 'react-native-svg';

import { Colors, Theme } from '../../theme/colors';
import StatusBadge from '../../components/StatusBadge';
import BigButton   from '../../components/BigButton';
import { useAuthStore }  from '../../stores/authStore';
import { useRouteStore } from '../../stores/routeStore';
import type { DriverRouteStackParams } from '../../navigation/DriverStack';
import type { Stop } from '../../types/api';

// ─── Eco tips (rotate randomly) ───────────────────────────────────────────────

const ECO_TIPS = [
  'Segregating waste at source helps keep Mumbai healthy and reduces landfill overflow.',
  'Composting wet waste can reduce a society\'s solid waste output by up to 60%.',
  'India generates 62 million tonnes of waste annually. Your work keeps cities clean!',
  'Dry waste like paper and plastic can be recycled up to 7 times.',
];

// ─── Circular Load Gauge ──────────────────────────────────────────────────────

function LoadGauge({ percent, loadKg, capacity }: { percent: number; loadKg: number; capacity: number }) {
  const [displayed, setDisplayed] = useState(0);
  const size         = 140;
  const stroke       = 12;
  const radius       = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    let n = 0;
    const timer = setInterval(() => {
      n += 2;
      if (n >= percent) { setDisplayed(percent); clearInterval(timer); }
      else setDisplayed(n);
    }, 14);
    return () => clearInterval(timer);
  }, [percent]);

  const dashOffset  = circumference * (1 - displayed / 100);
  const gaugeColor  =
    percent >= 90 ? Colors.danger :
    percent >= 75 ? Colors.warning :
    Colors.green;

  return (
    <View style={gaugeS.wrapper}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size/2} cy={size/2} r={radius}
          stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} fill="none" />
        <Circle cx={size/2} cy={size/2} r={radius}
          stroke={gaugeColor} strokeWidth={stroke} fill="none"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round" rotation="-90" originX={size/2} originY={size/2} />
      </Svg>
      <View style={gaugeS.center}>
        <Text style={[gaugeS.pct, { color: gaugeColor }]}>{displayed}%</Text>
        <Text style={gaugeS.sub}>FULL</Text>
      </View>
    </View>
  );
}

const gaugeS = StyleSheet.create({
  wrapper: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  center:  { alignItems: 'center' },
  pct:     { fontSize: 32, fontWeight: '800', lineHeight: 36 },
  sub:     { fontSize: 11, fontWeight: '700', color: Colors.textOnDarkMuted, letterSpacing: 2 },
});

// ─── Stop Card ────────────────────────────────────────────────────────────────

function StopCard({
  stop, isActive, onPress, onNavigate,
}: {
  stop: Stop;
  isActive: boolean;
  onPress: () => void;
  onNavigate: () => void;
}) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 350, delay: isActive ? 0 : 120, useNativeDriver: true }).start();
  }, []);

  const statusLabel = isActive
    ? 'IN PROGRESS'
    : `PENDING · #${stop.sequence_order}`;

  return (
    <Animated.View style={{ opacity: fade }}>
      <View style={[stopS.card, isActive && stopS.cardActive]}>
        {/* Header row */}
        <View style={stopS.header}>
          <StatusBadge
            variant={isActive ? 'in_progress' : 'pending'}
            label={statusLabel}
            size="sm"
          />
          <View style={stopS.buildingIcon}>
            <Ionicons name="business" size={20} color={Colors.textSecondary} />
          </View>
        </View>

        <Text style={stopS.name}>{stop.society?.name ?? 'Society'}</Text>
        <Text style={stopS.addr}>{stop.address}</Text>

        {/* Action row */}
        <View style={stopS.actions}>
          {isActive ? (
            <>
              <BigButton label="Complete" icon="checkmark-circle"
                onPress={onPress} variant="primary" compact style={stopS.flex1} />
              <TouchableOpacity style={[stopS.iconBtn, { backgroundColor: Colors.navyDark }]}
                onPress={onNavigate} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
                <Ionicons name="navigate" size={22} color={Colors.white} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <BigButton label="View Details" icon="eye"
                onPress={onPress} variant="dark" compact style={stopS.flex1} />
              <TouchableOpacity style={[stopS.iconBtn, { backgroundColor: Colors.surfaceGrey }]}
                onPress={() => {}} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
                <Ionicons name="information-circle-outline" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const stopS = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Theme.radiusMd,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
    shadowColor: Colors.navyDark, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardActive: { borderLeftWidth: 4, borderLeftColor: Colors.green, borderColor: Colors.green },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  buildingIcon: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: Colors.surfaceGrey, justifyContent: 'center', alignItems: 'center',
  },
  name:    { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 3 },
  addr:    { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  flex1:   { flex: 1 },
  iconBtn: {
    width: 56, height: 56, borderRadius: Theme.radiusMd,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

type NavProp = NativeStackNavigationProp<DriverRouteStackParams, 'DriverTabs'>;

export default function RouteOverview() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const user       = useAuthStore(s => s.user);

  // ── Route store ───────────────────────────────────────────────────────────
  const { stops, progress, vehicle, route, isLoading, error, fetchMyRoute } = useRouteStore();

  const [tipVisible, setTipVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ecoTip]     = useState(() => ECO_TIPS[Math.floor(Math.random() * ECO_TIPS.length)]);

  // Fetch route on mount
  useEffect(() => {
    fetchMyRoute();
  }, []);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMyRoute();
    setRefreshing(false);
  }, [fetchMyRoute]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const completed = progress?.completed ?? 0;
  const total     = progress?.total ?? 0;
  const pending   = progress?.pending ?? 0;
  const pct       = total > 0 ? completed / total : 0;

  // Filter to non-completed stops, sorted by sequence_order
  const upcomingStops = stops
    .filter(s => s.status === 'PENDING' || s.status === 'IN_PROGRESS')
    .sort((a, b) => a.sequence_order - b.sequence_order);
  const activeStopId =
    upcomingStops.find(s => s.status === 'IN_PROGRESS')?.id ?? upcomingStops[0]?.id ?? null;

  const loadPercent = vehicle?.load_percent ?? 0;
  const currentLoadKg = vehicle?.current_load_kg ?? 0;
  const shiftLabel  = route?.shift === 'AM' ? 'MORNING SHIFT' : route?.shift === 'PM' ? 'EVENING SHIFT' : 'SHIFT';

  // ── Animated progress bar ─────────────────────────────────────────────────
  const barAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barAnim, { toValue: pct, duration: 900, delay: 300, useNativeDriver: false }).start();
  }, [pct]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading && !route) {
    return (
      <View style={[s.root, s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.green} />
        <Text style={s.loadingText}>Loading route…</Text>
      </View>
    );
  }

  // ── Error / No route state ────────────────────────────────────────────────
  if (!route && !isLoading) {
    return (
      <View style={[s.root, s.centered, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.warning} />
        <Text style={s.emptyTitle}>No Route Assigned</Text>
        <Text style={s.emptyText}>
          {error ?? 'You don\'t have an active route for this shift. Contact your supervisor.'}
        </Text>
        <BigButton label="Retry" icon="refresh" onPress={fetchMyRoute} variant="primary" style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.logoBox}>
            <Ionicons name="reload-circle" size={22} color={Colors.green} />
          </View>
          <View>
            <Text style={s.appName}>ES-WMS</Text>
            <Text style={s.headerSub}>{user?.name ?? 'Driver'} · {shiftLabel}</Text>
          </View>
        </View>
        <TouchableOpacity style={s.alertBtn} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
          <Ionicons name="warning" size={22} color={Colors.warning} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />
        }>

        {/* ── Progress Card ── */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>ROUTE PROGRESS</Text>
          <View style={s.countRow}>
            <Text style={s.countBig}>{completed}</Text>
            <Text style={s.countOf}>/{total}</Text>
          </View>
          <Text style={s.countSub}>Stops Completed</Text>
          <View style={s.barTrack}>
            <Animated.View style={[s.barFill, {
              width: barAnim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }),
            }]} />
            <View style={s.barLabel}>
              <Text style={s.barLabelText}>{Math.round(pct * 100)}% TOTAL</Text>
            </View>
          </View>
        </View>

        {/* ── Vehicle Load Card ── */}
        {vehicle && (
          <View style={s.loadCard}>
            <Text style={s.loadLabel}>VEHICLE LOAD</Text>
            <LoadGauge
              percent={loadPercent}
              loadKg={vehicle.capacity_kg - 1000}
              capacity={vehicle.capacity_kg}
            />
            <View style={s.vehicleRow}>
              <Ionicons name="bus" size={16} color={Colors.textOnDarkMuted} />
              <Text style={s.vehicleId}>{vehicle.registration_no}</Text>
            </View>
            <Text style={s.loadDetail}>
              {currentLoadKg.toLocaleString()} kg / {vehicle.capacity_kg.toLocaleString()} kg
            </Text>
            {loadPercent >= 75 && (
              <View style={s.warnRow}>
                <Ionicons name="warning" size={14} color={Colors.warning} />
                <Text style={s.warnText}>
                  {loadPercent >= 90
                    ? 'Truck approaching capacity — 1–2 stops remaining'
                    : 'High load — monitor remaining capacity'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Eco Tip ── */}
        {tipVisible && (
          <View style={s.tipCard}>
            <View style={s.tipIcon}>
              <Ionicons name="bulb" size={22} color={Colors.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.tipTitle}>Did you know?</Text>
              <Text style={s.tipBody}>{ecoTip}</Text>
            </View>
            <TouchableOpacity onPress={() => setTipVisible(false)}
              hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
              <Ionicons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Up Next ── */}
        <View style={s.upNextRow}>
          <Text style={s.upNextTitle}>Up Next</Text>
          <View style={s.pendingPill}>
            <Text style={s.pendingText}>{pending} PENDING</Text>
          </View>
        </View>

        {upcomingStops.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="checkmark-done-circle" size={36} color={Colors.green} />
            <Text style={s.emptyCardTitle}>All Stops Completed!</Text>
            <Text style={s.emptyCardText}>Great work. All societies on this route have been serviced.</Text>
          </View>
        ) : (
          upcomingStops.map(stop => (
            <StopCard key={stop.id} stop={stop}
              isActive={stop.id === activeStopId}
              onPress={() => navigation.navigate('StopDetail', { stopId: stop.id })}
              onNavigate={() => {}} />
          ))
        )}

        {/* ── Map Strip ── */}
        <TouchableOpacity style={s.mapStrip} activeOpacity={0.85}>
          <View style={s.mapBg}>
            <Ionicons name="map" size={36} color={Colors.textMuted} style={{ opacity: 0.4 }} />
          </View>
          <View style={s.mapCta}>
            <Ionicons name="map-outline" size={18} color={Colors.textPrimary} />
            <Text style={s.mapCtaText}>VIEW FULL ROUTE MAP</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  scroll:  { flex: 1 },
  content: { padding: 16, gap: 12 },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 32 },

  // Loading / empty
  loadingText: { fontSize: 14, color: Colors.textSecondary, marginTop: 12 },
  emptyTitle:  { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 16 },
  emptyText:   { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyCard:   { backgroundColor: Colors.surface, borderRadius: Theme.radiusMd, padding: 24,
                 alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 8 },
  emptyCardTitle: { fontSize: 18, fontWeight: '700', color: Colors.green },
  emptyCardText:  { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },

  // Header
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               paddingHorizontal: 16, paddingVertical: 12,
               backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerLeft:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox:   { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.navyDark,
               justifyContent: 'center', alignItems: 'center' },
  appName:   { fontSize: 16, fontWeight: '800', color: Colors.navyDark, letterSpacing: 1.5 },
  headerSub: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  alertBtn:  { width: 44, height: 44, borderRadius: 10, backgroundColor: Colors.warningMuted,
               justifyContent: 'center', alignItems: 'center' },

  // Progress card
  card:        { backgroundColor: Colors.surface, borderRadius: Theme.radiusMd,
                 padding: 20, borderWidth: 1, borderColor: Colors.border },
  sectionLabel:{ fontSize: 10, fontWeight: '700', color: Colors.textMuted,
                 letterSpacing: 1.5, marginBottom: 8 },
  countRow:    { flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 },
  countBig:    { fontSize: 52, fontWeight: '900', color: Colors.textPrimary, lineHeight: 56 },
  countOf:     { fontSize: 36, fontWeight: '700', color: Colors.textMuted, marginLeft: 2 },
  countSub:    { fontSize: 14, color: Colors.textSecondary, fontWeight: '500', marginBottom: 16 },
  barTrack:    { height: 28, backgroundColor: Colors.surfaceGrey, borderRadius: 6,
                 overflow: 'hidden', position: 'relative' },
  barFill:     { position: 'absolute', left: 0, top: 0, bottom: 0,
                 backgroundColor: Colors.green, borderRadius: 6 },
  barLabel:    { position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center' },
  barLabelText:{ fontSize: 11, fontWeight: '700', color: Colors.textPrimary },

  // Load card
  loadCard:  { backgroundColor: Colors.navyDark, borderRadius: Theme.radiusMd,
               padding: 20, alignItems: 'center', gap: 8 },
  loadLabel: { fontSize: 10, fontWeight: '700', color: Colors.textOnDarkMuted, letterSpacing: 2 },
  vehicleRow:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  vehicleId: { fontSize: 14, fontWeight: '700', color: Colors.textOnDark, letterSpacing: 1 },
  loadDetail:{ fontSize: 12, color: Colors.textOnDarkMuted },
  warnRow:   { flexDirection: 'row', alignItems: 'center', gap: 6,
               backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 8,
               paddingHorizontal: 12, paddingVertical: 8, marginTop: 4 },
  warnText:  { fontSize: 11, color: Colors.warning, fontWeight: '600', flex: 1 },

  // Eco tip
  tipCard:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12,
               backgroundColor: Colors.surface, borderRadius: Theme.radiusMd,
               padding: 14, borderWidth: 1, borderColor: Colors.border },
  tipIcon:   { width: 36, height: 36, borderRadius: 8, backgroundColor: '#D1FAE5',
               justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  tipTitle:  { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 3 },
  tipBody:   { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

  // Up Next
  upNextRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 marginTop: 4, marginBottom: 4 },
  upNextTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  pendingPill: { backgroundColor: Colors.warningMuted, borderRadius: 6,
                 paddingHorizontal: 10, paddingVertical: 4 },
  pendingText: { fontSize: 11, fontWeight: '700', color: Colors.green, letterSpacing: 0.5 },

  // Map strip
  mapStrip: { borderRadius: Theme.radiusMd, overflow: 'hidden',
              borderWidth: 1, borderColor: Colors.border, marginTop: 4 },
  mapBg:    { height: 100, backgroundColor: Colors.surfaceGrey,
              justifyContent: 'center', alignItems: 'center' },
  mapCta:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 8, backgroundColor: Colors.surface, paddingVertical: 14 },
  mapCtaText:{ fontSize: 13, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.8 },
});
