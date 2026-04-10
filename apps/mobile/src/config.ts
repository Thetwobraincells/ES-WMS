import Constants from 'expo-constants';

let API_URL = 'http://10.189.75.134:5050/api/v1'; // Fallback

// Auto-detect the local IP when using Expo Go on a LAN
if (__DEV__ && Constants.expoConfig?.hostUri) {
  const hostIp = Constants.expoConfig.hostUri.split(':')[0];
  API_URL = `http://${hostIp}:5050/api/v1`;
}

/**
 * ES-WMS Mobile App Configuration
 */
export const Config = {
  /** Base URL for the backend API — auto-detects LAN IP in dev */
  API_BASE_URL: API_URL,

  /** HTTP request timeout in milliseconds */
  API_TIMEOUT: 15_000,

  /** Max photo upload size in MB */
  MAX_PHOTO_SIZE_MB: 10,
} as const;
