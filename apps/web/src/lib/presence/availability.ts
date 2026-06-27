import type { OnlineState, PresenceStatus } from './types';

export type AvailabilityDot = 'active' | 'away' | 'offline';

export function getAvailabilityDot(input: {
  presenceStatus?: PresenceStatus | null;
  onlineState?: OnlineState | null;
  isOnline?: boolean | null;
}): AvailabilityDot {
  if (input.presenceStatus === 'away') return 'away';
  if (input.onlineState === 'online' || input.isOnline === true) return 'active';
  return 'offline';
}

export const AVAILABILITY_DOT_CLASSES: Record<AvailabilityDot, string> = {
  active: 'bg-emerald-500',
  away: 'bg-amber-400',
  offline: 'bg-slate-400',
};

export function getAvailabilityAriaLabel(name: string, dot: AvailabilityDot): string {
  if (dot === 'away') return `${name} is away`;
  if (dot === 'active') return `${name} is active`;
  return `${name} is offline`;
}
