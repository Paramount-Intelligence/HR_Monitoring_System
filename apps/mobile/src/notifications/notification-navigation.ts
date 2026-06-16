import { router } from 'expo-router';
import { getAlertRouteTarget } from '../utils/alert-adapters';

export interface NotificationNavigationPayload {
  type?: string;
  notification_id?: string;
  conversation_id?: string;
  message_id?: string;
  call_id?: string;
  screen?: string;
  entity_type?: string;
  entity_id?: string;
}

let pendingNavigation: NotificationNavigationPayload | null = null;

export function setPendingNotificationNavigation(
  payload: NotificationNavigationPayload | null
): void {
  pendingNavigation = payload;
}

export function consumePendingNotificationNavigation(): NotificationNavigationPayload | null {
  const next = pendingNavigation;
  pendingNavigation = null;
  return next;
}

export function navigateFromNotificationPayload(
  payload: NotificationNavigationPayload | undefined | null
): void {
  if (!payload) return;

  const type = payload.type ?? payload.screen;

  if ((type === 'message' || payload.conversation_id) && payload.conversation_id) {
    router.push({
      pathname: '/chat/[conversationId]',
      params: { conversationId: payload.conversation_id },
    });
    return;
  }

  if (type === 'incoming_call' && payload.conversation_id) {
    router.push({
      pathname: '/chat/[conversationId]',
      params: { conversationId: payload.conversation_id },
    });
    return;
  }

  if (type === 'notification' || payload.notification_id) {
    router.push('/alerts');
    return;
  }

  if (payload.screen === 'attendance' || payload.entity_type === 'attendance_session') {
    router.push('/(tabs)/attendance');
    return;
  }

  const entityRoute = getAlertRouteTarget(
    payload.entity_type,
    payload.entity_id,
    payload.type
  );
  if (entityRoute) {
    router.push(entityRoute as never);
    return;
  }

  if (payload.screen === 'profile') {
    router.push('/(tabs)/profile');
    return;
  }

  router.push('/(tabs)');
}

export function handleNotificationResponseData(
  data: Record<string, unknown> | undefined
): void {
  if (!data) return;
  const payload: NotificationNavigationPayload = {
    type: typeof data.type === 'string' ? data.type : undefined,
    notification_id:
      typeof data.notification_id === 'string' ? data.notification_id : undefined,
    conversation_id:
      typeof data.conversation_id === 'string' ? data.conversation_id : undefined,
    message_id: typeof data.message_id === 'string' ? data.message_id : undefined,
    call_id: typeof data.call_id === 'string' ? data.call_id : undefined,
    screen: typeof data.screen === 'string' ? data.screen : undefined,
    entity_type: typeof data.entity_type === 'string' ? data.entity_type : undefined,
    entity_id: typeof data.entity_id === 'string' ? data.entity_id : undefined,
  };
  navigateFromNotificationPayload(payload);
}
