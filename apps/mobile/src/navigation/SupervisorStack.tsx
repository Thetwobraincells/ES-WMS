// File: es-wms/apps/mobile/src/navigation/SupervisorStack.tsx

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Theme } from '../theme/colors';
import FleetOverview from '../screens/supervisor/FleetOverview';
import RouteAudit    from '../screens/supervisor/RouteAudit';
import ProfileScreen from '../screens/shared/ProfileScreen';

export type SupervisorTabParams = {
  FleetTab:   undefined;
  AuditTab:   undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<SupervisorTabParams>();

export default function SupervisorStack() {
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
            FleetTab:   focused ? 'car'           : 'car-outline',
            AuditTab:   focused ? 'clipboard'     : 'clipboard-outline',
            ProfileTab: focused ? 'person-circle' : 'person-circle-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="FleetTab"
        component={FleetOverview}
        options={{ tabBarLabel: 'Fleet' }}
      />
      <Tab.Screen
        name="AuditTab"
        component={RouteAudit}
        options={{ tabBarLabel: 'Audit' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}