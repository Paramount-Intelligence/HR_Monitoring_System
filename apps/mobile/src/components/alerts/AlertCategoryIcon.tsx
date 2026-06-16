import type { Ionicons } from '@expo/vector-icons';
import type { AlertCategory } from '../../types/alert';

export function getAlertCategoryIcon(category: AlertCategory): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case 'attendance':
      return 'time-outline';
    case 'projects':
      return 'briefcase-outline';
    case 'tasks':
      return 'checkbox-outline';
    case 'leave':
    case 'approvals':
      return 'document-text-outline';
    case 'messages':
      return 'chatbubble-outline';
    case 'calls':
      return 'call-outline';
    case 'system':
      return 'megaphone-outline';
    default:
      return 'notifications-outline';
  }
}
