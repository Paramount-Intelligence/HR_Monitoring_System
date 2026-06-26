export type PresenceStatus = 'active' | 'away';

export interface PresenceState {
  presence_status: PresenceStatus;
  presence_updated_at?: string | null;
  last_seen_at?: string | null;
}
