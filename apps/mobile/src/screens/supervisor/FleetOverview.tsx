// File: es-wms/apps/mobile/src/screens/supervisor/FleetOverview.tsx

/**
 * FleetOverview — Supervisor Main Dashboard
 *
 * The Mukadam (field supervisor) manages all vehicles in their zone.
 * This screen is data-dense — they are reading reports, not tapping
 * glove-friendly buttons — so information hierarchy is the priority.
 *
 * Layout:
 *   1. Header: Ward / Zone ID + supervisor name + alerts bell
 *   2. Summary strip: Trucks Active | Stops Done | Alerts Pending
 *   3. Capacity warning banner (if any truck ≥ 90% full)
 *   4. Scrollable "Active Routes" section — one card per truck
 *      Each card: Truck ID, Driver name, route progress bar,
 *                 last GPS ping, status pill, quick-action chevron
 *   5. "Flagged Alerts" mini-feed at the bottom (badge count)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { Colors, Theme } from '../../theme/colors';
import StatusBadge from '../../components/StatusBadge';
import { useAuthStore } from '../../stores/authStore';
import type { SupervisorTabParams } from '../../navigation/SupervisorStack';

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteStatus = 'on_track' | 'delayed' | 'attention';

interface ActiveRoute {
  id:            string;
  truckId:       string;
  driverName:    string;
  totalStops:    number;
  completedStops: number;
  skippedStops:  number;
  loadPercent:   number;
  status:        RouteStatus;
  lastPing:      string;       // "2 min ago"
  alertCount:    number;
}

interface Alert {
  id:       string;
  type:     'false_claim' | 'inaccessible' | 'photo_missing' | 'capacity';
  truckId:  string;
  driver:   string;
  message:  string;
  time:     string;
  severity: 'high' | 'medium';
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ZONE = {
  wardName: 'Ward K-East',
  zoneId:   'ZONE-04',
  date:     'Tuesday, 7 April 2026',
  shift:    'Morning Shift (06:00 – 14:00)',
  summary: {
    trucksActive:    4,
    trucksTotal:     5,
    stopsCompleted:  67,
    stopsTotal:      160,
    alertsPending:   3,
  },
};

const MOCK_ROUTES: ActiveRoute[] = [
  {
    id:             'route-01',
    truckId:        'TRUCK-4029',
    driverName:     'Ajay Sharma',
    totalStops:     40,
    completedStops: 14,
    skippedStops:   1,
    loadPercent:    84,
    status:         'attention',
    lastPing:       '1 min ago',
    alertCount:     2,
  },
  {
    id:             'route-02',
    truckId:        'TRUCK-3817',
    driverName:     'Suresh Patil',
    totalStops:     38,
    completedStops: 22,
    skippedStops:   0,
    loadPercent:    55,
    status:         'on_track',
    lastPing:       '2 min ago',
    alertCount:     0,
  },
  {
    id:             'route-03',
    truckId:        'TRUCK-4102',
    driverName:     'Ramesh Kale',
    totalStops:     42,
    completedStops: 18,
    skippedStops:   3,
    loadPercent:    92,
    status:         'delayed',
    lastPing:       '4 min ago',
    alertCount:     1,
  },
  {
    id:             'route-04',
    truckId:        'TRUCK-3654',
    driverName:     'Dinesh More',
    totalStops:     40,
    completedStops: 13,
    skippedStops:   0,
    loadPercent:    40,
    status:         'on_track',
    lastPing:       '1 min ago',
    alertCount:     0,
  },
];

const MOCK_ALERTS: Alert[] = [
  {
    id:       'alert-01',
    type:     'false_claim',
    truckId:  'TRUCK-4029',
    driver:   'Ajay Sharma',
    message:  'TRUCK_FULL claimed at 84% load — below 85% threshold',
    time:     '08:42 AM',
    severity: 'high',
  },
  {
    id:       'alert-02',
    type:     'capacity',
    truckId:  'TRUCK-4102',
    driver:   'Ramesh Kale',
    message:  'Vehicle at 92% capacity — approaching full',
    time:     '09:15 AM',
    severity: 'high',
  },
  {
    id:       'alert-03',
    type:     'inaccessible',
    truckId:  'TRUCK-4029',
    driver:   'Ajay Sharma',
    message:  'INACCESSIBLE marked at Crystal Heights (2nd time this week)',
    time:     '09:31 AM',
    severity: 'medium',
  },
];

// ─── Route Status config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<RouteStatus, {
  label: string; bg: string; text: string;
  icon: keyof typeof Ionicons.glyphMap; dot: string;
}> = {
  on_track:  { label: 'On Track',       bg: '#D1FAE5', text: Colors.greenMuted,  icon: 'checkmark-circle', dot: Colors.green   },
  delayed:   { label: 'Delayed',        bg: Colors.warningMuted, text: Colors.warningDark, icon: 'time-outline', dot: Colors.warning },
  attention: { label: 'Needs Attention',bg: Colors.dangerMuted,  text: Colors.dangerDark,  icon: 'warning',      dot: Colors.danger  },
};

// ─── Summary Stat Widget ──────────────────────────────────────────────────────

function StatWidget({
  value, label, icon, accent, sub,
}: { value: string; label: string; icon: keyof typeof Ionicons.glyphMap; accent: string; sub?: string }) {
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState(0);
  const target = parseInt(value, 10) || 0;

  useEffect(() => {
    let n = 0;
    const step  = Math.max(1, Math.floor(target / 30));
    const timer = setInterval(() => {
      n += step;
      if (n >= target) { setDisplayed(target); clearInterval(timer); }
      else setDisplayed(n);
    }, 20);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <View style={swS.widget}>
      <View style={[swS.iconWrap, { backgroundColor: accent + '22' }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <Text style={[swS.value, { color: accent }]}>
        {isNaN(target) ? value : displayed}
        {sub ? <Text style={swS.sub}>{sub}</Text> : null}
      </Text>
      <Text style={swS.label}>{label}</Text>
    </View>
  );
}

const swS = StyleSheet.create({
  widget:  { flex: 1, alignItems: 'center', gap: 5 },
  iconWrap:{ width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  value:   { fontSize: 22, fontWeight: '900', lineHeight: 24 },
  sub:     { fontSize: 13, fontWeight: '600' },
  label:   { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, textAlign: 'center' },
});

// ─── Route Card ───────────────────────────────────────────────────────────────

function RouteCard({ route, onPress }: { route: ActiveRoute; onPress: () => void }) {
  const cfg      = STATUS_CONFIG[route.status];
  const progress = route.completedStops / route.totalStops;
  const barAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ⚠ MUST be separate — barAnim animates width (layout, JS driver only).
    // fadeAnim animates opacity (native driver OK).
    // Mixing them in Animated.parallel() causes the
    // "node moved to native" crash because parallel enforces a single driver.
    Animated.timing(fadeAnim, {
      toValue:         1,
      duration:        350,
      useNativeDriver: true,   // ✅ opacity — native OK
    }).start();

    Animated.timing(barAnim, {
      toValue:         progress,
      duration:        700,
      delay:           200,
      useNativeDriver: false,  // ✅ width (layout) — must be JS driver
    }).start();
  }, []);

  const loadColor =
    route.loadPercent >= 90 ? Colors.danger :
    route.loadPercent >= 75 ? Colors.warning :
    Colors.green;

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity style={rcS.card} onPress={onPress} activeOpacity={0.85}>

        {/* ── Top row: Truck + Status ── */}
        <View style={rcS.topRow}>
          <View style={rcS.truckBlock}>
            <View style={rcS.truckIcon}>
              <Ionicons name="bus" size={18} color={Colors.white} />
            </View>
            <View>
              <Text style={rcS.truckId}>{route.truckId}</Text>
              <Text style={rcS.driverName}>{route.driverName}</Text>
            </View>
          </View>

          <View style={rcS.rightMeta}>
            {/* Alert badge */}
            {route.alertCount > 0 && (
              <View style={rcS.alertBadge}>
                <Ionicons name="warning" size={11} color={Colors.white} />
                <Text style={rcS.alertBadgeText}>{route.alertCount}</Text>
              </View>
            )}
            {/* Status pill */}
            <View style={[rcS.statusPill, { backgroundColor: cfg.bg }]}>
              <View style={[rcS.statusDot, { backgroundColor: cfg.dot }]} />
              <Text style={[rcS.statusText, { color: cfg.text }]}>{cfg.label}</Text>
            </View>
          </View>
        </View>

        {/* ── Progress bar ── */}
        <View style={rcS.progressMeta}>
          <Text style={rcS.progressLabel}>
            {route.completedStops}/{route.totalStops} stops
          </Text>
          {route.skippedStops > 0 && (
            <Text style={rcS.skippedText}>{route.skippedStops} skipped</Text>
          )}
        </View>

        <View style={rcS.barTrack}>
          <Animated.View style={[rcS.barFill, {
            width:           barAnim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }),
            backgroundColor: route.status === 'on_track' ? Colors.green : cfg.dot,
          }]} />
          {/* Skipped overlay strip */}
          {route.skippedStops > 0 && (
            <View style={[rcS.skippedStrip, {
              width: `${(route.skippedStops / route.totalStops) * 100}%`,
            }]} />
          )}
        </View>

        {/* ── Bottom row: Load + Ping ── */}
        <View style={rcS.bottomRow}>
          <View style={rcS.loadChip}>
            <Ionicons name="speedometer-outline" size={12} color={loadColor} />
            <Text style={[rcS.loadText, { color: loadColor }]}>
              {route.loadPercent}% load
            </Text>
          </View>
          <View style={rcS.pingChip}>
            <View style={rcS.pingDot} />
            <Text style={rcS.pingText}>GPS {route.lastPing}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </View>

      </TouchableOpacity>
    </Animated.View>
  );
}

