import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getUserPresence,
  hydrateUserPresence,
  setUserOnlineState,
} from './presence-store';
import { resolveIsOnline, resolveOnlineState } from './resolve-online';

describe('online presence store', () => {
  it('tracks online state separately from manual away status', () => {
    hydrateUserPresence('user-1', {
      presence_status: 'away',
      online_state: 'online',
      is_online: true,
    });
    const state = getUserPresence('user-1');
    assert.equal(state?.presence_status, 'away');
    assert.equal(state?.online_state, 'online');
    assert.equal(state?.is_online, true);
  });

  it('updates online state from websocket payload', () => {
    setUserOnlineState('user-2', {
      online_state: 'offline',
      is_online: false,
      last_seen_at: '2026-06-09T12:00:00.000Z',
    });
    assert.equal(resolveIsOnline('user-2'), false);
  });

  it('does not treat manual active as online without live state', () => {
    hydrateUserPresence('user-3', { presence_status: 'active', online_state: 'offline', is_online: false });
    assert.equal(resolveIsOnline('user-3'), false);
    assert.equal(resolveOnlineState('user-3'), 'offline');
  });

  it('defaults missing state to offline for indicator rendering', () => {
    assert.equal(resolveOnlineState('unknown-user'), 'offline');
  });

  it('realtime online event resolves to online', () => {
    setUserOnlineState('user-4', { online_state: 'online', is_online: true });
    assert.equal(resolveOnlineState('user-4'), 'online');
  });

  it('away status survives online state websocket update', () => {
    hydrateUserPresence('user-5', { presence_status: 'away', online_state: 'offline', is_online: false });
    setUserOnlineState('user-5', { online_state: 'online', is_online: true });
    assert.equal(getUserPresence('user-5')?.presence_status, 'away');
  });
});
