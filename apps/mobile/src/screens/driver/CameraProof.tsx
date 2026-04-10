// File: es-wms/apps/mobile/src/screens/driver/CameraProof.tsx

/**
 * CameraProof — Geotagged Photo Capture (Screen 4 reference)
 *
 * PRD requirements:
 *   FR-DRV-09: Photo must be taken from within the app (no gallery)
 *   FR-DRV-10: Auto-tagged with GPS, timestamp, vehicle ID, driver ID, stop ID
 *   FR-DRV-11: Blocked if device GPS > 50m from stop coordinates
 *
 * UI elements (matching Screen 4):
 *   • Full-screen camera viewfinder (expo-camera)
 *   • Corner bracket overlay (targeting frame)
 *   • "LIVE CALIBRATION" green pill (top center)
 *   • X close button (top left) + Flashlight toggle (top right)
 *   • LOCATION banner (navy) — society name
 *   • CONTENT TYPE banner (brown) — waste type + "ALIGN BIN TO CENTER"
 *   • Circular capture button (bottom center)
 *   • AI CONFIDENCE meter (bottom right) — mock 98.4%
 *
 * Geofence: mock always-valid in Phase 2. Real check in Phase 3.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';

import { Colors, Theme } from '../../theme/colors';
import type { DriverRouteStackParams } from '../../navigation/DriverStack';
import { useRouteStore } from '../../stores/routeStore';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

type NavProp    = NativeStackNavigationProp<DriverRouteStackParams, 'CameraProof'>;
type RoutePropT = RouteProp<DriverRouteStackParams, 'CameraProof'>;

// ─── Corner Brackets Overlay ──────────────────────────────────────────────────

function ViewfinderBrackets() {
  const SIZE  = 32;
  const THICK = 3;
  const COLOR = Colors.white;
  const bracketStyle = (pos: object): object => ({
    position:    'absolute',
    width:       SIZE,
    height:      SIZE,
    borderColor: COLOR,
  });

  return (
    <View style={vfS.frame} pointerEvents="none">
      {/* Top-left */}
      <View style={[vfS.bracket, { top: 0, left: 0,
        borderTopWidth: THICK, borderLeftWidth: THICK }]} />
      {/* Top-right */}
      <View style={[vfS.bracket, { top: 0, right: 0,
        borderTopWidth: THICK, borderRightWidth: THICK }]} />
      {/* Bottom-left */}
      <View style={[vfS.bracket, { bottom: 0, left: 0,
        borderBottomWidth: THICK, borderLeftWidth: THICK }]} />
      {/* Bottom-right */}
      <View style={[vfS.bracket, { bottom: 0, right: 0,
        borderBottomWidth: THICK, borderRightWidth: THICK }]} />
      {/* Center dot */}
      <View style={vfS.centerDot} />
    </View>
  );
}

const vfS = StyleSheet.create({
  frame: {
    position: 'absolute',
    left:   '10%', right:  '10%',
    top:    '20%', bottom: '35%',
    borderRadius: 2,
  },
  bracket: {
    position: 'absolute',
    width:    32, height: 32,
    borderColor: Colors.white,
  },
  centerDot: {
    position:        'absolute',
    alignSelf:       'center',
    top:             '50%',
    marginTop:       -5,
    width:           10,
    height:          10,
    borderRadius:    5,
    borderWidth:     1.5,
    borderColor:     Colors.white,
    backgroundColor: 'transparent',
  },
});

// ─── AI Confidence Display ────────────────────────────────────────────────────

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let n = 0;
    const timer = setInterval(() => {
      n += 1.5;
      if (n >= confidence) { setDisplayed(confidence); clearInterval(timer); }
      else setDisplayed(parseFloat(n.toFixed(1)));
    }, 20);
    return () => clearInterval(timer);
  }, [confidence]);

  return (
    <View style={confS.wrapper} pointerEvents="none">
      {/* Capture button placeholder space */}
      <View style={confS.label}>
        <Text style={confS.title}>AI CONFIDENCE</Text>
        <Text style={confS.value}>{displayed.toFixed(1)}%</Text>
      </View>
    </View>
  );
}