const rcS = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Theme.radiusMd,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
    shadowColor: Colors.navyDark, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 5, elevation: 2, gap: 10,
  },
  topRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  truckBlock: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  truckIcon:  {
    width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.navyDark,
    justifyContent: 'center', alignItems: 'center',
  },
  truckId:    { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  driverName: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },

  rightMeta:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  alertBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.danger, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  alertBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.white },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel:{ fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  skippedText:  { fontSize: 11, fontWeight: '700', color: Colors.danger },

  barTrack: { height: 8, backgroundColor: Colors.surfaceGrey, borderRadius: 4, overflow: 'hidden' },
  barFill:  { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  skippedStrip: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    backgroundColor: Colors.dangerMuted, borderRadius: 4,
  },

  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadChip:  { flexDirection: 'row', alignItems: 'center', gap: 4,
               backgroundColor: Colors.surfaceGrey, borderRadius: 6,
               paddingHorizontal: 8, paddingVertical: 4 },
  loadText:  { fontSize: 11, fontWeight: '700' },
  pingChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  pingDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.green },
  pingText:  { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
});

// ─── Alert Row ────────────────────────────────────────────────────────────────

function AlertRow({ alert }: { alert: Alert }) {
  const iconMap: Record<Alert['type'], keyof typeof Ionicons.glyphMap> = {
    false_claim:   'warning',
    inaccessible:  'ban',
    photo_missing: 'camera-outline',
    capacity:      'speedometer',
  };
  const isHigh = alert.severity === 'high';

  return (
    <View style={[arS.row, isHigh && arS.rowHigh]}>
      <View style={[arS.iconWrap, { backgroundColor: isHigh ? Colors.dangerMuted : Colors.warningMuted }]}>
        <Ionicons name={iconMap[alert.type]} size={16}
          color={isHigh ? Colors.danger : Colors.warning} />
      </View>
      <View style={arS.content}>
        <View style={arS.metaRow}>
          <Text style={arS.truckLabel}>{alert.truckId}</Text>
          <Text style={arS.timeLabel}>{alert.time}</Text>
        </View>
        <Text style={arS.message} numberOfLines={2}>{alert.message}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
    </View>
  );
}

