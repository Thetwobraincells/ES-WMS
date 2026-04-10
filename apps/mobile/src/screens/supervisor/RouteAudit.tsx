// File: es-wms/apps/mobile/src/screens/supervisor/RouteAudit.tsx

/**
 * RouteAudit — Supervisor Stop Verification Screen
 *
 * The Mukadam reviews two categories of stops:
 *   1. COMPLETED stops requiring photo verification
 *      (photo shown, Approve or Reject buttons)
 *   2. SKIPPED stops requiring acknowledgment / reassignment
 *      (skip reason shown, Acknowledge or Reassign to Backlog)
 *
 * Layout:
 *   1. Header + filter tabs (All | Needs Review | Skipped)
 *   2. Scrollable audit cards — one per flagged stop
 *      Each card:
 *        • Stop identity (society, address, bin ID, time)
 *        • Driver + truck chip
 *        • For COMPLETED: photo placeholder + metadata
 *        • For SKIPPED: skip reason badge + FR-DRV-17 flag if applicable
 *        • Action buttons (Approve / Reject or Acknowledge / Reassign)
 *   3. Empty state when all items are resolved
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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Theme } from '../../theme/colors';
import StatusBadge  from '../../components/StatusBadge';
import BigButton    from '../../components/BigButton';
import { useAuthStore } from '../../stores/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type AuditItemType   = 'photo_review' | 'skipped';
type AuditItemStatus = 'pending' | 'approved' | 'rejected' | 'reassigned';
type FilterTab       = 'all' | 'review' | 'skipped';

interface AuditItem {
  id:           string;
  type:         AuditItemType;
  society:      string;
  address:      string;
  binId:        string;
  binType:      'wet' | 'dry' | 'mixed';
  driverName:   string;
  truckId:      string;
  timeRecorded: string;
  status:       AuditItemStatus;
  // For photo_review
  photoUri?:    string;
  gpsValid?:    boolean;
  gpsDistance?: number;     // metres from stop
  // For skipped
  skipReason?:  string;
  isFlagged?:   boolean;    // FR-DRV-17: suspicious claim
  vehicleLoad?: number;     // % at time of skip
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ITEMS: AuditItem[] = [
  {
    id:           'audit-01',
    type:         'photo_review',
    society:      'Crystal Heights',
    address:      'Worli Sea Face, Mumbai 400018',
    binId:        'CH-402-B',
    binType:      'wet',
    driverName:   'Ajay Sharma',
    truckId:      'TRUCK-4029',
    timeRecorded: '08:14 AM',
    status:       'pending',
    gpsValid:     true,
    gpsDistance:  12,
  },
  {
    id:           'audit-02',
    type:         'skipped',
    society:      'Sunset Towers',
    address:      'Dadar West, Mumbai 400028',
    binId:        'ST-118-A',
    binType:      'dry',
    driverName:   'Ajay Sharma',
    truckId:      'TRUCK-4029',
    timeRecorded: '08:42 AM',
    status:       'pending',
    skipReason:   'TRUCK_FULL',
    isFlagged:    true,
    vehicleLoad:  84,
  },
  {
    id:           'audit-03',
    type:         'skipped',
    society:      'Marine Residency',
    address:      'Andheri East, Mumbai 400069',
    binId:        'MR-307-C',
    binType:      'mixed',
    driverName:   'Ramesh Kale',
    truckId:      'TRUCK-4102',
    timeRecorded: '09:05 AM',
    status:       'pending',
    skipReason:   'INACCESSIBLE',
    isFlagged:    false,
    vehicleLoad:  88,
  },
  {
    id:           'audit-04',
    type:         'photo_review',
    society:      'Green Valley CHS',
    address:      'Borivali West, Mumbai 400092',
    binId:        'GV-201-B',
    binType:      'wet',
    driverName:   'Suresh Patil',
    truckId:      'TRUCK-3817',
    timeRecorded: '09:22 AM',
    status:       'pending',
    gpsValid:     false,
    gpsDistance:  73,
  },
  {
    id:           'audit-05',
    type:         'skipped',
    society:      'Sea Breeze CHS',
    address:      'Andheri West, Mumbai 400058',
    binId:        'SB-114-C',
    binType:      'wet',
    driverName:   'Ramesh Kale',
    truckId:      'TRUCK-4102',
    timeRecorded: '09:31 AM',
    status:       'pending',
    skipReason:   'WASTE_MIXED',
    isFlagged:    false,
    vehicleLoad:  90,
  },
];

// ─── Skip reason display map ──────────────────────────────────────────────────

const SKIP_REASON_DISPLAY: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  WASTE_MIXED:  { label: 'Waste Not Segregated',  icon: 'trash',         color: Colors.danger   },
  TRUCK_FULL:   { label: 'Truck Full',            icon: 'bus',           color: Colors.warning  },
  INACCESSIBLE: { label: 'Location Inaccessible', icon: 'ban',           color: Colors.danger   },
  OTHER:        { label: 'Other Reason',           icon: 'help-circle',   color: Colors.textMuted },
};

// ─── Photo Proof Placeholder ──────────────────────────────────────────────────

function PhotoProofBox({
  gpsValid, gpsDistance,
}: { gpsValid: boolean; gpsDistance?: number }) {
  return (
    <View style={ppS.wrapper}>
      {/* Photo placeholder */}
      <View style={ppS.photoBox}>
        <View style={ppS.photoBg}>
          <Ionicons name="camera-outline" size={32} color={Colors.textMuted} style={{ opacity: 0.5 }} />
          <Text style={ppS.photoLabel}>Proof Photo</Text>
          <Text style={ppS.photoSub}>Phase 3: loads from S3</Text>
        </View>
        {/* GPS overlay badge */}
        <View style={[ppS.gpsBadge, { backgroundColor: gpsValid ? '#D1FAE5' : Colors.dangerMuted }]}>
          <Ionicons
            name={gpsValid ? 'checkmark-circle' : 'location-outline'}
            size={12}
            color={gpsValid ? Colors.greenMuted : Colors.danger}
          />
          <Text style={[ppS.gpsText, { color: gpsValid ? Colors.greenMuted : Colors.danger }]}>
            {gpsValid
              ? `GPS Valid · ${gpsDistance}m`
              : `Out of range · ${gpsDistance}m`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const ppS = StyleSheet.create({
  wrapper:    { marginVertical: 10 },
  photoBox:   { position: 'relative', borderRadius: Theme.radiusMd, overflow: 'hidden' },
  photoBg:    {
    height:          140,
    backgroundColor: Colors.surfaceGrey,
    justifyContent:  'center',
    alignItems:      'center',
    gap:             6,
  },
  photoLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  photoSub:   { fontSize: 10, color: Colors.textMuted },
  gpsBadge: {
    position:        'absolute',
    bottom:          8,
    left:            8,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             4,
    borderRadius:    6,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  gpsText: { fontSize: 10, fontWeight: '700' },
});

// ─── Audit Card ───────────────────────────────────────────────────────────────

function AuditCard({
  item,
  onApprove,
  onReject,
  onAcknowledge,
  onReassign,
}: {
  item:          AuditItem;
  onApprove:     (id: string) => void;
  onReject:      (id: string) => void;
  onAcknowledge: (id: string) => void;
  onReassign:    (id: string) => void;
}) {
  const [resolved, setResolved] = useState(false);
  // Both fadeAnim and scaleAnim drive transform/opacity props — fully native safe.
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const resolveCard = (action: () => void) => {
    action();
    // ✅ Both use useNativeDriver: true — opacity and scaleY are transform props.
    // No layout properties (width/height/padding) are animated here.
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue:         0,
        duration:        300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue:         0,
        duration:        350,
        delay:           150,
        useNativeDriver: true,
      }),
    ]).start(() => setResolved(true));
  };

  if (resolved) return null;

  const skipDef = item.skipReason
    ? (SKIP_REASON_DISPLAY[item.skipReason] ?? SKIP_REASON_DISPLAY.OTHER)
    : null;

  return (
    <Animated.View style={{
      opacity:        fadeAnim,
      transform:      [{ scaleY: scaleAnim }],
      marginBottom:   12,
    }}>
      <View style={[
        acS.card,
        item.isFlagged && acS.cardFlagged,
        item.type === 'photo_review' && !item.gpsValid && acS.cardWarning,
      ]}>

        {/* ── Flag banner ── */}
        {item.isFlagged && (
          <View style={acS.flagBanner}>
            <Ionicons name="warning" size={14} color={Colors.white} />
            <Text style={acS.flagText}>
              SUSPICIOUS CLAIM — TRUCK_FULL at {item.vehicleLoad}% load (below 85% threshold)
            </Text>
          </View>
        )}
        {item.type === 'photo_review' && !item.gpsValid && (
          <View style={acS.warnBanner}>
            <Ionicons name="location-outline" size={14} color={Colors.warningDark} />
            <Text style={acS.warnBannerText}>
              Photo taken {item.gpsDistance}m from stop — outside 50m geofence
            </Text>
          </View>
        )}

        {/* ── Stop identity ── */}
        <View style={acS.identityRow}>
          <View style={acS.binBadge}>
            <Ionicons name="business" size={18} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={acS.societyName}>{item.society}</Text>
            <Text style={acS.address}>{item.address}</Text>
          </View>
          <StatusBadge
            variant={item.binType}
            size="sm"
          />
        </View>

        {/* ── Meta row: BIN ID + time ── */}
        <View style={acS.metaRow}>
          <View style={acS.metaChip}>
            <Ionicons name="qr-code-outline" size={12} color={Colors.textMuted} />
            <Text style={acS.metaText}>{item.binId}</Text>
          </View>
          <View style={acS.metaChip}>
            <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
            <Text style={acS.metaText}>{item.timeRecorded}</Text>
          </View>
        </View>

        {/* ── Driver chip ── */}
        <View style={acS.driverChip}>
          <View style={acS.driverAvatar}>
            <Ionicons name="person" size={13} color={Colors.white} />
          </View>
          <Text style={acS.driverName}>{item.driverName}</Text>
          <View style={acS.truckChip}>
            <Ionicons name="bus-outline" size={11} color={Colors.textSecondary} />
            <Text style={acS.truckText}>{item.truckId}</Text>
          </View>
        </View>

        {/* ── Content area ── */}
        {item.type === 'photo_review' ? (
          <>
            <PhotoProofBox
              gpsValid={item.gpsValid ?? true}
              gpsDistance={item.gpsDistance}
            />
            {/* Action buttons */}
            <View style={acS.actionsRow}>
              <BigButton
                label="Approve"
                icon="checkmark-circle"
                onPress={() => resolveCard(() => onApprove(item.id))}
                variant="primary"
                compact
                style={acS.actionBtn}
              />
              <BigButton
                label="Reject"
                icon="close-circle"
                onPress={() => resolveCard(() => onReject(item.id))}
                variant="danger"
                compact
                style={acS.actionBtn}
              />
            </View>
          </>
        ) : (
          <>
            {/* Skip reason block */}
            <View style={acS.skipBlock}>
              <Text style={acS.skipBlockLabel}>SKIP REASON</Text>
              <View style={acS.skipReasonRow}>
                <View style={[acS.skipIcon, { backgroundColor: (skipDef?.color ?? Colors.textMuted) + '22' }]}>
                  <Ionicons name={skipDef?.icon ?? 'help-circle'} size={20}
                    color={skipDef?.color ?? Colors.textMuted} />
                </View>
                <View>
                  <Text style={acS.skipReasonLabel}>{skipDef?.label ?? item.skipReason}</Text>
                  {item.vehicleLoad !== undefined && (
                    <Text style={acS.vehicleLoadText}>
                      Vehicle load at time of skip:{' '}
                      <Text style={{ color: item.vehicleLoad >= 90 ? Colors.danger : Colors.warning, fontWeight: '700' }}>
                        {item.vehicleLoad}%
                      </Text>
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Action buttons */}
            <View style={acS.actionsRow}>
              <BigButton
                label="Acknowledge"
                icon="checkmark-done"
                onPress={() => resolveCard(() => onAcknowledge(item.id))}
                variant="dark"
                compact
                style={acS.actionBtn}
              />
              <BigButton
                label="Reassign"
                icon="refresh-circle"
                onPress={() => resolveCard(() => onReassign(item.id))}
                variant="warning"
                compact
                style={acS.actionBtn}
              />
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );
}

const acS = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Theme.radiusMd,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: Colors.navyDark, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  cardFlagged: { borderColor: Colors.danger, borderWidth: 1.5 },
  cardWarning: { borderColor: Colors.warning, borderWidth: 1.5 },

  flagBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.danger, paddingHorizontal: 14, paddingVertical: 8,
  },
  flagText: { fontSize: 11, fontWeight: '700', color: Colors.white, flex: 1 },

  warnBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.warningMuted, paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  warnBannerText: { fontSize: 11, fontWeight: '600', color: Colors.warningDark, flex: 1 },

  identityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, paddingBottom: 8,
  },
  binBadge: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.navyDark,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  societyName: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  address:     { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },

  metaRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 8,
  },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceGrey, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  metaText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },

  driverChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingBottom: 10,
  },
  driverAvatar: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.navyMid,
    justifyContent: 'center', alignItems: 'center',
  },
  driverName: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  truckChip:  {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceGrey, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  truckText: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary },

  skipBlock: {
    marginHorizontal: 14, marginBottom: 10,
    backgroundColor: Colors.surfaceGrey, borderRadius: Theme.radiusSm, padding: 12, gap: 8,
  },
  skipBlockLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.2 },
  skipReasonRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  skipIcon:       {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  skipReasonLabel:   { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  vehicleLoadText:   { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  actionsRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 14, paddingBottom: 14,
  },
  actionBtn: { flex: 1 },
});

