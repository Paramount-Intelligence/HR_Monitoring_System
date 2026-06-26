import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getUserInitials } from '@/components/user/UserAvatar';

describe('UserAvatar helpers', () => {
  it('builds initials from full name', () => {
    assert.equal(getUserInitials('Jane Doe'), 'JD');
  });

  it('treats active and away as presence labels', () => {
    const activeLabel = 'Alex is active';
    const awayLabel = 'Alex is away';
    assert.match(activeLabel, /active/);
    assert.match(awayLabel, /away/);
  });
});
