import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getUserPresence,
  hydrateUserPresence,
  setUserPresence,
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
    setUserPresence('user-2', { presence_status: 'active' });
    setUserPresence('user-2', { presence_status: 'away' });
    assert.equal(getUserPresence('user-2')?.presence_status, 'away');
  });
});