const confS = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  label:   { alignItems: 'center' },
  title:   { fontSize: 10, fontWeight: '700', color: Colors.white,
             letterSpacing: 1, opacity: 0.8 },
  value:   { fontSize: 22, fontWeight: '900', color: Colors.green },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CameraProof() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route      = useRoute<RoutePropT>();

  const stopId   = route.params?.stopId ?? 'stop-001';
  
  // Use real data from routeStore
  const stops       = useRouteStore(s => s.stops);
  const uploadPhoto = useRouteStore(s => s.uploadPhoto);
  const completeStop = useRouteStore(s => s.completeStop);
  
  const stop = stops.find(s => s.id === stopId);

  const [permission, requestPermission] = useCameraPermissions();
  const [flashOn,    setFlashOn]        = useState(false);
  const [capturing,  setCapturing]      = useState(false);
  const [geofenceOk] = useState(true);   // Mock: always valid. Phase 3: real GPS check.

  const cameraRef  = useRef<CameraView>(null);

  // Capture button pulse
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const calibAnim  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Calibration dot pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(calibAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(calibAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const handleCapture = async () => {
    if (!geofenceOk) {
      Alert.alert(
        'Out of Range',
        'You are more than 50 metres from this stop. Move closer to capture proof.',
        [{ text: 'OK' }],
      );
      return;
    }

    if (!cameraRef.current || capturing || !stop) return;

    // Button press animation
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();

    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality:     0.7,
        base64:      false,
        exif:        true,
        skipProcessing: Platform.OS === 'android',
      });
      
      if (photo?.uri) {
        // Upload photo with simulated GPS coordinates
        await uploadPhoto(stop.id, photo.uri, stop.lat, stop.lng);
        // Mark stop as complete
        await completeStop(stop.id);
        
        // Go back (might go back to route overview or stop detail)
        navigation.goBack();
        navigation.goBack(); // go back twice to get out of stop detail to route overview
        Alert.alert('Success', 'Proof of work saved. Stop marked as complete.', [{ text: 'Great!' }]);
      } else {
         throw new Error("Unable to capture Image");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not upload photo. Please try again.';
      Alert.alert('Capture Failed', msg);
    } finally {
      setCapturing(false);
    }
  };

  // ── Permission gate ────────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={permS.root}>
        <ActivityIndicator color={Colors.navyDark} />
        <Text style={permS.text}>Checking camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={permS.root}>
        <Ionicons name="camera-outline" size={56} color={Colors.textMuted} />
        <Text style={permS.title}>Camera Access Required</Text>
        <Text style={permS.body}>
          ES-WMS needs camera access to capture proof-of-work photos.
        </Text>
        <TouchableOpacity style={permS.btn} onPress={requestPermission}>
          <Text style={permS.btnText}>Grant Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={permS.backLink} onPress={() => navigation.goBack()}>
          <Text style={permS.backLinkText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main camera UI ─────────────────────────────────────────────────────────
  return (
    <View style={s.root}>

      {/* ── Full-screen camera ── */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flashOn}
      />

      {/* ── Dark overlay (top controls zone) ── */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        {/* Close */}
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}
          hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
          <Ionicons name="close" size={24} color={Colors.white} />
        </TouchableOpacity>

        {/* Live calibration pill */}
        <TouchableOpacity style={s.calibPill} activeOpacity={1}>
          <Animated.View style={[s.calibDot, { opacity: calibAnim }]} />
          <Text style={s.calibText}>LIVE CALIBRATION</Text>
        </TouchableOpacity>

        {/* Flash toggle */}
        <TouchableOpacity style={[s.iconBtn, flashOn && s.iconBtnActive]}
          onPress={() => setFlashOn(v => !v)}
          hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
          <Ionicons
            name={flashOn ? 'flashlight' : 'flashlight-outline'}
            size={22}
            color={flashOn ? Colors.warning : Colors.white}
          />
        </TouchableOpacity>
      </View>

      {/* ── Viewfinder bracket overlay ── */}
      <ViewfinderBrackets />

      {/* ── Geofence warning (if invalid) ── */}
      {!geofenceOk && (
        <View style={s.geofenceWarn}>
          <Ionicons name="location-outline" size={16} color={Colors.danger} />
          <Text style={s.geofenceWarnText}>OUT OF RANGE — Move closer to stop</Text>
        </View>
      )}

      {/* ── Bottom overlay: banners + capture ── */}
      <View style={[s.bottomOverlay, { paddingBottom: insets.bottom + 16 }]}>

        {/* Location banner */}
        <View style={s.locationBanner}>
          <Text style={s.locationLabel}>LOCATION</Text>
          <Text style={s.locationValue}>{stop?.society?.name ?? 'Unknown Society'}</Text>
        </View>

        {/* Content type banner */}
        <View style={s.contentBanner}>
          <View>
            <Text style={s.contentLabel}>CONTENT TYPE</Text>
            <Text style={s.contentValue}>{stop?.bin_type ?? 'UNKNOWN'}</Text>
          </View>
          <Text style={s.alignHint}>ALIGN BIN TO CENTER</Text>
        </View>

        {/* Capture row: confidence + button */}
        <View style={s.captureRow}>
          {/* Spacer left */}
          <View style={s.captureFlank} />

          {/* Shutter button */}
          <Animated.View style={[s.shutterOuter, { transform: [{ scale: pulseAnim }] }]}>
            <TouchableOpacity
              style={[s.shutterInner, capturing && s.shutterCapturing]}
              onPress={handleCapture}
              disabled={capturing}
              activeOpacity={0.85}
            >
              {capturing
                ? <Ionicons name="hourglass-outline" size={28} color={Colors.navyDark} />
                : <View style={s.shutterCore} />
              }
            </TouchableOpacity>
          </Animated.View>

          {/* AI Confidence */}
          <View style={s.captureFlank}>
            <ConfidenceMeter confidence={98.4} />
          </View>
        </View>

      </View>
    </View>
  );
}

