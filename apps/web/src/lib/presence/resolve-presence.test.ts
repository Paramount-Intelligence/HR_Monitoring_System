import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getAvailabilityDot } from './availability';
import {
  hydrateUserPresence,
  setUserManualPresence,
  setUserOnlineState,
} from './presence-store';
import { resolvePresenceStatus } from './resolve-presence';

describe('resolvePresenceStatus', () => {
  it('prefers store over stale API props', () => {
    hydrateUserPresence('sarah-1', {
      presence_status: 'away',
      online_state: 'online',
      is_online: true,
    });
    assert.equal(resolvePresenceStatus('sarah-1', 'active'), 'away');
    assert.equal(
      getAvailabilityDot({
        presenceStatus: resolvePresenceStatus('sarah-1', 'active'),
        onlineState: 'online',
        isOnline: true,
      }),
      'away',
    );
  });

  it('falls back to API props when store is empty', () => {
    assert.equal(resolvePresenceStatus('unknown-1', 'active'), 'active');
  });
});

describe('manual presence merge', () => {
  it('online websocket update does not overwrite away status', () => {
    setUserManualPresence('user-1', { presence_status: 'away' });
    setUserOnlineState('user-1', { online_state: 'online', is_online: true });
    assert.equal(resolvePresenceStatus('user-1'), 'away');
  });
});
