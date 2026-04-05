import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Theme } from '../theme/colors';
import HomeStatus    from '../screens/citizen/HomeStatus';
import ComplaintForm from '../screens/citizen/ComplaintForm';

export type CitizenTabParams = {
  StatusTab:    undefined;
  ComplaintTab: undefined;
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
            StatusTab:    'home-outline',
            ComplaintTab: 'alert-circle-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="StatusTab"
        component={HomeStatus}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="ComplaintTab"
        component={ComplaintForm}
        options={{ tabBarLabel: 'Complaint' }}
      />
    </Tab.Navigator>
  );
}