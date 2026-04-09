// File: es-wms/apps/mobile/src/navigation/DriverStack.tsx

/**
 * Driver Navigation Architecture (Phase 5 — Final)
 * ────────────────────────────────────────────────────────────────────────────
 *
 *  DriverStack  (NativeStack — ROOT)
 *  ├── DriverTabs                  ← bottom tab bar
 *  │   ├── RouteTab  → RouteOverview
 *  │   ├── MapTab    → MapScreen
 *  │   ├── AlertsTab → AlertsScreen
 *  │   └── ProfileTab→ ProfileScreen
 *  ├── StopDetail                  ← full-screen (tab bar hidden)
 *  └── CameraProof                 ← full-screen (tab bar hidden)
 *
 * Changes from Phase 4:
 *   - StopsTab removed (RouteOverview handles the stop list)
 *   - MapTab → real MapScreen with Google Maps deep link
 *   - AlertsTab → real AlertsScreen with StatusBadge feed
 *   - ProfileTab added → shared ProfileScreen with logout
 */

import React from 'react';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Colors, Theme } from '../theme/colors';
import RouteOverview from '../screens/driver/RouteOverview';
import StopDetail    from '../screens/driver/StopDetail';
import CameraProof   from '../screens/driver/CameraProof';
import MapScreen     from '../screens/driver/MapScreen';
import AlertsScreen  from '../screens/driver/AlertsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

// ─── Param types ──────────────────────────────────────────────────────────────

export type DriverRootStackParams = {
  DriverTabs:  undefined;
  StopDetail:  { stopId: string };
  CameraProof: { stopId: string };
};

export type DriverTabParams = {
  RouteTab:   undefined;
  MapTab:     undefined;
  AlertsTab:  undefined;
  ProfileTab: undefined;
};

// Legacy alias — screen files import this name
export type DriverRouteStackParams = DriverRootStackParams;

// ─── Unread alert badge helper ────────────────────────────────────────────────

function AlertsBadge({ color }: { color: string }) {
  // Static badge — Phase 6 wires to real unread count from store
  return (
    <View style={{
      position: 'absolute', top: -4, right: -6,
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: Colors.danger,
      borderWidth: 1.5, borderColor: Colors.navyDark,
    }} />
  );
}

// ─── Bottom Tab Navigator ─────────────────────────────────────────────────────

const Tab = createBottomTabNavigator<DriverTabParams>();

function DriverTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   Colors.green,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.navyDark,
          borderTopColor:  Colors.navyMid,
          borderTopWidth:  1,
          height:          64,
          paddingBottom:   8,
          paddingTop:      6,
        },
        tabBarLabelStyle: {
          fontSize:      Theme.fontSize.xs,
          fontWeight:    Theme.fontWeight.semibold,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            RouteTab:   focused ? 'git-branch'         : 'git-branch-outline',
            MapTab:     focused ? 'map'                : 'map-outline',
            AlertsTab:  focused ? 'warning'            : 'warning-outline',
            ProfileTab: focused ? 'person-circle'      : 'person-circle-outline',
          };
          return (
            <View>
              <Ionicons name={icons[route.name]} size={size} color={color} />
              {/* Show red dot badge on Alerts tab */}
              {route.name === 'AlertsTab' && (
                <AlertsBadge color={color} />
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="RouteTab"
        component={RouteOverview}
        options={{ tabBarLabel: 'Route' }}
      />
      <Tab.Screen
        name="MapTab"
        component={MapScreen}
        options={{ tabBarLabel: 'Map' }}
      />
      <Tab.Screen
        name="AlertsTab"
        component={AlertsScreen}
        options={{ tabBarLabel: 'Alerts' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Stack ───────────────────────────────────────────────────────────────

const RootStack = createNativeStackNavigator<DriverRootStackParams>();

export default function DriverStack() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="DriverTabs"  component={DriverTabs} />
      <RootStack.Screen name="StopDetail"  component={StopDetail}
        options={{ animation: 'slide_from_right' }} />
      <RootStack.Screen name="CameraProof" component={CameraProof}
        options={{ animation: 'slide_from_bottom' }} />
    </RootStack.Navigator>
  );
}