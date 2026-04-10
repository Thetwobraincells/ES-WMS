import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';

import { Colors, Theme } from '../../theme/colors';
import type { DriverRouteStackParams } from '../../navigation/DriverStack';
import { useRouteStore } from '../../stores/routeStore';

type NavProp = NativeStackNavigationProp<DriverRouteStackParams, 'CameraProof'>;
type RoutePropT = RouteProp<DriverRouteStackParams, 'CameraProof'>;

type DeviceCoords = {
  lat: number;
  lng: number;
};

const GEOFENCE_RADIUS_METERS = 50;
const EARTH_RADIUS_METERS = 6_371_000;

function haversineDistance(from: DeviceCoords, to: DeviceCoords): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ViewfinderBrackets() {
  const size = 32;
  const thickness = 3;

  return (
    <View style={vfS.frame} pointerEvents="none">
      <View
        style={[
          vfS.bracket,
          { top: 0, left: 0, borderTopWidth: thickness, borderLeftWidth: thickness },
        ]}
      />
      <View
        style={[
          vfS.bracket,
          { top: 0, right: 0, borderTopWidth: thickness, borderRightWidth: thickness },
        ]}
      />
      <View
        style={[
          vfS.bracket,
          { bottom: 0, left: 0, borderBottomWidth: thickness, borderLeftWidth: thickness },
        ]}
      />
      <View
        style={[
          vfS.bracket,
          { bottom: 0, right: 0, borderBottomWidth: thickness, borderRightWidth: thickness },
        ]}
      />
      <View style={vfS.centerDot} />
    </View>
  );
}

const vfS = StyleSheet.create({
  frame: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: '20%',
    bottom: '35%',
    borderRadius: 2,
  },
  bracket: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: Colors.white,
  },
  centerDot: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.white,
    backgroundColor: 'transparent',
  },
});

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let currentValue = 0;
    const timer = setInterval(() => {
      currentValue += 1.5;
      if (currentValue >= confidence) {
        setDisplayed(confidence);
        clearInterval(timer);
      } else {
        setDisplayed(Number(currentValue.toFixed(1)));
      }
    }, 20);

    return () => clearInterval(timer);
  }, [confidence]);

  return (
    <View style={confS.wrapper} pointerEvents="none">
      <View style={confS.label}>
        <Text style={confS.title}>AI CONFIDENCE</Text>
        <Text style={confS.value}>{displayed.toFixed(1)}%</Text>
      </View>
    </View>
  );
}

const confS = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  label: { alignItems: 'center' },
  title: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 1,
    opacity: 0.8,
  },
  value: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.green,
  },
});