const arS = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowHigh: {},
  iconWrap: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  content:  { flex: 1, gap: 2 },
  metaRow:  { flexDirection: 'row', justifyContent: 'space-between' },
  truckLabel:{ fontSize: 11, fontWeight: '800', color: Colors.navyDark },
  timeLabel: { fontSize: 10, color: Colors.textMuted },
  message:   { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

type NavProp = BottomTabNavigationProp<SupervisorTabParams, 'FleetTab'>;

export default function FleetOverview() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const user       = useAuthStore(s => s.user);
  const logout     = useAuthStore(s => s.logout);

  const [refreshing, setRefreshing] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1200));
    setRefreshing(false);
  };

  const { summary } = MOCK_ZONE;
  const completionPct = Math.round((summary.stopsCompleted / summary.stopsTotal) * 100);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <Animated.View style={[s.header, { opacity: headerAnim }]}>
        <View style={s.headerLeft}>
          <View style={s.logoBox}>
            <Ionicons name="reload-circle" size={20} color={Colors.green} />
          </View>
          <View>
            <Text style={s.headerTitle}>ES-WMS</Text>
            <Text style={s.headerSub}>{MOCK_ZONE.wardName} · {MOCK_ZONE.zoneId}</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          {/* Alerts bell */}
          <TouchableOpacity
            style={s.bellBtn}
            onPress={() => navigation.navigate('AuditTab')}
          >
            <Ionicons name="notifications" size={20} color={Colors.white} />
            {summary.alertsPending > 0 && (
              <View style={s.bellBadge}>
                <Text style={s.bellBadgeText}>{summary.alertsPending}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.avatarBtn} onPress={logout}>
            <Ionicons name="person-circle-outline" size={28} color={Colors.textOnDarkMuted} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={Colors.green} colors={[Colors.green]} />
        }
      >
        {/* ── Shift info strip ── */}
        <View style={s.shiftStrip}>
          <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
          <Text style={s.shiftText}>{MOCK_ZONE.date} · {MOCK_ZONE.shift}</Text>
        </View>

        {/* ── Summary stats card ── */}
        <View style={s.summaryCard}>
          <Text style={s.sectionLabel}>TODAY'S OVERVIEW</Text>

          {/* Zone completion bar */}
          <View style={s.zoneRow}>
            <Text style={s.zoneCompLabel}>Zone Completion</Text>
            <Text style={s.zoneCompPct}>{completionPct}%</Text>
          </View>
          <View style={s.zoneBarTrack}>
            <View style={[s.zoneBarFill, { width: `${completionPct}%` }]} />
          </View>

          {/* 3 stat widgets */}
          <View style={s.statsRow}>
            <StatWidget
              value={`${summary.trucksActive}`}
              sub={`/${summary.trucksTotal}`}
              label="TRUCKS ACTIVE"
              icon="bus-outline"
              accent={Colors.green}
            />
            <View style={s.statDivider} />
            <StatWidget
              value={`${summary.stopsCompleted}`}
              sub={`/${summary.stopsTotal}`}
              label="STOPS DONE"
              icon="checkmark-done-outline"
              accent={Colors.statusProgress}
            />
            <View style={s.statDivider} />
            <StatWidget
              value={`${summary.alertsPending}`}
              label="ALERTS"
              icon="warning-outline"
              accent={summary.alertsPending > 0 ? Colors.danger : Colors.textMuted}
            />
          </View>
        </View>

        {/* ── Capacity warning banner ── */}
        {MOCK_ROUTES.some(r => r.loadPercent >= 90) && (
          <View style={s.capacityBanner}>
            <Ionicons name="warning" size={18} color={Colors.warning} />
            <Text style={s.capacityBannerText}>
              {MOCK_ROUTES.filter(r => r.loadPercent >= 90).length} vehicle(s) at critical capacity — require immediate depot return
            </Text>
          </View>
        )}

        {/* ── Active Routes ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Active Routes</Text>
          <View style={s.countPill}>
            <Text style={s.countPillText}>{MOCK_ROUTES.length} vehicles</Text>
          </View>
        </View>

        {MOCK_ROUTES.map(route => (
          <RouteCard
            key={route.id}
            route={route}
            onPress={() => navigation.navigate('AuditTab')}
          />
        ))}

        {/* ── Flagged Alerts ── */}
        <View style={[s.sectionHeader, { marginTop: 8 }]}>
          <Text style={s.sectionTitle}>Flagged Alerts</Text>
          <View style={[s.countPill, { backgroundColor: Colors.dangerMuted }]}>
            <Text style={[s.countPillText, { color: Colors.danger }]}>
              {MOCK_ALERTS.length} pending
            </Text>
          </View>
        </View>

        <View style={s.alertsCard}>
          {MOCK_ALERTS.map(alert => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
          <TouchableOpacity style={s.viewAllBtn} onPress={() => navigation.navigate('AuditTab')}>
            <Text style={s.viewAllText}>View All in Audit Tab →</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
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
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBox: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: Colors.white, letterSpacing: 1.5 },
  headerSub:   { fontSize: 11, color: Colors.textOnDarkMuted, fontWeight: '600' },
  bellBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  bellBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.danger,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.navyDark,
  },
  bellBadgeText: { fontSize: 8, fontWeight: '800', color: Colors.white },
  avatarBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  // Shift strip
  shiftStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: Theme.radiusSm,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  shiftText: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },

  // Summary card
  summaryCard: {
    backgroundColor: Colors.surface, borderRadius: Theme.radiusMd,
    padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5 },

  zoneRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  zoneCompLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  zoneCompPct:   { fontSize: 20, fontWeight: '900', color: Colors.navyDark },
  zoneBarTrack:  { height: 8, backgroundColor: Colors.surfaceGrey, borderRadius: 4, overflow: 'hidden' },
  zoneBarFill:   { height: '100%', backgroundColor: Colors.green, borderRadius: 4 },

  statsRow:    { flexDirection: 'row', alignItems: 'center' },
  statDivider: { width: 1, height: 44, backgroundColor: Colors.border, marginHorizontal: 8 },

  // Capacity banner
  capacityBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: Colors.warningMuted, borderRadius: Theme.radiusSm,
    padding: 12, borderLeftWidth: 3, borderLeftColor: Colors.warning,
  },
  capacityBannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: Colors.warningDark, lineHeight: 18 },

  // Section headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle:  { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  countPill: {
    backgroundColor: Colors.surfaceGrey, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  countPillText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },

  // Alerts card
  alertsCard: {
    backgroundColor: Colors.surface, borderRadius: Theme.radiusMd,
    paddingHorizontal: 14, paddingTop: 4, paddingBottom: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  viewAllBtn: { paddingVertical: 12, alignItems: 'center' },
  viewAllText:{ fontSize: 12, fontWeight: '700', color: Colors.green },
});