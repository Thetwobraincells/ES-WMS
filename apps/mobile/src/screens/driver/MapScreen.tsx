// File: es-wms/apps/mobile/src/screens/driver/MapScreen.tsx

/**
 * MapScreen — Driver Map Tab (Phase 5)
 *
 * Opens the driver's current route in Google Maps via deep link.
 * Full in-app map integration (react-native-maps) is a Phase 6 feature
 * requiring a Google Maps API key setup.
 *
 * Shows:
 *   - Current stop address
 *   - Next stop address
 *   - "Open in Google Maps" button (Linking deep link)
 *   - "Open in Waze" button as alternative
 *   - Route summary (distance + stops remaining)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Theme } from '../../theme/colors';
import BigButton from '../../components/BigButton';
import { useRouteStore } from '../../stores/routeStore';

// ─── Map open helpers ─────────────────────────────────────────────────────────

const openGoogleMaps = async (lat: number, lng: number, label: string) => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    // Fallback to browser if Google Maps app not installed
    await Linking.openURL(
      `https://maps.google.com/?q=${lat},${lng}&label=${encodeURIComponent(label)}`
    );
  }
};

const openWaze = async (lat: number, lng: number) => {
  const url = `waze://?ll=${lat},${lng}&navigate=yes`;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    Alert.alert('Waze Not Installed', 'Please install Waze or use Google Maps instead.');
  }
};

// ─── Stop destination card ────────────────────────────────────────────────────

function DestinationCard({
  label,
  stop,
  isActive,
}: {
  label:    string;
  stop:     { society: string, address: string, lat: number, lng: number };
  isActive: boolean;
}) {
  return (
    <View style={[dcS.card, isActive && dcS.cardActive]}>
      <View style={dcS.topRow}>
        <View style={[dcS.labelPill, { backgroundColor: isActive ? Colors.green : Colors.surfaceGrey }]}>
          <Text style={[dcS.labelText, { color: isActive ? Colors.white : Colors.textMuted }]}>
            {label}
          </Text>
        </View>
        <View style={dcS.iconWrap}>
          <Ionicons name="business" size={18} color={Colors.textSecondary} />
        </View>
      </View>
      <Text style={dcS.society}>{stop.society}</Text>
      <Text style={dcS.address}>{stop.address}</Text>
      <View style={dcS.coordRow}>
        <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
        <Text style={dcS.coords}>{stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}</Text>
      </View>
    </View>
  );
}

const dcS = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Theme.radiusMd,
    padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 6,
  },
  cardActive:  { borderColor: Colors.green, borderWidth: 1.5 },
  topRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelPill:   { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  labelText:   { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  iconWrap:    {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: Colors.surfaceGrey, justifyContent: 'center', alignItems: 'center',
  },
  society:   { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  address:   { fontSize: 12, color: Colors.textSecondary },
  coordRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  coords:    { fontSize: 10, color: Colors.textMuted, fontFamily: undefined },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { stops, route, vehicle } = useRouteStore();

  const pendingStops = stops
    .filter(s => s.status === 'PENDING' || s.status === 'IN_PROGRESS')
    .sort((a, b) => a.sequence_order - b.sequence_order);
  
  const currentStopObj = pendingStops.find(s => s.status === 'IN_PROGRESS') ?? pendingStops[0] ?? null;
  const nextStopObj = currentStopObj ? pendingStops.find(s => s.sequence_order > currentStopObj.sequence_order) ?? null : null;

  const currentStopData = currentStopObj ? {
    society: currentStopObj.society?.name ?? 'Unknown Society',
    address: currentStopObj.address,
    lat: currentStopObj.lat,
    lng: currentStopObj.lng,
  } : null;

  const nextStopData = nextStopObj ? {
    society: nextStopObj.society?.name ?? 'Unknown Society',
    address: nextStopObj.address,
    lat: nextStopObj.lat,
    lng: nextStopObj.lng,
  } : null;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.logoBox}>
            <Ionicons name="reload-circle" size={18} color={Colors.green} />
          </View>
          <View>
            <Text style={s.headerTitle}>Route Map</Text>
            <Text style={s.headerSub}>{vehicle?.registration_no ?? 'TRUCK-XXXX'} · {route?.shift === 'AM' ? 'Morning Shift' : 'Evening Shift'}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Map placeholder ── */}
        <View style={s.mapPlaceholder}>
          <Ionicons name="map" size={48} color={Colors.textMuted} style={{ opacity: 0.4 }} />
          <Text style={s.mapPlaceholderTitle}>Live Map View</Text>
          <Text style={s.mapPlaceholderSub}>
            Full in-app map requires Google Maps API key.{'\n'}
            Use the buttons below to navigate.
          </Text>
        </View>

        {/* ── Route summary ── */}
        <View style={s.summaryRow}>
          {[
            { icon: 'git-branch-outline' as const, value: String(pendingStops.length),     label: 'Stops Left' },
            { icon: 'navigate-outline'   as const, value: '18 km',  label: 'Est. Distance' },
            { icon: 'time-outline'       as const, value: '~2.5 hr',label: 'Est. Time' },
          ].map(item => (
            <View key={item.label} style={s.summaryChip}>
              <Ionicons name={item.icon} size={16} color={Colors.green} />
              <Text style={s.summaryValue}>{item.value}</Text>
              <Text style={s.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Current + next stop ── */}
        <Text style={s.sectionLabel}>CURRENT STOP</Text>
        {currentStopData ? (
          <DestinationCard label="In Progress" stop={currentStopData} isActive />
        ) : (
          <Text style={{ color: Colors.textSecondary, marginBottom: 16 }}>No active stop. You're all caught up!</Text>
        )}

        <Text style={s.sectionLabel}>NEXT STOP</Text>
        {nextStopData ? (
          <DestinationCard label="Up Next" stop={nextStopData} isActive={false} />
        ) : (
          <Text style={{ color: Colors.textSecondary, marginBottom: 16 }}>No upcoming stops.</Text>
        )}

        {/* ── Navigation CTAs ── */}
        <Text style={s.sectionLabel}>OPEN NAVIGATION</Text>

        {currentStopData ? (
          <>
            <BigButton
              label="Open in Google Maps"
              icon="navigate"
              onPress={() => openGoogleMaps(currentStopData.lat, currentStopData.lng, currentStopData.society)}
              variant="primary"
            />

            <View style={s.spacer} />

            <BigButton
              label="Open in Waze"
              icon="car"
              onPress={() => openWaze(currentStopData.lat, currentStopData.lng)}
              variant="dark"
            />
          </>
        ) : (
          <Text style={{ color: Colors.textSecondary, marginBottom: 16 }}>Wait for a current stop to begin navigation.</Text>
        )}

        {/* ── Disclaimer ── */}
        <View style={s.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
          <Text style={s.disclaimerText}>
            Navigation opens in an external app. GPS geofence validation
            uses the ES-WMS app location, not the external map.
          </Text>
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

  mapPlaceholder: {
    height: 160, backgroundColor: Colors.surfaceGrey,
    borderRadius: Theme.radiusMd, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  mapPlaceholderTitle: { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
  mapPlaceholderSub:   { fontSize: 11, color: Colors.textMuted, textAlign: 'center', lineHeight: 17 },

  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryChip: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Theme.radiusMd,
    padding: 12, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  summaryValue: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  summaryLabel: { fontSize: 9,  fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.5 },

  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 1.5, marginBottom: -4,
  },
  spacer: { height: 0 },

  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: Colors.surfaceGrey, borderRadius: Theme.radiusSm, padding: 10,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: Colors.textMuted, lineHeight: 17 },
});