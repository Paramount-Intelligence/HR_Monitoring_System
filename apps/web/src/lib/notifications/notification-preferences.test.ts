import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  fromApiPreferences,
  getCurrentNotificationPreferences,
  setNotificationPreferencesLocal,
  toApiPreferences,
} from './notification-preferences.ts';
import {
  isWithinQuietHours,
  shouldPlayOutgoingMessageSound,
  shouldPlayIncomingNotificationSound,
  shouldShowBanner,
} from './delivery.ts';
import { resolveNotificationBody } from './browserNotifications.ts';

describe('notification preferences store', () => {
  it('maps API dto to canonical camelCase preferences', () => {
    const prefs = fromApiPreferences({
      banner_mode: 'app_open',
      taskbar_badge_mode: 'never',
      show_previews: false,
      outgoing_sound_enabled: true,
      incoming_sound_enabled: false,
      message_notifications_enabled: true,
      group_notifications_enabled: true,
      call_notifications_enabled: true,
      task_notifications_enabled: true,
      approval_notifications_enabled: true,
      attendance_notifications_enabled: true,
      leave_notifications_enabled: true,
      announcement_notifications_enabled: true,
      mention_notifications_enabled: true,
      desktop_notifications_enabled: false,
      quiet_hours_enabled: true,
      quiet_hours_start: '22:00:00',
      quiet_hours_end: '07:00:00',
    });
    assert.equal(prefs.bannerMode, 'app_open');
    assert.equal(prefs.outgoingSoundEnabled, true);
    assert.equal(prefs.incomingSoundEnabled, false);
  });

  it('maps canonical patch back to API dto', () => {
    const patch = toApiPreferences({ outgoingSoundEnabled: false, showPreviews: true });
    assert.equal(patch.outgoing_sound_enabled, false);
    assert.equal(patch.show_previews, true);
  });

  it('updates runtime store immediately on local patch', () => {
    setNotificationPreferencesLocal({ outgoingSoundEnabled: true });
    assert.equal(getCurrentNotificationPreferences().outgoingSoundEnabled, true);
    setNotificationPreferencesLocal(DEFAULT_NOTIFICATION_PREFERENCES);
  });
});

describe('notification delivery helpers', () => {
  it('outgoing sound OFF suppresses send sound gate', () => {
    const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, outgoingSoundEnabled: false };
    assert.equal(shouldPlayOutgoingMessageSound(prefs), false);
  });

  it('outgoing sound ON allows send sound gate when not in quiet hours', () => {
    const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, outgoingSoundEnabled: true };
    assert.equal(shouldPlayOutgoingMessageSound(prefs), true);
  });

  it('incoming sound OFF suppresses notification sound gate', () => {
    const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, incomingSoundEnabled: false };
    const allowed = shouldPlayIncomingNotificationSound(prefs, {
      notification_type: 'message',
      related_entity_type: 'conversation',
      category: 'messages',
    });
    assert.equal(allowed, false);
  });

  it('messages OFF suppresses DM banner', () => {
    const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, messageNotificationsEnabled: false };
    const allowed = shouldShowBanner(
      prefs,
      {
        notification_type: 'message',
        related_entity_type: 'conversation',
        category: 'messages',
      },
      true,
      'direct'
    );
    assert.equal(allowed, false);
  });

  it('showPreviews OFF masks browser notification body', () => {
    const body = resolveNotificationBody(
      'New message from Alex',
      'Alex: secret text',
      { ...DEFAULT_NOTIFICATION_PREFERENCES, showPreviews: false },
      'message'
    );
    assert.equal(body, 'New message');
    assert.equal(body.includes('secret'), false);
  });

  it('quiet hours suppresses sounds overnight', () => {
    const prefs = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      outgoingSoundEnabled: true,
    };
    assert.equal(isWithinQuietHours(prefs, new Date('2026-06-09T23:00:00')), true);
    assert.equal(isWithinQuietHours(prefs, new Date('2026-06-09T06:30:00')), true);
    assert.equal(isWithinQuietHours(prefs, new Date('2026-06-09T12:00:00')), false);
    assert.equal(shouldPlayOutgoingMessageSound(prefs), false);
  });
});
