// File: es-wms/apps/mobile/src/screens/citizen/NotificationHistory.tsx

/**
 * NotificationHistory — Citizen Alert Feed (PRD FR-CIT-06)
 *
 * PRD FR-CIT-06: Notification history tab — all alerts in last 30 days.
 * PRD FR-CIT-05: Fine history — list of fines, wallet balance, photo evidence.
 *
 * Layout:
 *   1. Header with unread count badge
 *   2. Filter tabs: All | Pickups | Fines | Warnings
 *   3. Wallet balance summary card (visible on Fines tab)
 *   4. Chronological event feed — date-grouped
 *      Each item: StatusBadge color-coding + title + subtitle + timestamp
 *      Fine items: expandable to show amount + evidence link
 *   5. Empty state per filter
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { Colors, Theme } from '../../theme/colors';
import StatusBadge from '../../components/StatusBadge';
import { useAuthStore } from '../../stores/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType  = 'completed' | 'skipped' | 'warning' | 'fine' | 'info' | 'complaint';
type FilterTab  = 'all' | 'pickups' | 'fines' | 'warnings';

interface NotificationEvent {
  id:          string;
  type:        EventType;
  title:       string;
  subtitle:    string;
  timestamp:   string;        // display string
  dateGroup:   string;        // "Today", "Yesterday", "Apr 5", etc.
  read:        boolean;
  // For fines
  fineAmount?:   number;
  fineStatus?:   'pending' | 'paid' | 'waived';
  evidenceRef?:  string;
  // For skips
  skipReason?:   string;
  backlogDate?:  string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_WALLET = {
  balance:     8500,
  totalFined:  1500,
  totalPaid:   1000,
};

const MOCK_EVENTS: NotificationEvent[] = [
  {
    id: 'n-01', type: 'completed', read: true,
    title: 'Pickup Completed',
    subtitle: 'Wet + Dry waste collected by Ajay Sharma · TRUCK-4029',
    timestamp: '09:44 AM', dateGroup: 'Today',
  },
  {
    id: 'n-02', type: 'info', read: false,
    title: 'Truck Nearby',
    subtitle: 'TRUCK-4029 is 3 stops away — expected in 18 minutes',
    timestamp: '08:55 AM', dateGroup: 'Today',
  },
  {
    id: 'n-03', type: 'completed', read: true,
    title: 'Pickup Completed',
    subtitle: 'Wet waste collected · On time',
    timestamp: '09:51 AM', dateGroup: 'Yesterday',
  },
  {
    id: 'n-04', type: 'skipped', read: true,
    title: 'Truck Skipped Your Society',
    subtitle: 'Reason: Truck Full · Backlog scheduled for Apr 6',
    timestamp: '10:02 AM', dateGroup: 'Yesterday',
    skipReason: 'TRUCK_FULL', backlogDate: 'Apr 6',
  },
  {
    id: 'n-05', type: 'fine', read: true,
    title: 'Fine Issued — Mixed Waste',
    subtitle: 'Wet and dry waste found mixed in the collection bin',
    timestamp: '11:30 AM', dateGroup: 'Apr 5',
    fineAmount: 500, fineStatus: 'pending', evidenceRef: 'PHOTO-4029-221',
  },
  {
    id: 'n-06', type: 'warning', read: true,
    title: 'Segregation Warning',
    subtitle: 'This is your 2nd mixed waste notice this month',
    timestamp: '11:31 AM', dateGroup: 'Apr 5',
  },
  {
    id: 'n-07', type: 'complaint', read: true,
    title: 'Complaint Resolved',
    subtitle: 'Your missed pickup report (CMP-482031) was resolved',
    timestamp: '03:15 PM', dateGroup: 'Apr 3',
  },
  {
    id: 'n-08', type: 'fine', read: true,
    title: 'Fine Paid — Mixed Waste',
    subtitle: 'Payment of ₹500 deducted from society wallet',
    timestamp: '09:00 AM', dateGroup: 'Apr 2',
    fineAmount: 500, fineStatus: 'paid',
  },
  {
    id: 'n-09', type: 'completed', read: true,
    title: 'Pickup Completed',
    subtitle: 'Dry waste collected · 4 min early',
    timestamp: '09:28 AM', dateGroup: 'Apr 2',
  },
  {
    id: 'n-10', type: 'skipped', read: true,
    title: 'Truck Skipped Your Society',
    subtitle: 'Reason: Waste Mixed — Segregate properly to avoid fines',
    timestamp: '10:15 AM', dateGroup: 'Mar 30',
    skipReason: 'WASTE_MIXED',
  },
];

// ─── Event type config ────────────────────────────────────────────────────────

interface EventConfig {
  icon:    keyof typeof Ionicons.glyphMap;
  color:   string;
  bgColor: string;
  badge:   'completed' | 'skipped' | 'custom';
  badgeLabel?: string;
  badgeBg?:    string;
  badgeText?:  string;
}

const EVENT_CONFIG: Record<EventType, EventConfig> = {
  completed: {
    icon: 'checkmark-circle', color: Colors.greenMuted, bgColor: '#D1FAE5',
    badge: 'completed',
  },
  skipped: {
    icon: 'close-circle', color: Colors.danger, bgColor: Colors.dangerMuted,
    badge: 'skipped',
  },
  warning: {
    icon: 'warning', color: Colors.warning, bgColor: Colors.warningMuted,
    badge: 'custom', badgeLabel: 'WARNING', badgeBg: Colors.warningMuted, badgeText: Colors.warningDark,
  },
  fine: {
    icon: 'receipt', color: Colors.danger, bgColor: Colors.dangerMuted,
    badge: 'custom', badgeLabel: 'FINE', badgeBg: Colors.dangerMuted, badgeText: Colors.dangerDark,
  },
  info: {
    icon: 'information-circle', color: Colors.statusProgress, bgColor: '#EFF6FF',
    badge: 'custom', badgeLabel: 'INFO', badgeBg: '#DBEAFE', badgeText: '#1E40AF',
  },
  complaint: {
    icon: 'checkmark-done-circle', color: Colors.greenMuted, bgColor: '#D1FAE5',
    badge: 'custom', badgeLabel: 'RESOLVED', badgeBg: '#D1FAE5', badgeText: Colors.greenMuted,
  },
};

// ─── Fine detail expandable ───────────────────────────────────────────────────

function FineDetail({ event }: { event: NotificationEvent }) {
  const [expanded, setExpanded] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.spring(heightAnim, {
      toValue: next ? 1 : 0, useNativeDriver: false, bounciness: 0, speed: 20,
    }).start();
  };

  const statusColor = event.fineStatus === 'paid'   ? Colors.green  :
                      event.fineStatus === 'waived'  ? Colors.textMuted :
                      Colors.danger;
  const statusLabel = event.fineStatus === 'paid'   ? 'PAID'   :
                      event.fineStatus === 'waived'  ? 'WAIVED' :
                      'PENDING';

  return (
    <>
      <TouchableOpacity style={fdS.trigger} onPress={toggle}>
        <Ionicons name="receipt-outline" size={13} color={Colors.textMuted} />
        <Text style={fdS.triggerText}>
          ₹{event.fineAmount?.toLocaleString()} fine ·{' '}
          <Text style={{ color: statusColor, fontWeight: '700' }}>{statusLabel}</Text>
        </Text>
        <Animated.View style={{
          transform: [{ rotate: heightAnim.interpolate({
            inputRange: [0,1], outputRange: ['0deg','180deg']
          })}]
        }}>
          <Ionicons name="chevron-down" size={13} color={Colors.textMuted} />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View style={[fdS.detail, {
        maxHeight: heightAnim.interpolate({ inputRange: [0,1], outputRange: [0, 80] }),
        opacity:   heightAnim,
      }]}>
        <View style={fdS.detailInner}>
          <View style={fdS.detailRow}>
            <Text style={fdS.detailKey}>Amount</Text>
            <Text style={fdS.detailVal}>₹{event.fineAmount?.toLocaleString()}</Text>
          </View>
          <View style={fdS.detailRow}>
            <Text style={fdS.detailKey}>Status</Text>
            <Text style={[fdS.detailVal, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          {event.evidenceRef && (
            <View style={fdS.detailRow}>
              <Text style={fdS.detailKey}>Evidence</Text>
              <Text style={[fdS.detailVal, { color: Colors.statusProgress }]}>
                {event.evidenceRef}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    </>
  );
}

const fdS = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 4, paddingTop: 6,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  triggerText: { flex: 1, fontSize: 11, color: Colors.textSecondary },
  detail:      { overflow: 'hidden' },
  detailInner: {
    backgroundColor: Colors.surfaceGrey, borderRadius: 8,
    padding: 10, marginTop: 6, gap: 5,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailKey: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  detailVal: { fontSize: 11, color: Colors.textPrimary, fontWeight: '700' },
});

// ─── Notification Card ────────────────────────────────────────────────────────

function NotificationCard({ event }: { event: NotificationEvent }) {
  const cfg = EVENT_CONFIG[event.type];

  return (
    <View style={[ncS.card, !event.read && ncS.cardUnread]}>
      {/* Unread dot */}
      {!event.read && <View style={ncS.unreadDot} />}

      <View style={[ncS.iconWrap, { backgroundColor: cfg.bgColor }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>

      <View style={ncS.body}>
        {/* Badge + time row */}
        <View style={ncS.topRow}>
          {cfg.badge === 'custom' ? (
            <StatusBadge
              variant="custom"
              label={cfg.badgeLabel}
              bgColor={cfg.badgeBg}
              textColor={cfg.badgeText}
              size="sm"
            />
          ) : (
            <StatusBadge variant={cfg.badge} size="sm" />
          )}
          <Text style={ncS.time}>{event.timestamp}</Text>
        </View>

        <Text style={[ncS.title, !event.read && ncS.titleUnread]}>
          {event.title}
        </Text>
        <Text style={ncS.subtitle} numberOfLines={2}>
          {event.subtitle}
        </Text>

        {/* Fine expandable detail */}
        {event.type === 'fine' && <FineDetail event={event} />}

        {/* Skip backlog info */}
        {event.type === 'skipped' && event.backlogDate && (
          <View style={ncS.skipInfo}>
            <Ionicons name="refresh-circle-outline" size={12} color={Colors.statusProgress} />
            <Text style={ncS.skipInfoText}>Rescheduled for {event.backlogDate}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const ncS = StyleSheet.create({
  card: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: Colors.surface, borderRadius: Theme.radiusMd,
    padding: 14, borderWidth: 1, borderColor: Colors.border,
    marginBottom: 8, position: 'relative',
    shadowColor: Colors.navyDark, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: Colors.green, backgroundColor: '#FAFFFE' },
  unreadDot: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  body:       { flex: 1, gap: 4 },
  topRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time:       { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
  title:      { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, lineHeight: 18 },
  titleUnread:{ fontWeight: '800' },
  subtitle:   { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  skipInfo:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  skipInfoText:{ fontSize: 11, color: Colors.statusProgress, fontWeight: '600' },
});

// ─── Filter Tabs ──────────────────────────────────────────────────────────────

function FilterTabs({
  active, counts, onChange,
}: { active: FilterTab; counts: Record<FilterTab, number>; onChange: (t: FilterTab) => void }) {
  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all',      label: 'All'      },
    { key: 'pickups',  label: 'Pickups'  },
    { key: 'fines',    label: 'Fines'    },
    { key: 'warnings', label: 'Warnings' },
  ];
  return (
    <View style={ftS.row}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[ftS.tab, active === tab.key && ftS.tabActive]}
          onPress={() => onChange(tab.key)}
        >
          <Text style={[ftS.label, active === tab.key && ftS.labelActive]}>
            {tab.label}
          </Text>
          {counts[tab.key] > 0 && (
            <View style={[ftS.badge, active === tab.key && ftS.badgeActive]}>
              <Text style={[ftS.badgeText, active === tab.key && ftS.badgeTextActive]}>
                {counts[tab.key]}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const ftS = StyleSheet.create({
  row:         { flexDirection: 'row', backgroundColor: Colors.surface,
                 borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                 paddingVertical: 11, gap: 5,
                 borderBottomWidth: 2, borderBottomColor: Colors.transparent },
  tabActive:   { borderBottomColor: Colors.green },
  label:       { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  labelActive: { color: Colors.navyDark, fontWeight: '800' },
  badge:       { backgroundColor: Colors.surfaceGrey, borderRadius: 10,
                 paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  badgeActive: { backgroundColor: Colors.green },
  badgeText:   { fontSize: 9, fontWeight: '700', color: Colors.textMuted },
  badgeTextActive: { color: Colors.white },
});

// ─── Date group header ────────────────────────────────────────────────────────

function DateGroupHeader({ label }: { label: string }) {
  return (
    <View style={dgS.row}>
      <View style={dgS.line} />
      <Text style={dgS.label}>{label}</Text>
      <View style={dgS.line} />
    </View>
  );
}

const dgS = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 },
  line:  { flex: 1, height: 1, backgroundColor: Colors.border },
  label: { fontSize: 10, fontWeight: '700', color: Colors.textMuted,
           letterSpacing: 1, paddingHorizontal: 4 },
});

// ─── Wallet card (Fines tab) ──────────────────────────────────────────────────

function WalletCard() {
  return (
    <View style={wS.card}>
      <View style={wS.row}>
        <View>
          <Text style={wS.label}>SOCIETY WALLET</Text>
          <Text style={wS.balance}>₹{MOCK_WALLET.balance.toLocaleString()}</Text>
        </View>
        <View style={wS.iconWrap}>
          <Ionicons name="wallet-outline" size={22} color={Colors.white} />
        </View>
      </View>
      <View style={wS.statsRow}>
        <View style={wS.stat}>
          <Text style={wS.statVal}>₹{MOCK_WALLET.totalFined.toLocaleString()}</Text>
          <Text style={wS.statLabel}>Total Fined</Text>
        </View>
        <View style={wS.statDivider} />
        <View style={wS.stat}>
          <Text style={[wS.statVal, { color: Colors.green }]}>
            ₹{MOCK_WALLET.totalPaid.toLocaleString()}
          </Text>
          <Text style={wS.statLabel}>Total Paid</Text>
        </View>
        <View style={wS.statDivider} />
        <View style={wS.stat}>
          <Text style={[wS.statVal, { color: Colors.danger }]}>
            ₹{(MOCK_WALLET.totalFined - MOCK_WALLET.totalPaid).toLocaleString()}
          </Text>
          <Text style={wS.statLabel}>Outstanding</Text>
        </View>
      </View>
    </View>
  );
}

const wS = StyleSheet.create({
  card: {
    backgroundColor: Colors.navyDark, borderRadius: Theme.radiusMd,
    padding: 16, gap: 12,
  },
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label:    { fontSize: 10, fontWeight: '700', color: Colors.textOnDarkMuted, letterSpacing: 1.5 },
  balance:  { fontSize: 28, fontWeight: '900', color: Colors.white },
  iconWrap: { width: 44, height: 44, borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 12 },
  stat:        { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)' },
  statVal:     { fontSize: 14, fontWeight: '800', color: Colors.white },
  statLabel:   { fontSize: 9, fontWeight: '600', color: Colors.textOnDarkMuted, letterSpacing: 0.5 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NotificationHistory() {
  const insets = useSafeAreaInsets();
  const user   = useAuthStore(s => s.user);

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const filterFn = (e: NotificationEvent) => {
    if (activeFilter === 'pickups')  return e.type === 'completed' || e.type === 'skipped' || e.type === 'info';
    if (activeFilter === 'fines')    return e.type === 'fine';
    if (activeFilter === 'warnings') return e.type === 'warning' || e.type === 'fine';
    return true;
  };

  const filtered = MOCK_EVENTS.filter(filterFn);
  const unreadCount = MOCK_EVENTS.filter(e => !e.read).length;

  const counts: Record<FilterTab, number> = {
    all:      MOCK_EVENTS.length,
    pickups:  MOCK_EVENTS.filter(e => ['completed','skipped','info'].includes(e.type)).length,
    fines:    MOCK_EVENTS.filter(e => e.type === 'fine').length,
    warnings: MOCK_EVENTS.filter(e => ['warning','fine'].includes(e.type)).length,
  };

  // Group events by dateGroup
  const grouped: { dateGroup: string; events: NotificationEvent[] }[] = [];
  filtered.forEach(evt => {
    const last = grouped[grouped.length - 1];
    if (last && last.dateGroup === evt.dateGroup) {
      last.events.push(evt);
    } else {
      grouped.push({ dateGroup: evt.dateGroup, events: [evt] });
    }
  });

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.logoBox}>
            <Ionicons name="reload-circle" size={18} color={Colors.green} />
          </View>
          <View>
            <Text style={s.headerTitle}>Notifications</Text>
            <Text style={s.headerSub}>Last 30 days · Gokuldham Society</Text>
          </View>
        </View>
        {unreadCount > 0 && (
          <View style={s.unreadBadge}>
            <Text style={s.unreadBadgeText}>{unreadCount} new</Text>
          </View>
        )}
      </View>

      {/* ── Filter tabs ── */}
      <FilterTabs active={activeFilter} counts={counts} onChange={setActiveFilter} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Wallet card for fines tab */}
        {activeFilter === 'fines' && <WalletCard />}

        {grouped.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={40} color={Colors.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No notifications here</Text>
            <Text style={s.emptySub}>Nothing to show for this filter.</Text>
          </View>
        ) : (
          grouped.map(group => (
            <View key={group.dateGroup}>
              <DateGroupHeader label={group.dateGroup} />
              {group.events.map(evt => (
                <NotificationCard key={evt.id} event={evt} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content:{ padding: 14, gap: 0 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.navyDark,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox:     {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: Colors.white },
  headerSub:   { fontSize: 11, color: Colors.textOnDarkMuted },
  unreadBadge: {
    backgroundColor: Colors.green, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  unreadBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.white },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: {
    width: 70, height: 70, borderRadius: 18, backgroundColor: Colors.surfaceGrey,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  emptySub:   { fontSize: 13, color: Colors.textSecondary },
});