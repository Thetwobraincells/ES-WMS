// File: es-wms/apps/mobile/src/screens/citizen/HomeStatus.tsx

/**
 * Citizen Home — Today's Collection Status
 *
 * Fetches the society's collection status from the backend (GET /societies/:id/status)
 * and displays:
 *   1. Society name + wallet balance
 *   2. Today's collection status card (PENDING / COMPLETED / SKIPPED)
 *   3. Vehicle info + driver name
 *   4. Alert card if skipped with reason
 *
 * PRD FR-CIT-01: Society collection status
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { Colors, Theme } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import * as societyService from '../../services/society.service';
import type { SocietyStatusResponse, StopStatus } from '../../types/api';

// ─── Status color helper ──────────────────────────────────────────────────────

function statusColor(status?: StopStatus): string {
  switch (status) {
    case 'COMPLETED': return Colors.green;
    case 'SKIPPED':   return Colors.danger;
    case 'IN_PROGRESS': return Colors.statusProgress;
    default: return Colors.warning;
  }
}

function statusIcon(status?: StopStatus): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case 'COMPLETED': return 'checkmark-circle';
    case 'SKIPPED':   return 'close-circle';
    case 'IN_PROGRESS': return 'time';
    default: return 'hourglass';
  }
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeStatus() {
  const insets = useSafeAreaInsets();
  const user   = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const societyId = user?.society_id;

  const [status, setStatus] = useState<SocietyStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!societyId) {
      setError('No society linked to your account.');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await societyService.getSocietyStatus(societyId);
      setStatus(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Failed to fetch status';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [societyId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  }, [fetchStatus]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.root, s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.green} />
        <Text style={s.loadingText}>Loading status…</Text>
      </View>
    );
  }

  const today = status?.today;
  const society = status?.society;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.logoBox}>
            <Ionicons name="leaf" size={20} color={Colors.green} />
          </View>
          <View>
            <Text style={s.appName}>ES-WMS</Text>
            <Text style={s.headerSub}>{user?.name ?? 'Citizen'}</Text>
          </View>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={logout}
          hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
          <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />
        }>

        {/* ── Society Card ── */}
        {society && (
          <View style={s.societyCard}>
            <View style={s.societyIcon}>
              <Ionicons name="business" size={28} color={Colors.green} />
            </View>
            <Text style={s.societyName}>{society.name}</Text>
            <Text style={s.societyAddr}>{society.address}</Text>
            <View style={s.walletRow}>
              <Ionicons name="wallet-outline" size={16} color={Colors.textSecondary} />
              <Text style={s.walletText}>
                Wallet: ₹{society.wallet_balance?.toLocaleString() ?? '0'}
              </Text>
            </View>
          </View>
        )}

        {/* ── Error ── */}
        {error && (
          <View style={s.errorCard}>
            <Ionicons name="alert-circle" size={20} color={Colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Today's Status ── */}
        <Text style={s.sectionLabel}>TODAY'S COLLECTION</Text>

        {today ? (
          <View style={[s.statusCard, { borderLeftColor: statusColor(today.status) }]}>
            <View style={s.statusHeader}>
              <Ionicons name={statusIcon(today.status)} size={28} color={statusColor(today.status)} />
              <View style={{ flex: 1 }}>
                <Text style={[s.statusTitle, { color: statusColor(today.status) }]}>
                  {today.status === 'COMPLETED' ? 'Collection Complete' :
                   today.status === 'SKIPPED' ? 'Collection Skipped' :
                   today.status === 'IN_PROGRESS' ? 'Collection In Progress' :
                   'Pickup Pending'}
                </Text>
                {today.completed_at && (
                  <Text style={s.statusTime}>
                    Completed at {new Date(today.completed_at).toLocaleTimeString()}
                  </Text>
                )}
                {today.skipped_at && (
                  <Text style={s.statusTime}>
                    Skipped at {new Date(today.skipped_at).toLocaleTimeString()}
                  </Text>
                )}
              </View>
            </View>

            {/* Skip reason alert */}
            {today.status === 'SKIPPED' && today.skip_reason && (
              <View style={s.skipAlert}>
                <Ionicons name="warning" size={16} color={Colors.skipOrange} />
                <Text style={s.skipAlertText}>
                  Reason: {today.skip_reason.replace(/_/g, ' ')}
                </Text>
              </View>
            )}

            {/* Driver + vehicle info */}
            <View style={s.infoRow}>
              <View style={s.infoItem}>
                <Ionicons name="person-outline" size={16} color={Colors.textMuted} />
                <Text style={s.infoLabel}>Driver</Text>
                <Text style={s.infoValue}>{today.driver_name}</Text>
              </View>
              <View style={s.infoDivider} />
              <View style={s.infoItem}>
                <Ionicons name="bus-outline" size={16} color={Colors.textMuted} />
                <Text style={s.infoLabel}>Vehicle</Text>
                <Text style={s.infoValue}>{today.vehicle.registration_no}</Text>
              </View>
            </View>

            {/* Load indicator */}
            <View style={s.loadRow}>
              <Text style={s.loadLabel}>Vehicle Load</Text>
              <View style={s.loadBarTrack}>
                <View style={[s.loadBarFill, {
                  width: `${today.vehicle.load_percent}%`,
                  backgroundColor: today.vehicle.load_percent >= 90 ? Colors.danger :
                                   today.vehicle.load_percent >= 75 ? Colors.warning : Colors.green,
                }]} />
              </View>
              <Text style={s.loadPct}>{today.vehicle.load_percent}%</Text>
            </View>
          </View>
        ) : (
          <View style={s.noDataCard}>
            <Ionicons name="calendar-outline" size={36} color={Colors.textMuted} />
            <Text style={s.noDataTitle}>No Collection Scheduled</Text>
            <Text style={s.noDataText}>
              There is no pickup scheduled for your society today.
            </Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  scroll:  { flex: 1 },
  content: { padding: 16, gap: 14 },
  centered:{ justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: Colors.textSecondary, marginTop: 12 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox:    { width: 36, height: 36, borderRadius: 8, backgroundColor: '#D1FAE5',
                justifyContent: 'center', alignItems: 'center' },
  appName:    { fontSize: 16, fontWeight: '800', color: Colors.navyDark, letterSpacing: 1.5 },
  headerSub:  { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  logoutBtn:  { width: 44, height: 44, borderRadius: 10, backgroundColor: Colors.dangerMuted,
                justifyContent: 'center', alignItems: 'center' },

  // Society card
  societyCard: {
    backgroundColor: Colors.surface, borderRadius: Theme.radiusMd,
    padding: 20, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 6,
  },
  societyIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: '#D1FAE5',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  societyName: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  societyAddr: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  walletRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  walletText:  { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  // Error
  errorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.dangerMuted, borderRadius: Theme.radiusSm,
    padding: 12, borderLeftWidth: 3, borderLeftColor: Colors.danger,
  },
  errorText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.danger },

  // Section
  sectionLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5 },

  // Status card
  statusCard: {
    backgroundColor: Colors.surface, borderRadius: Theme.radiusMd, padding: 16,
    borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, gap: 14,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusTitle:  { fontSize: 18, fontWeight: '800' },
  statusTime:   { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  // Skip alert
  skipAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.skipWarning, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  skipAlertText: { fontSize: 13, fontWeight: '600', color: Colors.skipOrange, flex: 1 },

  // Driver/vehicle info
  infoRow:    { flexDirection: 'row' },
  infoItem:   { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8 },
  infoDivider:{ width: 1, backgroundColor: Colors.border },
  infoLabel:  { fontSize: 10, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.5 },
  infoValue:  { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  // Load bar
  loadRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadLabel:   { fontSize: 11, fontWeight: '600', color: Colors.textMuted, width: 80 },
  loadBarTrack:{ flex: 1, height: 8, backgroundColor: Colors.surfaceGrey, borderRadius: 4, overflow: 'hidden' },
  loadBarFill: { height: '100%', borderRadius: 4 },
  loadPct:     { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, width: 36, textAlign: 'right' },

  // No data
  noDataCard: {
    backgroundColor: Colors.surface, borderRadius: Theme.radiusMd, padding: 32,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  noDataTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  noDataText:  { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
});