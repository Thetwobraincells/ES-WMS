// File: es-wms/apps/mobile/src/screens/driver/AlertsScreen.tsx

/**
 * AlertsScreen — Driver Alerts Tab (Phase 5)
 *
 * PRD FR-ADM-20: Drivers are notified of:
 *   - Truck Full claims flagged by supervisor
 *   - Backlog assignments (new stops added to their route)
 *   - Supervisor notes / messages
 *   - System alerts (geofence failures, sync issues)
 *
 * Static mock data for Phase 5. Phase 6 wires to FCM push + API.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format as formatDt, isToday, isYesterday } from 'date-fns';

import { Colors, Theme } from '../../theme/colors';
import StatusBadge from '../../components/StatusBadge';
import { getMyNotifications, markNotificationRead } from '../../services/notification.service';
import type { Notification as ApiNotification } from '../../types/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertType = 'warning' | 'info' | 'success' | 'backlog';

interface DriverAlert {
  id:        string;
  type:      AlertType;
  title:     string;
  body:      string;
  time:      string;
  dateGroup: string;
  read:      boolean;
}

// ─── Alert type config ────────────────────────────────────────────────────────

const ALERT_CONFIG: Record<AlertType, {
  icon:    keyof typeof Ionicons.glyphMap;
  bg:      string;
  color:   string;
  badge:   string;
  badgeBg: string;
}> = {
  warning: {
    icon: 'warning',         bg: Colors.dangerMuted,  color: Colors.danger,
    badge: 'FLAGGED',        badgeBg: Colors.dangerMuted,
  },
  info: {
    icon: 'information-circle', bg: '#EFF6FF', color: Colors.statusProgress,
    badge: 'NOTE',           badgeBg: '#DBEAFE',
  },
  success: {
    icon: 'checkmark-circle', bg: '#D1FAE5', color: Colors.greenMuted,
    badge: 'COMPLETE',       badgeBg: '#D1FAE5',
  },
  backlog: {
    icon: 'refresh-circle',  bg: '#EDE9FE', color: '#7C3AED',
    badge: 'NEW STOP',       badgeBg: '#EDE9FE',
  },
};

// ─── Alert Card ───────────────────────────────────────────────────────────────

function AlertCard({ alert, onRead }: { alert: DriverAlert; onRead: (id: string) => void }) {
  const cfg = ALERT_CONFIG[alert.type];

  return (
    <TouchableOpacity
      style={[acS.card, !alert.read && acS.cardUnread]}
      onPress={() => onRead(alert.id)}
      activeOpacity={0.85}
    >
      {!alert.read && <View style={acS.unreadDot} />}

      <View style={[acS.iconWrap, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>

      <View style={acS.body}>
        <View style={acS.topRow}>
          <StatusBadge
            variant="custom"
            label={cfg.badge}
            bgColor={cfg.badgeBg}
            textColor={cfg.color}
            size="sm"
          />
          <Text style={acS.time}>{alert.time}</Text>
        </View>
        <Text style={[acS.title, !alert.read && acS.titleUnread]}>
          {alert.title}
        </Text>
        <Text style={acS.bodyText}>{alert.body}</Text>
      </View>
    </TouchableOpacity>
  );
}

const acS = StyleSheet.create({
  card: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: Colors.surface, borderRadius: Theme.radiusMd,
    padding: 14, borderWidth: 1, borderColor: Colors.border,
    marginBottom: 10, position: 'relative',
  },
  cardUnread:  { borderLeftWidth: 3, borderLeftColor: Colors.green, backgroundColor: '#FAFFFE' },
  unreadDot: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  body:        { flex: 1, gap: 5 },
  topRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time:        { fontSize: 10, color: Colors.textMuted },
  title:       { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  titleUnread: { fontWeight: '800' },
  bodyText:    { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
});

// ─── Date divider ─────────────────────────────────────────────────────────────

function DateDivider({ label }: { label: string }) {
  return (
    <View style={ddS.row}>
      <View style={ddS.line} />
      <Text style={ddS.label}>{label}</Text>
      <View style={ddS.line} />
    </View>
  );
}

const ddS = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 },
  line:  { flex: 1, height: 1, backgroundColor: Colors.border },
  label: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const [alerts, setAlerts] = useState<DriverAlert[]>([]);

  // Fetch alerts from backend
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const notifs = await getMyNotifications();
        const mapped: DriverAlert[] = notifs.map((n: ApiNotification) => {
            let type: AlertType = 'info';
            if (n.type === 'ALERT') type = 'warning';
            if (n.type === 'FINE') type = 'warning';

            const d = new Date(n.sent_at);
            const dateGroup = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : formatDt(d, 'MMM dd');

            return {
                id: n.id,
                type,
                title: n.title,
                body: n.body,
                time: formatDt(d, 'hh:mm a'),
                dateGroup,
                read: n.read_at !== null
            };
        });
        setAlerts(mapped);
      } catch(e) {
        console.warn('Failed to fetch driver alerts', e);
      }
    };
    
    fetchAlerts();
    const pollId = setInterval(fetchAlerts, 4000);
    return () => clearInterval(pollId);
  }, []);

  const unreadCount = alerts.filter(a => !a.read).length;

  const markRead = async (id: string) => {
    try {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
        await markNotificationRead(id);
    } catch(e) {}
  };

  const markAllRead = async () => {
    const unread = alerts.filter(a => !a.read);
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    for (const u of unread) {
        try { await markNotificationRead(u.id); } catch(e) {}
    }
  };

  // Group by dateGroup
  const groups: { dateGroup: string; items: DriverAlert[] }[] = [];
  alerts.forEach(alert => {
    const last = groups[groups.length - 1];
    if (last && last.dateGroup === alert.dateGroup) {
      last.items.push(alert);
    } else {
      groups.push({ dateGroup: alert.dateGroup, items: [alert] });
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
            <Text style={s.headerTitle}>Alerts</Text>
            <Text style={s.headerSub}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </Text>
          </View>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={s.markAllBtn} onPress={markAllRead}>
            <Text style={s.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {unreadCount === 0 && (
          <View style={s.allClear}>
            <View style={s.allClearIcon}>
              <Ionicons name="checkmark-done-circle" size={40} color={Colors.green} />
            </View>
            <Text style={s.allClearTitle}>No New Alerts</Text>
            <Text style={s.allClearSub}>You're all caught up for today.</Text>
          </View>
        )}

        {groups.map(group => (
          <View key={group.dateGroup}>
            <DateDivider label={group.dateGroup} />
            {group.items.map(alert => (
              <AlertCard key={alert.id} alert={alert} onRead={markRead} />
            ))}
          </View>
        ))}

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content:{ padding: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.navyDark,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: Colors.white },
  headerSub:   { fontSize: 11, color: Colors.textOnDarkMuted },
  markAllBtn:  { paddingHorizontal: 12, paddingVertical: 6 },
  markAllText: { fontSize: 12, fontWeight: '700', color: Colors.green },

  allClear: { alignItems: 'center', paddingTop: 60, gap: 10 },
  allClearIcon: {
    width: 70, height: 70, borderRadius: 18, backgroundColor: '#D1FAE5',
    justifyContent: 'center', alignItems: 'center',
  },
  allClearTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  allClearSub:   { fontSize: 13, color: Colors.textSecondary },
});