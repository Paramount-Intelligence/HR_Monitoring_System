import Constants from 'expo-constants';

import {
  PRODUCTION_API_BASE_URL,
  PRODUCTION_WS_BASE_URL,
} from '../../config/production-urls.js';

/** Public API base — no secrets. Override via EXPO_PUBLIC_API_BASE_URL. */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  PRODUCTION_API_BASE_URL;

/** Public WebSocket base — no secrets. Override via EXPO_PUBLIC_WS_URL. */
export const WS_BASE_URL =
  process.env.EXPO_PUBLIC_WS_URL ??
  (Constants.expoConfig?.extra?.wsUrl as string | undefined) ??
  PRODUCTION_WS_BASE_URL;

/** @deprecated Use WS_BASE_URL */
export const WS_URL = WS_BASE_URL;

export const APP_NAME = 'PIMS';
export const APP_TAGLINE = 'Workforce Intelligence & Execution OS';

/** Runtime environment label from EAS build or dev. */
export const APP_ENV =
  process.env.EXPO_PUBLIC_APP_ENV ??
  (Constants.expoConfig?.extra?.environment as string | undefined) ??
  (__DEV__ ? 'development' : 'production');

export const IS_PRODUCTION_BUILD = APP_ENV === 'production';
