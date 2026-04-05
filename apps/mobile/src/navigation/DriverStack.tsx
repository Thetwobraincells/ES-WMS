import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Theme } from '../theme/colors';
import RouteOverview from '../screens/driver/RouteOverview';
import StopDetail   from '../screens/driver/StopDetail';
import CameraProof  from '../screens/driver/CameraProof';

// ─── Type Definitions ─────────────────────────────────────────────────────────

export type DriverRouteStackParams = {
  RouteOverview: undefined;
  StopDetail: { stopId: string };
  CameraProof: { stopId: string };
};

export type DriverTabParams = {
  RouteTab:  undefined;
  StopsTab:  undefined;
  MapTab:    undefined;
  AlertsTab: undefined;
};

// ─── Inner Stack (Route → Stop → Camera) ─────────────────────────────────────

const RouteStack = createNativeStackNavigator<DriverRouteStackParams>();

function RouteStackNavigator() {
  return (
    <RouteStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <RouteStack.Screen name="RouteOverview" component={RouteOverview} />
      <RouteStack.Screen name="StopDetail"    component={StopDetail}    />
      <RouteStack.Screen name="CameraProof"   component={CameraProof}   />
    </RouteStack.Navigator>
  );
}

// ─── Placeholder screens for other tabs ──────────────────────────────────────

function StopsTab() {
  return (
    <View style={placeholderStyles.container}>
      <Ionicons name="trash-outline" size={40} color={Colors.green} />
      <Text style={placeholderStyles.text}>All Stops</Text>
      <Text style={placeholderStyles.sub}>Coming in Phase 2</Text>
    </View>
  );
}

function MapTab() {
  return (
    <View style={placeholderStyles.container}>
      <Ionicons name="map-outline" size={40} color={Colors.green} />
      <Text style={placeholderStyles.text}>Route Map</Text>
      <Text style={placeholderStyles.sub}>Coming in Phase 2</Text>
    </View>
  );
}

function AlertsTab() {
  return (
    <View style={placeholderStyles.container}>
      <Ionicons name="warning-outline" size={40} color={Colors.warning} />
      <Text style={placeholderStyles.text}>Alerts</Text>
      <Text style={placeholderStyles.sub}>Coming in Phase 2</Text>
    </View>
  );
}

// ─── Bottom Tab Navigator ─────────────────────────────────────────────────────

const Tab = createBottomTabNavigator<DriverTabParams>();

export default function DriverStack() {
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
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: Theme.fontSize.xs,
          fontWeight: Theme.fontWeight.semibold,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            RouteTab:  'git-branch-outline',
            StopsTab:  'trash-outline',
            MapTab:    'map-outline',
            AlertsTab: 'warning-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="RouteTab"
        component={RouteStackNavigator}
        options={{ tabBarLabel: 'Route' }}
      />
      <Tab.Screen
        name="StopsTab"
        component={StopsTab}
        options={{ tabBarLabel: 'Stops' }}
      />
      <Tab.Screen
        name="MapTab"
        component={MapTab}
        options={{ tabBarLabel: 'Map' }}
      />
      <Tab.Screen
        name="AlertsTab"
        component={AlertsTab}
        options={{ tabBarLabel: 'Alerts' }}
      />
    </Tab.Navigator>
  );
}

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.textPrimary,
  },
  sub: {
    fontSize: Theme.fontSize.sm,
    color: Colors.textMuted,
  },
});