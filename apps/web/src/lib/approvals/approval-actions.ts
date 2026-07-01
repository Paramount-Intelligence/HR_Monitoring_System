import type { ApprovalCenterItem } from '@/lib/api/approvals';

export function getAvailableActions(item: ApprovalCenterItem): string[] {
  if (item.available_actions?.length) return item.available_actions;
  if (item.status === 'pending' && (item.type === 'leave' || item.type === 'wfh')) {
    return ['review', 'approve', 'request_revision', 'reject'];
  }
  return ['review'];
}

export function hasApprovalAction(item: ApprovalCenterItem, action: string) {
  return getAvailableActions(item).includes(action);
}
