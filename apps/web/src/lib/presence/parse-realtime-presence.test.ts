import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseUserOnlineStateUpdatedPayload,
  parseUserPresenceUpdatedPayload,
} from './parse-realtime-presence';

describe('parseUserPresenceUpdatedPayload', () => {
  it('parses snake_case payload', () => {
    const parsed = parseUserPresenceUpdatedPayload({
      user_id: 'user-1',
      presence_status: 'away',
      presence_updated_at: '2026-06-09T12:00:00.000Z',
    });
    assert.equal(parsed?.userId, 'user-1');
    assert.equal(parsed?.presenceStatus, 'away');
  });

  it('parses camelCase payload', () => {
    const parsed = parseUserPresenceUpdatedPayload({
      userId: 'user-2',
      presenceStatus: 'active',
    });
    assert.equal(parsed?.userId, 'user-2');
    assert.equal(parsed?.presenceStatus, 'active');
  });
});

describe('parseUserOnlineStateUpdatedPayload', () => {
  it('parses online state without presence fields', () => {
    const parsed = parseUserOnlineStateUpdatedPayload({
      user_id: 'user-3',
      online_state: 'offline',
      is_online: false,
    });
    assert.equal(parsed?.onlineState, 'offline');
    assert.equal(parsed?.isOnline, false);
  });
});