// ─── Permission screen styles ─────────────────────────────────────────────────
const permS = StyleSheet.create({
  root:     { flex: 1, backgroundColor: Colors.navyDark,
              justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  title:    { fontSize: 20, fontWeight: '800', color: Colors.white, textAlign: 'center' },
  body:     { fontSize: 14, color: Colors.textOnDarkMuted, textAlign: 'center', lineHeight: 22 },
  text:     { fontSize: 14, color: Colors.textOnDarkMuted },
  btn:      { backgroundColor: Colors.green, borderRadius: Theme.radiusMd,
              paddingHorizontal: 32, paddingVertical: 16, marginTop: 8 },
  btnText:  { fontSize: 15, fontWeight: '700', color: Colors.white },
  backLink: { marginTop: 8 },
  backLinkText: { fontSize: 14, color: Colors.textOnDarkMuted },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.black },

  // Top bar
  topBar: {
    position:        'absolute',
    top:             0, left: 0, right: 0,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: 16,
    paddingBottom:   12,
    zIndex:          10,
  },
  iconBtn: {
    width:           52, height: 52,
    borderRadius:    12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent:  'center',
    alignItems:      'center',
  },
  iconBtnActive: { backgroundColor: 'rgba(245,158,11,0.3)' },

  // Calibration pill
  calibPill: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
    backgroundColor: Colors.green,
    borderRadius:    Theme.radiusFull,
    paddingHorizontal: 16,
    paddingVertical:  8,
  },
  calibDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.white,
  },
  calibText: {
    fontSize:   12,
    fontWeight: '700',
    color:      Colors.white,
    letterSpacing: 1,
  },

  // Geofence warning
  geofenceWarn: {
    position:        'absolute',
    top:             '18%',
    alignSelf:       'center',
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    backgroundColor: Colors.dangerMuted,
    borderRadius:    8,
    paddingHorizontal: 14,
    paddingVertical:  8,
    borderWidth:     1,
    borderColor:     Colors.danger,
  },
  geofenceWarnText: {
    fontSize:   12,
    fontWeight: '700',
    color:      Colors.danger,
    letterSpacing: 0.5,
  },

  // Bottom overlay
  bottomOverlay: {
    position:  'absolute',
    bottom:    0, left: 0, right: 0,
    gap:       8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // Location banner
  locationBanner: {
    backgroundColor: Colors.navyDark,
    borderRadius:    Theme.radiusSm,
    paddingHorizontal: 14,
    paddingVertical:   10,
    alignSelf:       'flex-start',
    minWidth:        '60%',
  },
  locationLabel: { fontSize: 9,  fontWeight: '700', color: Colors.textOnDarkMuted, letterSpacing: 1.5 },
  locationValue: { fontSize: 22, fontWeight: '900', color: Colors.white },

  // Content type banner
  contentBanner: {
    backgroundColor: Colors.skipWarning,
    borderRadius:    Theme.radiusSm,
    paddingHorizontal: 14,
    paddingVertical:   10,
    alignSelf:       'flex-start',
    minWidth:        '60%',
  },
  contentLabel: { fontSize: 9,  fontWeight: '700', color: Colors.skipOrange, letterSpacing: 1.5 },
  contentValue: { fontSize: 22, fontWeight: '900', color: Colors.white },
  alignHint:    { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)',
                  letterSpacing: 0.5, marginTop: 4 },

  // Capture row
  captureRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginTop:      8,
  },
  captureFlank: {
    width:          80,
    alignItems:     'center',
    justifyContent: 'center',
  },

  // Shutter button
  shutterOuter: {
    width:           84,
    height:          84,
    borderRadius:    42,
    borderWidth:     3,
    borderColor:     Colors.white,
    justifyContent:  'center',
    alignItems:      'center',
  },
  shutterInner: {
    width:           70,
    height:          70,
    borderRadius:    35,
    backgroundColor: Colors.white,
    justifyContent:  'center',
    alignItems:      'center',
  },
  shutterCapturing: {
    backgroundColor: Colors.surfaceGrey,
  },
  shutterCore: {
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: Colors.white,
    borderWidth:     2,
    borderColor:     Colors.surfaceGrey,
  },
});