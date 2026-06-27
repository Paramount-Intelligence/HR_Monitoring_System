import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getUserInitials } from '@/components/user/UserAvatar';
import {
  AVAILABILITY_DOT_CLASSES,
  getAvailabilityDot,
} from '@/lib/presence/availability';

describe('UserAvatar availability dot', () => {
  it('shows yellow class mapping for away online user', () => {
    const dot = getAvailabilityDot({
      presenceStatus: 'away',
      onlineState: 'online',
      isOnline: true,
    });
    assert.equal(dot, 'away');
    assert.equal(AVAILABILITY_DOT_CLASSES[dot], 'bg-amber-400');
  });

  it('shows green class mapping for active online user', () => {
    const dot = getAvailabilityDot({
      presenceStatus: 'active',
      onlineState: 'online',
      isOnline: true,
    });
    assert.equal(dot, 'active');
    assert.equal(AVAILABILITY_DOT_CLASSES[dot], 'bg-emerald-500');
  });

  it('shows grey class mapping for offline user', () => {
    const dot = getAvailabilityDot({
      presenceStatus: 'active',
      onlineState: 'offline',
      isOnline: false,
    });
    assert.equal(dot, 'offline');
    assert.equal(AVAILABILITY_DOT_CLASSES[dot], 'bg-slate-400');
  });

  it('keeps away dot when online despite active manual status not overriding away', () => {
    assert.equal(
      getAvailabilityDot({ presenceStatus: 'away', onlineState: 'online' }),
      'away',
    );
  });

  it('defaults missing online state to offline grey', () => {
    assert.equal(getAvailabilityDot({ presenceStatus: 'active' }), 'offline');
  });

  it('builds initials from full name', () => {
    assert.equal(getUserInitials('Jane Doe'), 'JD');
  });
});