// ─── Filter Tabs ──────────────────────────────────────────────────────────────

function FilterTabs({
  active, counts, onChange,
}: {
  active:   FilterTab;
  counts:   Record<FilterTab, number>;
  onChange: (t: FilterTab) => void;
}) {
  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all',     label: 'All'          },
    { key: 'review',  label: 'Needs Review' },
    { key: 'skipped', label: 'Skipped'      },
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
                 paddingVertical: 12, gap: 6, borderBottomWidth: 2, borderBottomColor: Colors.transparent },
  tabActive:   { borderBottomColor: Colors.green },
  label:       { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  labelActive: { color: Colors.navyDark, fontWeight: '800' },
  badge:       { backgroundColor: Colors.surfaceGrey, borderRadius: 10,
                 paddingHorizontal: 6, paddingVertical: 1 },
  badgeActive: { backgroundColor: Colors.green },
  badgeText:   { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
  badgeTextActive: { color: Colors.white },
});

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={esS.wrapper}>
      <View style={esS.iconWrap}>
        <Ionicons name="checkmark-done-circle" size={52} color={Colors.green} />
      </View>
      <Text style={esS.title}>All Caught Up!</Text>
      <Text style={esS.sub}>No pending items to review for this filter.</Text>
    </View>
  );
}

const esS = StyleSheet.create({
  wrapper: { alignItems: 'center', paddingTop: 60, gap: 12 },
  iconWrap:{ width: 80, height: 80, borderRadius: 20, backgroundColor: '#D1FAE5',
             justifyContent: 'center', alignItems: 'center' },
  title:   { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  sub:     { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RouteAudit() {
  const insets = useSafeAreaInsets();
  const user   = useAuthStore(s => s.user);

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [items, setItems] = useState<AuditItem[]>(MOCK_ITEMS);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const pendingItems = items.filter(i => !resolvedIds.has(i.id));

  const filteredItems = pendingItems.filter(item => {
    if (activeFilter === 'review')  return item.type === 'photo_review';
    if (activeFilter === 'skipped') return item.type === 'skipped';
    return true;
  });

  const counts: Record<FilterTab, number> = {
    all:     pendingItems.length,
    review:  pendingItems.filter(i => i.type === 'photo_review').length,
    skipped: pendingItems.filter(i => i.type === 'skipped').length,
  };

  const resolve = (id: string, action: string) => {
    setResolvedIds(prev => new Set([...prev, id]));
  };

  const handleApprove     = (id: string) => { resolve(id, 'approved');    showToast('Stop approved ✓'); };
  const handleReject      = (id: string) => { resolve(id, 'rejected');    showToast('Photo rejected — driver notified'); };
  const handleAcknowledge = (id: string) => { resolve(id, 'acknowledged'); showToast('Skip acknowledged'); };
  const handleReassign    = (id: string) => { resolve(id, 'reassigned');  showToast('Stop added to backlog queue'); };

  const showToast = (msg: string) => Alert.alert('', msg, [{ text: 'OK' }]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.logoBox}>
            <Ionicons name="reload-circle" size={18} color={Colors.green} />
          </View>
          <View>
            <Text style={s.headerTitle}>Route Audit</Text>
            <Text style={s.headerSub}>{user?.name ?? 'Supervisor'} · Zone Review</Text>
          </View>
        </View>
        {counts.all > 0 && (
          <View style={s.pendingBadge}>
            <Text style={s.pendingText}>{counts.all} PENDING</Text>
          </View>
        )}
      </View>

      {/* ── Filter tabs ── */}
      <FilterTabs active={activeFilter} counts={counts} onChange={setActiveFilter} />

      {/* ── Content ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {filteredItems.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Summary line */}
            <View style={s.summaryLine}>
              <Ionicons name="filter-outline" size={13} color={Colors.textMuted} />
              <Text style={s.summaryText}>
                {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} requiring action
                {filteredItems.filter(i => i.isFlagged).length > 0 &&
                  ` · ${filteredItems.filter(i => i.isFlagged).length} flagged`}
              </Text>
            </View>

            {/* Flagged items first */}
            {filteredItems
              .sort((a, b) => (b.isFlagged ? 1 : 0) - (a.isFlagged ? 1 : 0))
              .map(item => (
                <AuditCard
                  key={item.id}
                  item={item}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onAcknowledge={handleAcknowledge}
                  onReassign={handleReassign}
                />
              ))}
          </>
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
  headerTitle: { fontSize: 15, fontWeight: '800', color: Colors.white, letterSpacing: 0.5 },
  headerSub:   { fontSize: 11, color: Colors.textOnDarkMuted },
  pendingBadge:{
    backgroundColor: Colors.danger, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  pendingText: { fontSize: 11, fontWeight: '800', color: Colors.white, letterSpacing: 0.5 },

  summaryLine: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, marginBottom: 4,
  },
  summaryText: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
});