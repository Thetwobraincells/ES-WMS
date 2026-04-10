// File: es-wms/apps/mobile/src/screens/auth/LoginScreen.tsx

/**
 * ES-WMS Login Screen
 *
 * Two-step OTP flow per FR-AUTH-02:
 *   Step 1: Enter 10-digit mobile number → request OTP
 *   Step 2: Enter 6-digit OTP → verify and mint JWT
 *
 * UX Constraints (PRD § 9.1):
 *   • Touch targets ≥ 56dp
 *   • High contrast for outdoor sunlight readability
 *   • Glove-friendly large inputs and buttons
 *   • One-handed use: primary CTA pinned to bottom thumb zone
 *
 * Prototype note:
 *   Use OTP '123456' for all numbers.
 *   Role is derived from last digit of mobile (1=Driver, 2=Supervisor, 3=Citizen)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Theme } from '../../theme/colors';
import { useAuthStore }   from '../../stores/authStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const MOBILE_LENGTH = 10;
const OTP_LENGTH    = 6;

// ─── OTP Input Cell ───────────────────────────────────────────────────────────

interface OtpCellProps {
  char:     string;
  isFocused: boolean;
}

function OtpCell({ char, isFocused }: OtpCellProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isFocused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.08, duration: 500, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,    duration: 500, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulse.setValue(1);
    }
  }, [isFocused, pulse]);

  return (
    <Animated.View
      style={[
        styles.otpCell,
        isFocused && styles.otpCellFocused,
        !!char && styles.otpCellFilled,
        { transform: [{ scale: pulse }] },
      ]}
    >
      <Text style={styles.otpChar}>{char || (isFocused ? '|' : '')}</Text>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  // ── State ──────────────────────────────────────────────────────────────────
  const [mobile,   setMobile]   = useState('');
  const [otp,      setOtp]      = useState('');
  const [step,     setStep]     = useState<'mobile' | 'otp'>('mobile');
  const [otpFocus, setOtpFocus] = useState(false);

  const otpInputRef    = useRef<TextInput>(null);
  const mobileInputRef = useRef<TextInput>(null);

  // ── Store ──────────────────────────────────────────────────────────────────
  const requestOtp  = useAuthStore(s => s.requestOtp);
  const verifyOtp   = useAuthStore(s => s.verifyOtp);
  const isLoading   = useAuthStore(s => s.isLoading);
  const error       = useAuthStore(s => s.error);
  const clearError  = useAuthStore(s => s.clearError);
  const otpSent     = useAuthStore(s => s.otpSent);
  const resetOtpSent= useAuthStore(s => s.resetOtpSent);
  const devOtp      = useAuthStore(s => s.devOtp);

  // ── Transition animation ───────────────────────────────────────────────────
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;

  const transitionToOtp = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setStep('otp');
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        setTimeout(() => otpInputRef.current?.focus(), 100);
      });
    });
  }, [fadeAnim, slideAnim]);

  // ── Watch for successful OTP request ──────────────────────────────────────
  useEffect(() => {
    if (otpSent && step === 'mobile') {
      transitionToOtp();
    }
  }, [otpSent, step, transitionToOtp]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSendOtp = async () => {
    if (mobile.length !== MOBILE_LENGTH) return;
    clearError();
    await requestOtp(mobile);
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== OTP_LENGTH) return;
    clearError();
    await verifyOtp(mobile, otp);
    // Navigation happens automatically via AppNavigator observing auth state
  };

  const handleBack = () => {
    setOtp('');
    setStep('mobile');
    resetOtpSent();
    clearError();
    setTimeout(() => mobileInputRef.current?.focus(), 100);
  };

  const handleOtpChange = (text: string) => {
    // Only allow digits, max OTP_LENGTH
    const clean = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(clean);
    if (clean.length === OTP_LENGTH) {
      // Auto-submit when all digits entered
      verifyOtp(mobile, clean);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navyDark} />

      {/* ── Background gradient layers ── */}
      <View style={styles.bgTop} />
      <View style={styles.bgDiagonal} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header / Branding ── */}
          <View style={styles.header}>
            {/* BMC Logo placeholder */}
            <View style={styles.logoWrapper}>
              <View style={styles.logoBadge}>
                {/* Replace with <Image source={require('../../../assets/bmc-logo.png')} /> */}
                <Ionicons name="shield-checkmark" size={36} color={Colors.white} />
              </View>
            </View>

            <Text style={styles.appName}>ES-WMS</Text>
            <Text style={styles.orgName}>
              Brihanmumbai Municipal Corporation
            </Text>
            <Text style={styles.division}>Solid Waste Management Division</Text>
          </View>

          {/* ── Card ── */}
          <View style={[styles.card, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>

            {/* Step indicator */}
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={[styles.stepLine, step === 'otp' && styles.stepLineActive]} />
              <View style={[styles.stepDot, step === 'otp' && styles.stepDotActive]} />
            </View>

            <Animated.View
              style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}
            >
              {step === 'mobile' ? (
                /* ─── Step 1: Mobile Number ─────────────────────────────── */
                <View>
                  <Text style={styles.stepLabel}>STEP 1 OF 2</Text>
                  <Text style={styles.cardTitle}>Enter Mobile Number</Text>
                  <Text style={styles.cardSub}>
                    We'll send a 6-digit OTP to verify your identity.
                  </Text>

                  {/* Mobile input */}
                  <View style={styles.inputGroup}>
                    <View style={styles.countryCode}>
                      <Ionicons name="call-outline" size={20} color={Colors.green} />
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>
                    <TextInput
                      ref={mobileInputRef}
                      style={styles.mobileInput}
                      value={mobile}
                      onChangeText={text => {
                        clearError();
                        setMobile(text.replace(/\D/g, '').slice(0, 10));
                      }}
                      keyboardType="phone-pad"
                      placeholder="9876543210"
                      placeholderTextColor={Colors.textMuted}
                      maxLength={MOBILE_LENGTH}
                      returnKeyType="done"
                      onSubmitEditing={handleSendOtp}
                      autoFocus
                    />
                    {mobile.length === MOBILE_LENGTH && (
                      <Ionicons name="checkmark-circle" size={24} color={Colors.green} />
                    )}
                  </View>

                  {/* Prototype hint */}
                  <View style={styles.hintBox}>
                    <Ionicons name="information-circle-outline" size={16} color={Colors.statusProgress} />
                    <Text style={styles.hintText}>
                      Use a seeded mobile number (e.g. 9222000001 for Driver, 9333000001 for Citizen). Check server console for OTP.
                    </Text>
                  </View>
                </View>
              ) : (
                /* ─── Step 2: OTP ────────────────────────────────────────── */
                <View>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBack}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="arrow-back" size={20} color={Colors.green} />
                    <Text style={styles.backText}>Change number</Text>
                  </TouchableOpacity>

                  <Text style={styles.stepLabel}>STEP 2 OF 2</Text>
                  <Text style={styles.cardTitle}>Enter OTP</Text>
                  <Text style={styles.cardSub}>
                    Sent to{' '}
                    <Text style={styles.mobileHighlight}>+91 {mobile}</Text>
                  </Text>

                  {/* OTP cells (visual) and hidden input overlay */}
                  <View style={styles.otpWrapper}>
                    <View style={styles.otpRow}>
                      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                        <OtpCell
                          key={i}
                          char={otp[i] ?? ''}
                          isFocused={otpFocus && otp.length === i}
                        />
                      ))}
                    </View>

                    <TextInput
                      ref={otpInputRef}
                      style={styles.hiddenInputOverlay}
                      value={otp}
                      onChangeText={handleOtpChange}
                      keyboardType="number-pad"
                      maxLength={OTP_LENGTH}
                      onFocus={() => setOtpFocus(true)}
                      onBlur={() => setOtpFocus(false)}
                      autoFocus
                      caretHidden
                    />
                  </View>

                  {/* Resend */}
                  <TouchableOpacity
                    onPress={() => requestOtp(mobile)}
                    style={styles.resendButton}
                    disabled={isLoading}
                  >
                    <Ionicons name="refresh-outline" size={16} color={Colors.green} />
                    <Text style={styles.resendText}>Resend OTP</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>

            {/* ── Error message ── */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* ── Primary CTA (thumb zone) ── */}
            <TouchableOpacity
              style={[
                styles.ctaButton,
                (isLoading ||
                  (step === 'mobile' && mobile.length < MOBILE_LENGTH) ||
                  (step === 'otp' && otp.length < OTP_LENGTH)) &&
                  styles.ctaButtonDisabled,
              ]}
              onPress={step === 'mobile' ? handleSendOtp : handleVerifyOtp}
              disabled={
                isLoading ||
                (step === 'mobile' && mobile.length < MOBILE_LENGTH) ||
                (step === 'otp' && otp.length < OTP_LENGTH)
              }
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Ionicons
                    name={step === 'mobile' ? 'send-outline' : 'lock-open-outline'}
                    size={22}
                    color={Colors.white}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.ctaText}>
                    {step === 'mobile' ? 'Send OTP' : 'Verify & Sign In'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <Text style={styles.footerText}>
              Authorised BMC personnel only • v1.0.0
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex:  { flex: 1 },
  root:  { flex: 1, backgroundColor: Colors.navyDark },

  // ── Backgrounds ────────────────────────────────────────────────────────────
  bgTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.navyDark,
  },
  bgDiagonal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: Colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },

  // ── Scroll ─────────────────────────────────────────────────────────────────
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 0,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  logoWrapper: {
    marginBottom: 14,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 3,
    marginBottom: 4,
  },
  orgName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 2,
  },
  division: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 28,
    // Shadow for iOS
    shadowColor: Colors.navyDark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },

  // ── Step indicator ─────────────────────────────────────────────────────────
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  stepDotActive: {
    backgroundColor: Colors.green,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: 6,
  },
  stepLineActive: {
    backgroundColor: Colors.green,
  },

  // ── Step text ──────────────────────────────────────────────────────────────
  stepLabel: {
    fontSize: Theme.fontSize.xs,
    fontWeight: '700',
    color: Colors.green,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: Theme.fontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  cardSub: {
    fontSize: Theme.fontSize.base,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },

  // ── Mobile input ──────────────────────────────────────────────────────────
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGrey,
    borderRadius: Theme.radiusMd,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 60, // ≥ 56dp per PRD
    marginBottom: 16,
    gap: 10,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
    borderRightWidth: 1.5,
    borderRightColor: Colors.border,
  },
  countryCodeText: {
    fontSize: Theme.fontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  mobileInput: {
    flex: 1,
    fontSize: Theme.fontSize.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: 2,
    height: '100%',
  },

  // ── Hint boxes ────────────────────────────────────────────────────────────
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: Theme.radiusSm,
    padding: 10,
  },
  hintText: {
    flex: 1,
    fontSize: Theme.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  hintCode: {
    fontWeight: '700',
    color: Colors.navyDark,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  // ── OTP ───────────────────────────────────────────────────────────────────
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    alignSelf: 'flex-start',
    minHeight: 36,
  },
  backText: {
    fontSize: Theme.fontSize.sm,
    fontWeight: '600',
    color: Colors.green,
  },
  mobileHighlight: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  otpWrapper: {
    position: 'relative',
    marginBottom: 16,
    marginTop: 8,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpCell: {
    width: 46,
    height: 56,
    borderRadius: 10,
    backgroundColor: Colors.surfaceGrey,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpCellFocused: {
    borderColor: Colors.green,
    backgroundColor: '#F0FAF2',
  },
  otpCellFilled: {
    borderColor: Colors.navyMid,
    backgroundColor: Colors.navyDark,
  },
  otpChar: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
  },
  hiddenInputOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.01,
    color: 'transparent',
    fontSize: 1, // Minimize visible artifacts
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 8,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  resendText: {
    fontSize: Theme.fontSize.sm,
    fontWeight: '600',
    color: Colors.green,
  },

  // ── Error ─────────────────────────────────────────────────────────────────
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.dangerMuted,
    borderRadius: Theme.radiusSm,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
  },
  errorText: {
    flex: 1,
    fontSize: Theme.fontSize.sm,
    color: Colors.danger,
    fontWeight: '600',
  },

  // ── CTA button ────────────────────────────────────────────────────────────
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.green,
    borderRadius: Theme.radiusMd,
    height: 60, // ≥ 56dp per PRD
    marginTop: 20,
    marginBottom: 16,
    // Elevation
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaButtonDisabled: {
    backgroundColor: Colors.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    fontSize: Theme.fontSize.md,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.8,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footerText: {
    fontSize: Theme.fontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 4,
  },
});