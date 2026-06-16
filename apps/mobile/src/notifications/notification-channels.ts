import { Platform } from 'react-native';
import { secureLog } from '../utils/secure-log';

/** Android notification channel IDs — backend push payloads should reference these. */
export const NOTIFICATION_CHANNELS = {
  DEFAULT: 'default',
  ALERTS: 'alerts',
  MESSAGES: 'messages',
  INCOMING_CALLS: 'incoming-calls',
} as const;

export type NotificationChannelId =
  (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS];

let channelsReady = false;

/**
 * Creates Android notification channels before push token registration.
 * Safe to call multiple times; runs once per app session on Android.
 */
export async function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android' || channelsReady) return;

  try {
    const Notifications = await import('expo-notifications');
    const {
      AndroidImportance,
      AndroidNotificationVisibility,
      AndroidAudioUsage,
      AndroidAudioContentType,
    } = Notifications;

    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.DEFAULT, {
      name: 'General',
      description: 'Default notifications from PIMS',
      importance: AndroidImportance.DEFAULT,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 250, 250, 250],
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.ALERTS, {
      name: 'Alerts',
      description: 'Workforce alerts and important updates',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 300, 200, 300],
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.MESSAGES, {
      name: 'Messages',
      description: 'New chat messages',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 200, 100, 200],
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.INCOMING_CALLS, {
      name: 'Incoming calls',
      description: 'Incoming voice and video calls',
      importance: AndroidImportance.MAX,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 800, 400, 800, 400, 800],
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
      showBadge: false,
      audioAttributes: {
        usage: AndroidAudioUsage.NOTIFICATION_RINGTONE,
        contentType: AndroidAudioContentType.SONIFICATION,
      },
    });

    channelsReady = true;
    secureLog('PUSH_MOBILE', 'notification_channels_ready');
  } catch {
    secureLog('PUSH_MOBILE', 'notification_channels_setup_skipped');
  }
}
