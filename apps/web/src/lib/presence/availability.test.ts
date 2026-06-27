import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AVAILABILITY_DOT_CLASSES,
  getAvailabilityAriaLabel,
  getAvailabilityDot,
} from './availability';
import { hydrateUserPresence, setUserOnlineState } from './presence-store';
import { resolvePresenceStatus } from './resolve-presence';
import { getAvailabilityDot } from './availability';

describe('getAvailabilityDot', () => {
  it('returns away when manual status is away even if online', () => {
    assert.equal(
      getAvailabilityDot({ presenceStatus: 'away', onlineState: 'online', isOnline: true }),
      'away',
    );
  });

  it('returns active for active online user', () => {
    assert.equal(
      getAvailabilityDot({ presenceStatus: 'active', onlineState: 'online', isOnline: true }),
      'active',
    );
  });

  it('returns offline when not online regardless of manual active', () => {
    assert.equal(
      getAvailabilityDot({ presenceStatus: 'active', onlineState: 'offline', isOnline: false }),
      'offline',
    );
  });

  it('maps dot colors', () => {
    assert.equal(AVAILABILITY_DOT_CLASSES.active, 'bg-emerald-500');
    assert.equal(AVAILABILITY_DOT_CLASSES.away, 'bg-amber-400');
    assert.equal(AVAILABILITY_DOT_CLASSES.offline, 'bg-slate-400');
  });

  it('builds accessibility labels', () => {
    assert.equal(getAvailabilityAriaLabel('Sarah', 'away'), 'Sarah is away');
    assert.equal(getAvailabilityAriaLabel('Sarah', 'active'), 'Sarah is active');
    assert.equal(getAvailabilityAriaLabel('Sarah', 'offline'), 'Sarah is offline');
  });
});

describe('availability with presence store', () => {
  it('keeps away dot after online websocket event', () => {
    hydrateUserPresence('user-away', {
      presence_status: 'away',
      online_state: 'online',
      is_online: true,
    });
    setUserOnlineState('user-away', {
      online_state: 'online',
      is_online: true,
      last_seen_at: '2026-06-09T12:00:00.000Z',
    });
    const status = resolvePresenceStatus('user-away');
    assert.equal(status, 'away');
    assert.equal(
      getAvailabilityDot({
        presenceStatus: status,
        onlineState: 'online',
        isOnline: true,
      }),
      'away',
    );
  });
});
