import {
  notificationsApi,
  type NotificationPreferences as ApiNotificationPreferences,
} from '@/lib/api/notifications';
import { canFetchProtectedData } from '@/lib/auth/session';
import { logProtectedFetchError } from '@/lib/api/fetch-errors';

export type BannerMode = 'always' | 'app_open' | 'never';
export type TaskbarBadgeMode = 'always' | 'app_open' | 'never';

/** Canonical in-app notification preferences (camelCase). */
export type NotificationPreferences = {
  bannerMode: BannerMode;
  taskbarBadgeMode: TaskbarBadgeMode;
  showPreviews: boolean;
  outgoingSoundEnabled: boolean;
  incomingSoundEnabled: boolean;
  messageNotificationsEnabled: boolean;
  groupNotificationsEnabled: boolean;
  callNotificationsEnabled: boolean;
  taskNotificationsEnabled: boolean;
  approvalNotificationsEnabled: boolean;
  attendanceNotificationsEnabled: boolean;
  announcementNotificationsEnabled: boolean;
  mentionNotificationsEnabled: boolean;
  desktopNotificationsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  bannerMode: 'always',
  taskbarBadgeMode: 'always',
  showPreviews: true,
  outgoingSoundEnabled: false,
  incomingSoundEnabled: true,
  messageNotificationsEnabled: true,
  groupNotificationsEnabled: true,
  callNotificationsEnabled: true,
  taskNotificationsEnabled: true,
  approvalNotificationsEnabled: true,
  attendanceNotificationsEnabled: true,
  announcementNotificationsEnabled: true,
  mentionNotificationsEnabled: true,
  desktopNotificationsEnabled: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

const STORAGE_KEY = 'pims_notification_preferences_v1';
const PREFERENCES_CHANGED_EVENT = 'pims-notification-preferences-changed';

type PreferenceListener = (preferences: NotificationPreferences) => void;

let currentPreferences: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
let preferencesLoaded = false;
let preferencesLoading = false;
const listeners = new Set<PreferenceListener>();

function notifyListeners(): void {
  const snapshot = { ...currentPreferences };
  listeners.forEach((listener) => listener(snapshot));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PREFERENCES_CHANGED_EVENT));
  }
}

function readLocalPreferences(): NotificationPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...parsed };
  } catch {
    return null;
  }
}

function writeLocalPreferences(preferences: NotificationPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    /* ignore quota errors */
  }
}

export function fromApiPreferences(dto: ApiNotificationPreferences): NotificationPreferences {
  return {
    bannerMode: dto.banner_mode,
    taskbarBadgeMode: dto.taskbar_badge_mode,
    showPreviews: dto.show_previews,
    outgoingSoundEnabled: dto.outgoing_sound_enabled,
    incomingSoundEnabled: dto.incoming_sound_enabled,
    messageNotificationsEnabled: dto.message_notifications_enabled,
    groupNotificationsEnabled: dto.group_notifications_enabled,
    callNotificationsEnabled: dto.call_notifications_enabled,
    taskNotificationsEnabled: dto.task_notifications_enabled,
    approvalNotificationsEnabled: dto.approval_notifications_enabled,
    attendanceNotificationsEnabled: dto.attendance_notifications_enabled,
    announcementNotificationsEnabled: dto.announcement_notifications_enabled,
    mentionNotificationsEnabled: dto.mention_notifications_enabled,
    desktopNotificationsEnabled: dto.desktop_notifications_enabled,
    quietHoursEnabled: dto.quiet_hours_enabled,
    quietHoursStart: dto.quiet_hours_start,
    quietHoursEnd: dto.quiet_hours_end,
  };
}