export default function CameraProof() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropT>();

  const stopId = route.params?.stopId ?? '';
  const stops = useRouteStore(s => s.stops);
  const uploadPhoto = useRouteStore(s => s.uploadPhoto);
  const completeStop = useRouteStore(s => s.completeStop);

  const stop = stops.find(s => s.id === stopId);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [flashOn, setFlashOn] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<DeviceCoords | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);

  const cameraRef = useRef<CameraView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const calibAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(calibAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(calibAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [calibAnim]);

  const refreshLocation = async (): Promise<DeviceCoords | null> => {
    if (!stop) {
      return null;
    }

    setLocationLoading(true);
    setLocationError(null);

    try {
      let permissionResult = await Location.getForegroundPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        permissionResult = await Location.requestForegroundPermissionsAsync();
      }

      const granted = permissionResult.status === 'granted';
      setLocationGranted(granted);

      if (!granted) {
        setCurrentCoords(null);
        setDistanceMeters(null);
        setLocationError('Location permission is required for geofence validation.');
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      const distance = Number(
        haversineDistance(coords, { lat: stop.lat, lng: stop.lng }).toFixed(1),
      );

      setCurrentCoords(coords);
      setDistanceMeters(distance);

      return coords;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to determine your current location.';
      setLocationError(message);
      return null;
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    if (cameraPermission?.granted && stop) {
      void refreshLocation();
    }
  }, [cameraPermission?.granted, stop?.id]);

  if (!stop) {
    return (
      <View style={permS.root}>
        <Ionicons name="alert-circle-outline" size={56} color={Colors.warning} />
        <Text style={permS.title}>Stop Not Found</Text>
        <Text style={permS.body}>
          This assignment is no longer available. Return to the route list and try again.
        </Text>
        <TouchableOpacity style={permS.btn} onPress={() => navigation.goBack()}>
          <Text style={permS.btnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const geofenceOk =
    typeof distanceMeters === 'number' && distanceMeters <= GEOFENCE_RADIUS_METERS;

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) {
      return;
    }

    const latestCoords = await refreshLocation();
    if (!latestCoords) {
      Alert.alert(
        'Location Required',
        locationError ?? 'Turn on location access so the app can validate you are at the stop.',
      );
      return;
    }

    const latestDistance = haversineDistance(latestCoords, { lat: stop.lat, lng: stop.lng });
    if (latestDistance > GEOFENCE_RADIUS_METERS) {
      Alert.alert(
        'Out Of Range',
        `You are ${Math.round(latestDistance)} metres from this stop. Move closer and try again.`,
      );
      return;
    }

    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();

    setCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
        exif: true,
        skipProcessing: Platform.OS === 'android',
      });

      if (!photo?.uri) {
        throw new Error('Unable to capture image.');
      }

      await uploadPhoto(stop.id, photo.uri, latestCoords.lat, latestCoords.lng);
      await completeStop(stop.id);

      navigation.goBack();
      navigation.goBack();

      Alert.alert('Success', 'Proof of work saved. Stop marked as complete.', [{ text: 'Great!' }]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not upload photo. Please try again.';
      Alert.alert('Capture Failed', message);
    } finally {
      setCapturing(false);
    }
  };

  if (!cameraPermission) {
    return (
      <View style={permS.root}>
        <ActivityIndicator color={Colors.navyDark} />
        <Text style={permS.text}>Checking camera permission...</Text>
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={permS.root}>
        <Ionicons name="camera-outline" size={56} color={Colors.textMuted} />
        <Text style={permS.title}>Camera Access Required</Text>
        <Text style={permS.body}>
          ES-WMS needs camera access to capture proof-of-work photos.
        </Text>
        <TouchableOpacity style={permS.btn} onPress={requestCameraPermission}>
          <Text style={permS.btnText}>Grant Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={permS.backLink} onPress={() => navigation.goBack()}>
          <Text style={permS.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flashOn}
      />

      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={24} color={Colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.calibPill, locationLoading && s.calibPillMuted]}
          activeOpacity={1}
        >
          <Animated.View style={[s.calibDot, { opacity: calibAnim }]} />
          <Text style={s.calibText}>{locationLoading ? 'SYNCING GPS' : 'LIVE CALIBRATION'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.iconBtn, flashOn && s.iconBtnActive]}
          onPress={() => setFlashOn(value => !value)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={flashOn ? 'flashlight' : 'flashlight-outline'}
            size={22}
            color={flashOn ? Colors.warning : Colors.white}
          />
        </TouchableOpacity>
      </View>

      <ViewfinderBrackets />

      {locationGranted === false || (distanceMeters !== null && !geofenceOk) ? (
        <View style={s.geofenceWarn}>
          <Ionicons name="location-outline" size={16} color={Colors.danger} />
          <Text style={s.geofenceWarnText}>
            {locationGranted === false
              ? 'LOCATION ACCESS NEEDED'
              : `OUT OF RANGE - ${Math.round(distanceMeters ?? 0)}m FROM STOP`}
          </Text>
        </View>
      ) : null}

      <View style={[s.bottomOverlay, { paddingBottom: insets.bottom + 16 }]}>
        <View style={s.locationBanner}>
          <Text style={s.locationLabel}>LOCATION</Text>
          <Text style={s.locationValue}>{stop.society?.name ?? 'Unknown Society'}</Text>
        </View>

        <View style={s.contentBanner}>
          <View>
            <Text style={s.contentLabel}>CONTENT TYPE</Text>
            <Text style={s.contentValue}>{stop.bin_type}</Text>
          </View>
          <Text style={s.alignHint}>ALIGN BIN TO CENTER</Text>
        </View>

        <TouchableOpacity
          style={[s.gpsBanner, geofenceOk ? s.gpsBannerOk : s.gpsBannerWarn]}
          onPress={() => {
            void refreshLocation();
          }}
          activeOpacity={0.85}
        >
          <Ionicons
            name={geofenceOk ? 'locate' : 'locate-outline'}
            size={18}
            color={geofenceOk ? Colors.green : Colors.warning}
          />
          <View style={s.gpsTextWrap}>
            <Text style={s.gpsLabel}>GPS STATUS</Text>
            <Text style={s.gpsValue}>
              {locationLoading
                ? 'Checking your distance to the stop...'
                : distanceMeters !== null
                  ? `${Math.round(distanceMeters)}m from stop`
                  : locationError ?? 'Tap to refresh location'}
            </Text>
          </View>
          <Ionicons name="refresh" size={18} color={Colors.white} />
        </TouchableOpacity>

        <View style={s.captureRow}>
          <View style={s.captureFlank} />

          <Animated.View style={[s.shutterOuter, { transform: [{ scale: pulseAnim }] }]}>
            <TouchableOpacity
              style={[s.shutterInner, capturing && s.shutterCapturing]}
              onPress={handleCapture}
              disabled={capturing || locationLoading}
              activeOpacity={0.85}
            >
              {capturing ? (
                <Ionicons name="hourglass-outline" size={28} color={Colors.navyDark} />
              ) : (
                <View style={s.shutterCore} />
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={s.captureFlank}>
            <ConfidenceMeter confidence={98.4} />
          </View>
        </View>
      </View>
    </View>
  );
}

const permS = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.navyDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: Colors.textOnDarkMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  text: {
    fontSize: 14,
    color: Colors.textOnDarkMuted,
  },
  btn: {
    backgroundColor: Colors.green,
    borderRadius: Theme.radiusMd,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginTop: 8,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  backLink: {
    marginTop: 8,
  },
  backLinkText: {
    fontSize: 14,
    color: Colors.textOnDarkMuted,
  },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.black },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  iconBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnActive: { backgroundColor: 'rgba(245,158,11,0.3)' },
  calibPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.green,
    borderRadius: Theme.radiusFull,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  calibPillMuted: {
    backgroundColor: Colors.navyLight,
  },
  calibDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  calibText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 1,
  },
  geofenceWarn: {
    position: 'absolute',
    top: '18%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.dangerMuted,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  geofenceWarnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.danger,
    letterSpacing: 0.5,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  locationBanner: {
    backgroundColor: Colors.navyDark,
    borderRadius: Theme.radiusSm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    minWidth: '60%',
  },
  locationLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textOnDarkMuted,
    letterSpacing: 1.5,
  },
  locationValue: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.white,
  },
  contentBanner: {
    backgroundColor: Colors.skipWarning,
    borderRadius: Theme.radiusSm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    minWidth: '60%',
  },
  contentLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.skipOrange,
    letterSpacing: 1.5,
  },
  contentValue: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.white,
  },
  alignHint: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  gpsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Theme.radiusSm,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  gpsBannerOk: {
    backgroundColor: 'rgba(13, 27, 42, 0.92)',
  },
  gpsBannerWarn: {
    backgroundColor: 'rgba(146, 64, 14, 0.94)',
  },
  gpsTextWrap: {
    flex: 1,
  },
  gpsLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textOnDarkMuted,
    letterSpacing: 1.5,
  },
  gpsValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
    marginTop: 3,
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  captureFlank: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterCapturing: {
    backgroundColor: Colors.surfaceGrey,
  },
  shutterCore: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.surfaceGrey,
  },
});
