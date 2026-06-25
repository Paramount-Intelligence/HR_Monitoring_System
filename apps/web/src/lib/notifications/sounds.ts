import {
  getCurrentNotificationPreferences,
  type NotificationPreferences,
} from './notification-preferences';
import { shouldPlayOutgoingMessageSound } from './delivery';
import { playNotificationSound as playCallSound } from '@/lib/calls/sounds';

let userHasInteracted = false;

if (typeof window !== 'undefined') {
  const markInteracted = () => {
    userHasInteracted = true;
  };
  window.addEventListener('pointerdown', markInteracted, { once: true });
  window.addEventListener('keydown', markInteracted, { once: true });
}

export function canPlaySounds(): boolean {
  return userHasInteracted;
}

export function playIncomingMessageSound(preferences?: NotificationPreferences | null): void {
  const prefs = preferences ?? getCurrentNotificationPreferences();
  if (!canPlaySounds()) return;
  if (!prefs.incomingSoundEnabled) return;
  try {
    playCallSound('message');
  } catch {
    /* silent */
  }
}

export function playOutgoingMessageSound(preferences?: NotificationPreferences | null): void {
  const prefs = preferences ?? getCurrentNotificationPreferences();
  if (!canPlaySounds()) return;
  if (!shouldPlayOutgoingMessageSound(prefs)) return;
  try {
    playCallSound('message');
  } catch {
    /* silent */
  }
}

export function playCallNotificationSound(preferences?: NotificationPreferences | null): void {
  const prefs = preferences ?? getCurrentNotificationPreferences();
  if (!canPlaySounds()) return;
  if (!prefs.callNotificationsEnabled) return;
  try {
    playCallSound('call_incoming');
  } catch {
    /* silent */
  }
}
