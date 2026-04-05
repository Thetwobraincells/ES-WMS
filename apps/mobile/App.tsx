import 'react-native-gesture-handler';

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider }       from 'react-native-safe-area-context';
import { StatusBar }              from 'expo-status-bar';

import AppNavigator from './src/navigation/AppNavigator';
import { Colors }   from './src/theme/colors';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.navyDark }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={Colors.navyDark} />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}