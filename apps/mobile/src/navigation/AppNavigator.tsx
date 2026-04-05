import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Colors } from '../theme/colors';
import { useAuthStore }   from '../stores/authStore';
import LoginScreen        from '../screens/auth/LoginScreen';
import DriverStack        from './DriverStack';
import SupervisorStack    from './SupervisorStack';
import CitizenStack       from './CitizenStack';

// ─── Stack param types ────────────────────────────────────────────────────────

export type AuthStackParams = {
  Login: undefined;
};

// ─── Auth Stack (unauthenticated) ─────────────────────────────────────────────

const AuthStack = createNativeStackNavigator<AuthStackParams>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Admin placeholder (out-of-scope for mobile; admins use web dashboard) ────

function AdminPlaceholder() {
  return (
    <View style={styles.adminContainer}>
      {/* Admin role is handled by the web ICCC dashboard per PRD § 2.3 */}
      <ActivityIndicator color={Colors.green} size="large" />
    </View>
  );
}

// ─── Loading splash (while Zustand rehydrates from AsyncStorage) ──────────────

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.green} />
    </View>
  );
}

// ─── Root App Navigator ───────────────────────────────────────────────────────

export default function AppNavigator() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user            = useAuthStore(s => s.user);

  /**
   * Zustand with `persist` middleware hydrates from AsyncStorage asynchronously.
   * We wait one tick before rendering navigation to avoid a flash of the Login
   * screen for users who are already authenticated.
   */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // The persist middleware calls onFinishHydration internally.
    // A single-tick delay is sufficient for the initial state to settle.
    const timer = setTimeout(() => setHydrated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!hydrated) {
    return <LoadingScreen />;
  }

  /**
   * Render the correct stack based on authentication state and user role.
   * This is the RBAC gating point — each role only ever sees their stack.
   */
  const renderAuthenticatedStack = () => {
    if (!user) return <AuthNavigator />;

    switch (user.role) {
      case 'DRIVER':
        return <DriverStack />;
      case 'SUPERVISOR':
        return <SupervisorStack />;
      case 'CITIZEN':
        return <CitizenStack />;
      case 'ADMIN':
        // Admin users should be redirected to the web dashboard.
        // Show a placeholder / force logout on mobile.
        return <AdminPlaceholder />;
      default:
        return <AuthNavigator />;
    }
  };

  return (
    <NavigationContainer>
      {isAuthenticated ? renderAuthenticatedStack() : <AuthNavigator />}
    </NavigationContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.navyDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminContainer: {
    flex: 1,
    backgroundColor: Colors.navyDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
});