// File: es-wms/apps/mobile/src/screens/citizen/CitizenDashboard.tsx

/**
 * CitizenDashboard — Resident Home Screen (PRD FR-CIT-01)
 *
 * A consumer-friendly dashboard — warmer than the driver/supervisor
 * screens, but still respects the BMC navy/white brand palette.
 *
 * Layout (top → bottom):
 *   1. Header: BMC logo + society name + notification bell
 *   2. Hero ETA card: live pickup status with countdown + vehicle distance
 *   3. Segregation Score widget: circular ring + grade + 7-day sparkline
 *   4. Quick-action buttons: Report Missed Pickup | View Fines & Alerts
 *   5. Recent activity strip (last 3 notifications)
 *   6. "Did You Know?" eco tip
 *
 * PRD references:
 *   FR-CIT-01 — Today's scheduled pickup time + current status
 *   FR-CIT-04 — Segregation compliance score (0–100)
 *   FR-CIT-07 — Named driver + vehicle assigned for the day
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { Colors, Theme } from '../../theme/colors';
import StatusBadge  from '../../components/StatusBadge';
import BigButton    from '../../components/BigButton';
import { useAuthStore } from '../../stores/authStore';
import type { CitizenTabParams } from '../../navigation/CitizenStack';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

type PickupStatus = 'scheduled' | 'en_route' | 'arriving' | 'completed' | 'skipped';
type NavProp = BottomTabNavigationProp<CitizenTabParams, 'StatusTab'>;

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_CITIZEN = {
  societyName:   'Gokuldham Society',
  ward:          'Ward K-East',
  scheduledTime: '09:30 AM',
  pickup: {
    status:        'en_route' as PickupStatus,
    etaMinutes:    15,
    distanceKm:    '1.4',
    driverName:    'Ajay Sharma',
    vehicleId:     'TRUCK-4029',
    lastUpdated:   '2 min ago',
    stopsAway:     3,
  },
  segregation: {
    score:        92,
    grade:        'Good',
    weeklyScores: [78, 85, 90, 88, 95, 91, 92],  // last 7 days
    streak:       5,  // days of good segregation in a row
  },
  walletBalance: 8500,
  pendingFines:  1,
  recentEvents: [
    {
      id: 'evt-01', type: 'completed' as const,
      title: 'Pickup Completed',
      sub: 'Yesterday at 09:44 AM · On time',
      icon: 'checkmark-circle' as const,
    },
    {
      id: 'evt-02', type: 'skipped' as const,
      title: 'Truck Skipped — Truck Full',
      sub: '5 Apr · Backlog scheduled for 6 Apr',
      icon: 'close-circle' as const,
    },
    {
      id: 'evt-03', type: 'warning' as const,
      title: 'Mixed Waste Detected',
      sub: '3 Apr · ₹500 fine issued',
      icon: 'warning' as const,
    },
  ],
  ecoTip: 'Keep wet and dry waste in separate bins. It helps reduce landfill use by up to 60%.',
};

// ─── Pickup status config ─────────────────────────────────────────────────────

const PICKUP_CONFIG: Record<PickupStatus, {
  label:   string;
  color:   string;
  bgColor: string;
  icon:    keyof typeof Ionicons.glyphMap;
  pulse:   boolean;
}> = {
  scheduled: { label: 'Scheduled',   color: Colors.statusProgress, bgColor: '#EFF6FF', icon: 'calendar-outline', pulse: false },
  en_route:  { label: 'On the Way',  color: Colors.green,          bgColor: '#F0FAF2', icon: 'bus',              pulse: true  },
  arriving:  { label: 'Almost Here', color: Colors.green,          bgColor: '#D1FAE5', icon: 'navigate',         pulse: true  },
  completed: { label: 'Completed',   color: Colors.greenMuted,     bgColor: '#D1FAE5', icon: 'checkmark-circle', pulse: false },
  skipped:   { label: 'Skipped',     color: Colors.danger,         bgColor: Colors.dangerMuted, icon: 'close-circle', pulse: false },
};

// ─── Segregation Score Ring ───────────────────────────────────────────────────

function SegregationRing({ score, grade }: { score: number; grade: string }) {
  const [displayed, setDisplayed] = useState(0);
  const size        = 110;
  const stroke      = 10;
  const radius      = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    let n = 0;
    const timer = setInterval(() => {
      n += 2;
      if (n >= score) { setDisplayed(score); clearInterval(timer); }
      else setDisplayed(n);
    }, 14);
    return () => clearInterval(timer);
  }, [score]);

  const dashOffset = circumference * (1 - displayed / 100);
  const ringColor  = score >= 80 ? Colors.green : score >= 60 ? Colors.warning : Colors.danger;
  const gradeColor = ringColor;

  return (
    <View style={srS.wrapper}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size/2} cy={size/2} r={radius}
          stroke={Colors.surfaceGrey} strokeWidth={stroke} fill="none" />
        <Circle cx={size/2} cy={size/2} r={radius}
          stroke={ringColor} strokeWidth={stroke} fill="none"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round" rotation="-90" originX={size/2} originY={size/2} />
      </Svg>
      <View style={srS.center}>
        <Text style={[srS.score, { color: ringColor }]}>{displayed}</Text>
        <Text style={srS.scoreLabel}>/ 100</Text>
      </View>
    </View>
  );
}

const srS = StyleSheet.create({
  wrapper:    { width: 110, height: 110, alignItems: 'center', justifyContent: 'center' },
  center:     { alignItems: 'center' },
  score:      { fontSize: 26, fontWeight: '900', lineHeight: 28 },
  scoreLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
});

// ─── 7-Day Sparkline ──────────────────────────────────────────────────────────

function Sparkline({ scores }: { scores: number[] }) {
  const W = 90, H = 30;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const normalize = (v: number) =>
    H - ((v - min) / (max - min + 1)) * H;

  const points = scores
    .map((v, i) => `${(i / (scores.length - 1)) * W},${normalize(v)}`)
    .join(' ');

  return (
    <Svg width={W} height={H} style={{ overflow: 'visible' }}>
      <Polyline
        points={points}
        fill="none"
        stroke={Colors.green}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Pulsing Status Dot ───────────────────────────────────────────────────────

function PulseDot({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View style={{
      width: 10, height: 10, borderRadius: 5,
      backgroundColor: color, opacity: anim,
    }} />
  );
}

// ─── Recent Event Row ─────────────────────────────────────────────────────────

function EventRow({ event }: { event: typeof MOCK_CITIZEN.recentEvents[0] }) {
  const colorMap = {
    completed: Colors.green,
    skipped:   Colors.danger,
    warning:   Colors.warning,
  };
  const bgMap = {
    completed: '#D1FAE5',
    skipped:   Colors.dangerMuted,
    warning:   Colors.warningMuted,
  };
  const color = colorMap[event.type];
  const bg    = bgMap[event.type];

  return (
    <View style={erS.row}>
      <View style={[erS.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={event.icon} size={16} color={color} />
      </View>
      <View style={erS.content}>
        <Text style={erS.title}>{event.title}</Text>
        <Text style={erS.sub}>{event.sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
    </View>
  );
}

const erS = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', gap: 10,
             paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  iconWrap:{ width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  content: { flex: 1, gap: 2 },
  title:   { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  sub:     { fontSize: 11, color: Colors.textSecondary },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CitizenDashboard() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const user       = useAuthStore(s => s.user);

  const headerFade = useRef(new Animated.Value(0)).current;
  const cardSlide  = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(cardSlide,  { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14, delay: 100 }),
    ]).start();
  }, []);

  const pickup = MOCK_CITIZEN.pickup;
  const seg    = MOCK_CITIZEN.segregation;
  const cfg    = PICKUP_CONFIG[pickup.status];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <Animated.View style={[s.header, { opacity: headerFade }]}>
        <View style={s.headerLeft}>
          <View style={s.logoBadge}>
            <Ionicons name="reload-circle" size={20} color={Colors.green} />
          </View>
          <View>
            <Text style={s.societyName}>{MOCK_CITIZEN.societyName}</Text>
            <Text style={s.wardName}>{MOCK_CITIZEN.ward}</Text>
          </View>
        </View>
        {/* Notification bell */}
        <TouchableOpacity
          style={s.bellBtn}
          onPress={() => navigation.navigate('NotificationsTab')}
        >
          <Ionicons name="notifications-outline" size={22} color={Colors.white} />
          <View style={s.bellBadge} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero ETA Card ── */}
        <Animated.View style={{ transform: [{ translateY: cardSlide }] }}>
          <View style={[s.etaCard, { backgroundColor: cfg.bgColor, borderColor: cfg.color + '44' }]}>

            {/* Top row: status label + pulse */}
            <View style={s.etaTopRow}>
              <View style={s.etaStatusRow}>
                {cfg.pulse && <PulseDot color={cfg.color} />}
                <Ionicons name={cfg.icon} size={16} color={cfg.color} />
                <Text style={[s.etaStatusText, { color: cfg.color }]}>
                  {cfg.label.toUpperCase()}
                </Text>
              </View>
              <Text style={s.etaUpdated}>Updated {pickup.lastUpdated}</Text>
            </View>

            {/* ETA hero number */}
            {pickup.status === 'en_route' || pickup.status === 'arriving' ? (
              <View style={s.etaHeroRow}>
                <Text style={[s.etaNumber, { color: cfg.color }]}>
                  {pickup.etaMinutes}
                </Text>
                <View style={s.etaHeroRight}>
                  <Text style={s.etaUnit}>mins away</Text>
                  <Text style={s.etaDistance}>{pickup.distanceKm} km</Text>
                </View>
              </View>
            ) : pickup.status === 'completed' ? (
              <Text style={[s.etaCompletedText, { color: cfg.color }]}>
                Pickup Done ✓
              </Text>
            ) : pickup.status === 'skipped' ? (
              <Text style={[s.etaCompletedText, { color: cfg.color }]}>
                Skipped Today
              </Text>
            ) : (
              <View style={s.etaHeroRow}>
                <Text style={[s.etaScheduledTime, { color: cfg.color }]}>
                  {MOCK_CITIZEN.scheduledTime}
                </Text>
              </View>
            )}

            {/* Stops away */}
            {(pickup.status === 'en_route' || pickup.status === 'arriving') && (
              <View style={s.stopsAwayRow}>
                <Ionicons name="location-outline" size={13} color={cfg.color} />
                <Text style={[s.stopsAwayText, { color: cfg.color }]}>
                  {pickup.stopsAway} stop{pickup.stopsAway !== 1 ? 's' : ''} before yours
                </Text>
              </View>
            )}

            {/* Driver info */}
            <View style={[s.driverRow, { borderTopColor: cfg.color + '33' }]}>
              <View style={s.driverAvatar}>
                <Ionicons name="person" size={13} color={Colors.white} />
              </View>
              <Text style={s.driverText}>
                {pickup.driverName} · {pickup.vehicleId}
              </Text>
              <TouchableOpacity style={[s.trackBtn, { borderColor: cfg.color }]}>
                <Ionicons name="navigate-outline" size={13} color={cfg.color} />
                <Text style={[s.trackBtnText, { color: cfg.color }]}>Track</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* ── Segregation Score Card ── */}
        <View style={s.segCard}>
          <View style={s.segLeft}>
            <SegregationRing score={seg.score} grade={seg.grade} />
          </View>

          <View style={s.segRight}>
            <Text style={s.segTitle}>Segregation Score</Text>
            <View style={s.gradeRow}>
              <View style={[s.gradePill, {
                backgroundColor: seg.score >= 80 ? '#D1FAE5' : Colors.warningMuted,
              }]}>
                <Text style={[s.gradeText, {
                  color: seg.score >= 80 ? Colors.greenMuted : Colors.warningDark,
                }]}>{seg.grade}</Text>
              </View>
              {seg.streak >= 3 && (
                <View style={s.streakPill}>
                  <Ionicons name="flame" size={11} color={Colors.skipOrange} />
                  <Text style={s.streakText}>{seg.streak} day streak</Text>
                </View>
              )}
            </View>
            <Text style={s.segSub}>Last 7 days</Text>
            <Sparkline scores={seg.weeklyScores} />
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={s.quickActionsRow}>
          <BigButton
            label="Report Missed Pickup"
            icon="alert-circle-outline"
            onPress={() => navigation.navigate('ComplaintTab')}
            variant="danger"
            style={s.quickBtn}
          />
        </View>
        <View style={s.quickActionsRow}>
          <BigButton
            label="View Fines & Alerts"
            icon="receipt-outline"
            onPress={() => navigation.navigate('NotificationsTab')}
            variant="dark"
            style={s.quickBtn}
          />
        </View>

        {/* Fine warning if pending */}
        {MOCK_CITIZEN.pendingFines > 0 && (
          <TouchableOpacity
            style={s.fineWarning}
            onPress={() => navigation.navigate('NotificationsTab')}
          >
            <Ionicons name="warning" size={16} color={Colors.danger} />
            <Text style={s.fineWarningText}>
              {MOCK_CITIZEN.pendingFines} unpaid fine · Wallet balance ₹{MOCK_CITIZEN.walletBalance.toLocaleString()}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.danger} />
          </TouchableOpacity>
        )}

        {/* ── Recent Activity ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => navigation.navigate('NotificationsTab')}>
            <Text style={s.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={s.activityCard}>
          {MOCK_CITIZEN.recentEvents.map(evt => (
            <EventRow key={evt.id} event={evt} />
          ))}
        </View>

        {/* ── Eco tip ── */}
        <View style={s.tipCard}>
          <View style={s.tipIcon}>
            <Ionicons name="leaf" size={20} color={Colors.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.tipTitle}>Eco Tip</Text>
            <Text style={s.tipBody}>{MOCK_CITIZEN.ecoTip}</Text>
          </View>
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
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Colors.navyDark,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge:   {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  societyName: { fontSize: 15, fontWeight: '800', color: Colors.white },
  wardName:    { fontSize: 11, color: Colors.textOnDarkMuted, fontWeight: '500' },
  bellBtn:     {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute', top: 9, right: 9,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.danger,
    borderWidth: 1.5, borderColor: Colors.navyDark,
  },

  // ETA card
  etaCard: {
    borderRadius: Theme.radiusLg, borderWidth: 1.5, overflow: 'hidden', padding: 16, gap: 10,
  },
  etaTopRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  etaStatusRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  etaStatusText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  etaUpdated:    { fontSize: 10, color: Colors.textMuted },
  etaHeroRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  etaNumber:     { fontSize: 56, fontWeight: '900', lineHeight: 58 },
  etaHeroRight:  { paddingBottom: 6, gap: 2 },
  etaUnit:       { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  etaDistance:   { fontSize: 13, color: Colors.textMuted },
  etaCompletedText: { fontSize: 28, fontWeight: '900' },
  etaScheduledTime: { fontSize: 40, fontWeight: '900' },
  stopsAwayRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stopsAwayText:{ fontSize: 12, fontWeight: '600' },
  driverRow:    {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderTopWidth: 1, paddingTop: 10, marginTop: 2,
  },
  driverAvatar: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.navyMid,
    justifyContent: 'center', alignItems: 'center',
  },
  driverText:   { flex: 1, fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  trackBtn:     {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  trackBtnText: { fontSize: 11, fontWeight: '700' },

  // Segregation card
  segCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: Colors.surface, borderRadius: Theme.radiusMd,
    padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  segLeft:  { flexShrink: 0 },
  segRight: { flex: 1, gap: 6 },
  segTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gradePill:{ borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  gradeText:{ fontSize: 12, fontWeight: '800' },
  streakPill:{ flexDirection: 'row', alignItems: 'center', gap: 3,
               backgroundColor: '#FFF7ED', borderRadius: 6,
               paddingHorizontal: 7, paddingVertical: 3 },
  streakText:{ fontSize: 11, fontWeight: '700', color: Colors.skipOrange },
  segSub:   { fontSize: 10, color: Colors.textMuted, fontWeight: '600', letterSpacing: 0.5 },

  // Quick actions
  quickActionsRow: {},
  quickBtn:        {},

  // Fine warning
  fineWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.dangerMuted, borderRadius: Theme.radiusSm,
    padding: 12, borderLeftWidth: 3, borderLeftColor: Colors.danger,
  },
  fineWarningText: { flex: 1, fontSize: 12, fontWeight: '600', color: Colors.dangerDark },

  // Recent activity
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  seeAllText:   { fontSize: 12, fontWeight: '700', color: Colors.green },
  activityCard: {
    backgroundColor: Colors.surface, borderRadius: Theme.radiusMd,
    paddingHorizontal: 14, paddingTop: 4,
    borderWidth: 1, borderColor: Colors.border,
  },

  // Eco tip
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#F0FAF2', borderRadius: Theme.radiusMd,
    padding: 14, borderWidth: 1, borderColor: Colors.green + '33',
  },
  tipIcon:  {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#D1FAE5',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  tipTitle: { fontSize: 12, fontWeight: '700', color: Colors.greenMuted, marginBottom: 3 },
  tipBody:  { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
});