export function toApiPreferences(
  preferences: Partial<NotificationPreferences>
): Partial<ApiNotificationPreferences> {
  const patch: Partial<ApiNotificationPreferences> = {};
  if (preferences.bannerMode !== undefined) patch.banner_mode = preferences.bannerMode;
  if (preferences.taskbarBadgeMode !== undefined) patch.taskbar_badge_mode = preferences.taskbarBadgeMode;
  if (preferences.showPreviews !== undefined) patch.show_previews = preferences.showPreviews;
  if (preferences.outgoingSoundEnabled !== undefined) {
    patch.outgoing_sound_enabled = preferences.outgoingSoundEnabled;
  }
  if (preferences.incomingSoundEnabled !== undefined) {
    patch.incoming_sound_enabled = preferences.incomingSoundEnabled;
  }
  if (preferences.messageNotificationsEnabled !== undefined) {
    patch.message_notifications_enabled = preferences.messageNotificationsEnabled;
  }
  if (preferences.groupNotificationsEnabled !== undefined) {
    patch.group_notifications_enabled = preferences.groupNotificationsEnabled;
  }
  if (preferences.callNotificationsEnabled !== undefined) {
    patch.call_notifications_enabled = preferences.callNotificationsEnabled;
  }
  if (preferences.taskNotificationsEnabled !== undefined) {
    patch.task_notifications_enabled = preferences.taskNotificationsEnabled;
  }
  if (preferences.approvalNotificationsEnabled !== undefined) {
    patch.approval_notifications_enabled = preferences.approvalNotificationsEnabled;
  }
  if (preferences.attendanceNotificationsEnabled !== undefined) {
    patch.attendance_notifications_enabled = preferences.attendanceNotificationsEnabled;
  }
  if (preferences.announcementNotificationsEnabled !== undefined) {
    patch.announcement_notifications_enabled = preferences.announcementNotificationsEnabled;
  }
  if (preferences.mentionNotificationsEnabled !== undefined) {
    patch.mention_notifications_enabled = preferences.mentionNotificationsEnabled;
  }
  if (preferences.desktopNotificationsEnabled !== undefined) {
    patch.desktop_notifications_enabled = preferences.desktopNotificationsEnabled;
  }
  if (preferences.quietHoursEnabled !== undefined) patch.quiet_hours_enabled = preferences.quietHoursEnabled;
  if (preferences.quietHoursStart !== undefined) patch.quiet_hours_start = preferences.quietHoursStart;
  if (preferences.quietHoursEnd !== undefined) patch.quiet_hours_end = preferences.quietHoursEnd;
  return patch;
}

/** Synchronous getter used by sound/notification runtime helpers. */
export function getCurrentNotificationPreferences(): NotificationPreferences {
  return currentPreferences;
}

export function areNotificationPreferencesLoaded(): boolean {
  return preferencesLoaded;
}

export function isNotificationPreferencesLoading(): boolean {
  return preferencesLoading;
}

export function subscribeNotificationPreferences(listener: PreferenceListener): () => void {
  listeners.add(listener);
  listener({ ...currentPreferences });
  return () => listeners.delete(listener);
}

/** Optimistic local update — persists to localStorage and notifies subscribers immediately. */
export function setNotificationPreferencesLocal(
  patch: Partial<NotificationPreferences>
): NotificationPreferences {
  currentPreferences = { ...currentPreferences, ...patch };
  writeLocalPreferences(currentPreferences);
  notifyListeners();
  return { ...currentPreferences };
}

export function resetNotificationPreferences(): void {
  currentPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  preferencesLoaded = false;
  preferencesLoading = false;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  notifyListeners();
}

/** Load from backend; fall back to localStorage then defaults. */
export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  if (!canFetchProtectedData()) {
    const local = readLocalPreferences();
    currentPreferences = local ?? { ...DEFAULT_NOTIFICATION_PREFERENCES };
    preferencesLoaded = true;
    notifyListeners();
    return { ...currentPreferences };
  }

  preferencesLoading = true;
  notifyListeners();

  try {
    const dto = await notificationsApi.getPreferences();
    currentPreferences = fromApiPreferences(dto);
    writeLocalPreferences(currentPreferences);
    preferencesLoaded = true;
    return { ...currentPreferences };
  } catch (err) {
    logProtectedFetchError('[notification-preferences] load failed, using local fallback', err);
    const local = readLocalPreferences();
    currentPreferences = local ?? { ...DEFAULT_NOTIFICATION_PREFERENCES };
    preferencesLoaded = true;
    return { ...currentPreferences };
  } finally {
    preferencesLoading = false;
    notifyListeners();
  }
}

/** Persist patch to backend; rollback local state on failure. */
export async function saveNotificationPreferences(
  patch: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const previous = { ...currentPreferences };
  const optimistic = setNotificationPreferencesLocal(patch);

  if (!canFetchProtectedData()) {
    return optimistic;
  }

  try {
    const dto = await notificationsApi.updatePreferences(toApiPreferences(patch));
    currentPreferences = fromApiPreferences(dto);
    writeLocalPreferences(currentPreferences);
    preferencesLoaded = true;
    notifyListeners();
    return { ...currentPreferences };
  } catch (err) {
    currentPreferences = previous;
    writeLocalPreferences(previous);
    notifyListeners();
    throw err;
  }
}

/** Bootstrap from localStorage on module load (client only). */
if (typeof window !== 'undefined') {
  const local = readLocalPreferences();
  if (local) {
    currentPreferences = local;
  }
}
