// File: es-wms/apps/mobile/src/navigation/CitizenStack.tsx

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Theme } from '../theme/colors';
import CitizenDashboard    from '../screens/citizen/CitizenDashboard';
import ComplaintForm       from '../screens/citizen/ComplaintForm';
import NotificationHistory from '../screens/citizen/NotificationHistory';
import ProfileScreen       from '../screens/shared/ProfileScreen';

export type CitizenTabParams = {
  StatusTab:        undefined;
  ComplaintTab:     undefined;
  NotificationsTab: undefined;
  ProfileTab:       undefined;
};

const Tab = createBottomTabNavigator<CitizenTabParams>();

export default function CitizenStack() {
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
            StatusTab:        focused ? 'home'              : 'home-outline',
            ComplaintTab:     focused ? 'alert-circle'      : 'alert-circle-outline',
            NotificationsTab: focused ? 'notifications'     : 'notifications-outline',
            ProfileTab:       focused ? 'person-circle'     : 'person-circle-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="StatusTab"
        component={CitizenDashboard}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="ComplaintTab"
        component={ComplaintForm}
        options={{ tabBarLabel: 'Report' }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationHistory}
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