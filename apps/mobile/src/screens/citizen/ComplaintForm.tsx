// File: es-wms/apps/mobile/src/screens/citizen/ComplaintForm.tsx

/**
 * Citizen Complaint Form
 *
 * Allows citizens to submit missed-collection complaints.
 * POST /api/v1/societies/:id/complaint
 *
 * PRD FR-CIT-03: Complaint submission
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Theme } from '../../theme/colors';
import BigButton from '../../components/BigButton';
import { useAuthStore } from '../../stores/authStore';
import * as societyService from '../../services/society.service';

export default function ComplaintForm() {
  const insets    = useSafeAreaInsets();
  const user      = useAuthStore(s => s.user);
  const societyId = user?.society_id;

  const [description, setDescription] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);

  const canSubmit = description.trim().length >= 10 && !submitting;

  const handleSubmit = async () => {
    if (!societyId) {
      Alert.alert('Error', 'No society linked to your account.');
      return;
    }
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      await societyService.submitComplaint(societyId, description.trim());
      setSubmitted(true);
      setDescription('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Failed to submit complaint';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <View style={[s.root, s.centered, { paddingTop: insets.top }]}>
        <View style={s.successIcon}>
          <Ionicons name="checkmark-circle" size={56} color={Colors.green} />
        </View>
        <Text style={s.successTitle}>Complaint Submitted</Text>
        <Text style={s.successText}>
          Your complaint has been logged. The BMC team will review and respond shortly.
        </Text>
        <BigButton
          label="Submit Another"
          icon="create-outline"
          onPress={() => setSubmitted(false)}
          variant="dark"
          style={{ marginTop: 24 }}
        />
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.logoBox}>
            <Ionicons name="megaphone" size={20} color={Colors.warning} />
          </View>
          <Text style={s.headerTitle}>Lodge a Complaint</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={s.scroll}
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Info banner ── */}
          <View style={s.infoBanner}>
            <Ionicons name="information-circle" size={20} color={Colors.statusProgress} />
            <Text style={s.infoText}>
              Report missed collections, improper handling, or any waste management issues. 
              Your complaint will be reviewed by the BMC SWM division.
            </Text>
          </View>

          {/* ── Description input ── */}
          <Text style={s.inputLabel}>DESCRIBE YOUR ISSUE</Text>
          <TextInput
            style={s.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="E.g., The waste collection truck did not arrive today morning. Our society bins are overflowing…"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={s.charCount}>{description.length}/500</Text>

          {/* ── Guidelines ── */}
          <View style={s.guideCard}>
            <Text style={s.guideTitle}>Tips for effective complaints</Text>
            {[
              'Be specific about the date and time',
              'Mention the type of issue (missed pickup, overflow, etc.)',
              'Include any relevant details like bin location',
            ].map((tip, i) => (
              <View key={i} style={s.guideRow}>
                <Ionicons name="checkmark" size={14} color={Colors.green} />
                <Text style={s.guideText}>{tip}</Text>
              </View>
            ))}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Submit button (fixed bottom) ── */}
      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}>
          {submitting ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="send" size={20} color={Colors.white} style={{ marginRight: 8 }} />
              <Text style={s.submitText}>Submit Complaint</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  scroll:  { flex: 1 },
  content: { padding: 16, gap: 14 },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox:    { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.warningMuted,
                justifyContent: 'center', alignItems: 'center' },
  headerTitle:{ fontSize: 18, fontWeight: '800', color: Colors.textPrimary },

  // Info banner
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#EFF6FF', borderRadius: Theme.radiusSm, padding: 14,
    borderWidth: 1, borderColor: '#DBEAFE',
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

  // Input
  inputLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5 },
  textArea: {
    backgroundColor: Colors.surface, borderRadius: Theme.radiusMd,
    borderWidth: 1, borderColor: Colors.border,
    padding: 16, fontSize: 15, color: Colors.textPrimary,
    minHeight: 140, lineHeight: 22,
  },
  charCount: { fontSize: 11, color: Colors.textMuted, textAlign: 'right' },

  // Guidelines
  guideCard: {
    backgroundColor: Colors.surface, borderRadius: Theme.radiusMd,
    padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  guideTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  guideRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guideText:  { fontSize: 13, color: Colors.textSecondary },

  // Submit
  bottomBar: {
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.green, borderRadius: Theme.radiusMd,
    height: 56, shadowColor: Colors.green, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  submitBtnDisabled: { backgroundColor: Colors.textMuted, shadowOpacity: 0, elevation: 0 },
  submitText: { fontSize: 16, fontWeight: '800', color: Colors.white },

  // Success
  successIcon:  { marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '800', color: Colors.green, marginBottom: 8 },
  successText:  { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});