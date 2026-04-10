// File: es-wms/apps/mobile/src/screens/shared/ProfileScreen.tsx

/**
 * ProfileScreen — Unified Settings & Logout (Phase 5)
 *
 * Used by all three roles: DRIVER | SUPERVISOR | CITIZEN
 * The screen reads the current user from Zustand and renders
 * role-appropriate identity info and settings.
 *
 * Key behaviour:
 *   "Log Out" calls useAuthStore.logout() which clears the JWT + user
 *   from Zustand (and AsyncStorage via persist middleware).
 *   AppNavigator observes isAuthenticated → false and immediately
 *   unmounts the protected stack, returning to LoginScreen.
 *   No manual navigation call is needed — the navigator reacts to
 *   the state change automatically.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Theme } from '../../theme/colors';
import { useAuthStore }  from '../../stores/authStore';
import BigButton         from '../../components/BigButton';

// ─── Role display config ──────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, {
  label:   string;
  icon:    keyof typeof Ionicons.glyphMap;
  color:   string;
  bgColor: string;
  tagline: string;
}> = {
  DRIVER: {
    label:   'Garbage Truck Driver',
    icon:    'bus',
    color:   Colors.green,
    bgColor: '#D1FAE5',
    tagline: 'Field Operations · Solid Waste Management',
  },
  SUPERVISOR: {
    label:   'Mukadam (Field Supervisor)',
    icon:    'shield-checkmark',
    color:   Colors.statusProgress,
    bgColor: '#DBEAFE',
    tagline: 'Zone Management · Route Oversight',
  },
  CITIZEN: {
    label:   'Society Resident',
    icon:    'home',
    color:   Colors.warning,
    bgColor: Colors.warningMuted,
    tagline: 'Waste Segregation · Community Member',
  },
  ADMIN: {
    label:   'BMC Ward Officer',
    icon:    'briefcase',
    color:   Colors.navyDark,
    bgColor: Colors.surfaceGrey,
    tagline: 'Administration · ICCC Dashboard',
  },
};

// ─── Settings row ─────────────────────────────────────────────────────────────

interface SettingRowProps {
  icon:        keyof typeof Ionicons.glyphMap;
  label:       string;
  description?: string;
  type:        'toggle' | 'chevron' | 'info';
  value?:      boolean;
  onToggle?:   (v: boolean) => void;
  onPress?:    () => void;
  accent?:     string;
}

function SettingRow({
  icon, label, description, type, value, onToggle, onPress, accent,
}: SettingRowProps) {
  const iconColor = accent ?? Colors.navyDark;

  return (
    <TouchableOpacity
      style={srS.row}
      onPress={type === 'chevron' ? onPress : undefined}
      activeOpacity={type === 'chevron' ? 0.7 : 1}
      disabled={type === 'toggle' || type === 'info'}
    >
      <View style={[srS.iconWrap, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={srS.labelBlock}>
        <Text style={srS.label}>{label}</Text>
        {description ? (
          <Text style={srS.description}>{description}</Text>
        ) : null}
      </View>
      {type === 'toggle' && (
        <Switch
          value={value ?? false}
          onValueChange={onToggle}
          trackColor={{ false: Colors.surfaceGrey, true: Colors.green + 'AA' }}
          thumbColor={value ? Colors.green : Colors.textMuted}
          ios_backgroundColor={Colors.surfaceGrey}
        />
      )}
      {type === 'chevron' && (
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      )}
      {type === 'info' && (
        <Text style={srS.infoValue}>{value as unknown as string}</Text>
      )}
    </TouchableOpacity>
  );
}

const srS = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  labelBlock: { flex: 1, gap: 2 },
  label:      { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  description:{ fontSize: 11, color: Colors.textMuted },
  infoValue:  { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
});

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return <Text style={secS.label}>{label}</Text>;
}

const secS = StyleSheet.create({
  label: {
    fontSize: 10, fontWeight: '800', color: Colors.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase',
    marginTop: 8, marginBottom: 2, paddingHorizontal: 2,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const user   = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  // ── Settings state (visual only — persisted in Phase 6) ───────────────────
  const [pushNotifications, setPushNotifications] = useState(true);
  const [locationTracking,  setLocationTracking]  = useState(true);
  const [darkMode,          setDarkMode]          = useState(false);
  const [marathi,           setMarathi]           = useState(false);

  const role    = user?.role ?? 'DRIVER';
  const roleCfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.DRIVER;

  // ── Initials for avatar ────────────────────────────────────────────────────
  const initials = (user?.name ?? 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // ── Logout handler ─────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out? You will need to verify your mobile number again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text:  'Log Out',
          style: 'destructive',
          onPress: () => {
            // Calling logout() clears JWT + user from Zustand + AsyncStorage.
            // AppNavigator observes isAuthenticated → false and automatically
            // unmounts this entire stack, showing LoginScreen. No navigate() needed.
            logout();
          },
        },
      ],
    );
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.logoBox}>
            <Ionicons name="reload-circle" size={18} color={Colors.green} />
          </View>
          <Text style={s.headerTitle}>Profile & Settings</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Identity card ── */}
        <View style={s.identityCard}>
          {/* Avatar */}
          <View style={[s.avatar, { backgroundColor: roleCfg.color }]}>
            <Text style={s.avatarInitials}>{initials}</Text>
          </View>

          {/* Name + Role */}
          <View style={s.identityText}>
            <Text style={s.userName}>{user?.name ?? 'Unknown User'}</Text>
            <View style={[s.rolePill, { backgroundColor: roleCfg.bgColor }]}>
              <Ionicons name={roleCfg.icon} size={12} color={roleCfg.color} />
              <Text style={[s.roleLabel, { color: roleCfg.color }]}>
                {roleCfg.label}
              </Text>
            </View>
            <Text style={s.tagline}>{roleCfg.tagline}</Text>
          </View>

          {/* Identity meta */}
          <View style={s.identityMeta}>
            {user?.vehicleId && (
              <View style={s.metaChip}>
                <Ionicons name="bus-outline" size={12} color={Colors.textMuted} />
                <Text style={s.metaChipText}>{user.vehicleId}</Text>
              </View>
            )}
            {user?.zoneId && (
              <View style={s.metaChip}>
                <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                <Text style={s.metaChipText}>{user.zoneId}</Text>
              </View>
            )}
            {user?.societyId && (
              <View style={s.metaChip}>
                <Ionicons name="business-outline" size={12} color={Colors.textMuted} />
                <Text style={s.metaChipText}>{user.societyId}</Text>
              </View>
            )}
            <View style={s.metaChip}>
              <Ionicons name="call-outline" size={12} color={Colors.textMuted} />
              <Text style={s.metaChipText}>{user?.mobile ?? '—'}</Text>
            </View>
          </View>
        </View>

        {/* ── Notifications section ── */}
        <SectionHeader label="Notifications" />
        <View style={s.settingsCard}>
          <SettingRow
            icon="notifications-outline"
            label="Push Notifications"
            description="Skip alerts, pickup reminders, fine notices"
            type="toggle"
            value={pushNotifications}
            onToggle={setPushNotifications}
            accent={Colors.green}
          />
          <SettingRow
            icon="location-outline"
            label="Location Tracking"
            description={
              role === 'DRIVER' || role === 'SUPERVISOR'
                ? 'Required for GPS geofence validation'
                : 'Used to show truck distance from your society'
            }
            type="toggle"
            value={locationTracking}
            onToggle={setLocationTracking}
            accent={Colors.statusProgress}
          />
        </View>

        {/* ── Display section ── */}
        <SectionHeader label="Display & Language" />
        <View style={s.settingsCard}>
          <SettingRow
            icon="moon-outline"
            label="Dark Mode"
            description="Coming in a future update"
            type="toggle"
            value={darkMode}
            onToggle={setDarkMode}
            accent={Colors.navyDark}
          />
          <SettingRow
            icon="language-outline"
            label="मराठी Interface"
            description="Switch app language to Marathi"
            type="toggle"
            value={marathi}
            onToggle={setMarathi}
            accent={Colors.warning}
          />
        </View>

        {/* ── App info section ── */}
        <SectionHeader label="About" />
        <View style={s.settingsCard}>
          <SettingRow
            icon="shield-checkmark-outline"
            label="App Version"
            type="info"
            value={'1.0.0 (MVP)' as unknown as boolean}
            accent={Colors.textMuted}
          />
          <SettingRow
            icon="document-text-outline"
            label="Privacy Policy"
            type="chevron"
            onPress={() => Linking.openURL('https://mcgm.gov.in')}
            accent={Colors.textMuted}
          />
          <SettingRow
            icon="help-circle-outline"
            label="Help & Support"
            type="chevron"
            onPress={() => Linking.openURL('https://mcgm.gov.in')}
            accent={Colors.textMuted}
          />
          <SettingRow
            icon="business-outline"
            label="Brihanmumbai Municipal Corporation"
            description="mcgm.gov.in · SWM Division"
            type="chevron"
            onPress={() => Linking.openURL('https://mcgm.gov.in')}
            accent={Colors.navyDark}
          />
        </View>

        {/* ── Session info ── */}
        <View style={s.sessionCard}>
          <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
          <Text style={s.sessionText}>
            Logged in as <Text style={s.sessionBold}>{user?.mobile}</Text>
            {' '}· Session active
          </Text>
        </View>

        {/* ── Logout button (pinned at bottom, full-width, danger) ── */}
        <BigButton
          label="Log Out"
          icon="log-out-outline"
          onPress={handleLogout}
          variant="danger"
          style={s.logoutBtn}
        />

        <Text style={s.logoutHint}>
          You will need to verify your mobile number to sign back in.
        </Text>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content:{ padding: 16, gap: 10 },

  // Header
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
  headerTitle: { fontSize: 15, fontWeight: '800', color: Colors.white, letterSpacing: 0.5 },

  // Identity card
  identityCard: {
    backgroundColor: Colors.surface, borderRadius: Theme.radiusMd,
    padding: 20, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', gap: 12,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.navyDark, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },
  avatarInitials: {
    fontSize: 28, fontWeight: '900', color: Colors.white, letterSpacing: 1,
  },
  identityText: { alignItems: 'center', gap: 6 },
  userName:     { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: Theme.radiusFull,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  roleLabel: { fontSize: 12, fontWeight: '700' },
  tagline:   { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },

  identityMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.surfaceGrey, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  metaChipText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },

  // Settings card
  settingsCard: {
    backgroundColor: Colors.surface, borderRadius: Theme.radiusMd,
    paddingHorizontal: 14, paddingTop: 2, paddingBottom: 2,
    borderWidth: 1, borderColor: Colors.border,
  },

  // Session info
  sessionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surfaceGrey, borderRadius: Theme.radiusSm,
    paddingHorizontal: 12, paddingVertical: 8, marginTop: 4,
  },
  sessionText: { fontSize: 11, color: Colors.textMuted, flex: 1 },
  sessionBold: { fontWeight: '700', color: Colors.textSecondary },

  // Logout
  logoutBtn:  { marginTop: 8 },
  logoutHint: {
    fontSize: 11, color: Colors.textMuted,
    textAlign: 'center', lineHeight: 17,
  },
});