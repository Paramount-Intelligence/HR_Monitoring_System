import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getUserPresence,
  hydrateUserPresence,
  setUserManualPresence,
  setUserOnlineState,
} from './presence-store';

describe('presence store', () => {
  it('returns null when unknown', () => {
    assert.equal(getUserPresence('missing-user'), null);
  });

  it('hydrates and reads away status', () => {
    hydrateUserPresence('user-1', { presence_status: 'away' });
    assert.equal(getUserPresence('user-1')?.presence_status, 'away');
  });

  it('updates presence status', () => {
    setUserManualPresence('user-2', { presence_status: 'active' });
    setUserManualPresence('user-2', { presence_status: 'away' });
    assert.equal(getUserPresence('user-2')?.presence_status, 'away');
  });

  it('preserves away status when online state updates', () => {
    hydrateUserPresence('user-3', {
      presence_status: 'away',
      online_state: 'online',
      is_online: true,
    });
    setUserOnlineState('user-3', {
      online_state: 'online',
      is_online: true,
      last_seen_at: '2026-06-09T12:00:00.000Z',
    });
    assert.equal(getUserPresence('user-3')?.presence_status, 'away');
    assert.equal(getUserPresence('user-3')?.online_state, 'online');
  });
});
