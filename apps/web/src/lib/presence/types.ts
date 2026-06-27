export type PresenceStatus = 'active' | 'away';
export type OnlineState = 'online' | 'offline';

export interface PresenceState {
  presence_status?: PresenceStatus;
  presence_updated_at?: string | null;
  last_seen_at?: string | null;
  online_state?: OnlineState;
  is_online?: boolean;
}
