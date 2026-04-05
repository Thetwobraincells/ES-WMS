import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Theme } from '../../theme/colors';

export default function StopDetail() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stop Detail</Text>
      <Text style={styles.subtitle}>Phase 2 — Driver screens coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  title: {
    fontSize: Theme.fontSize.xl,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  subtitle: {
    fontSize: Theme.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});