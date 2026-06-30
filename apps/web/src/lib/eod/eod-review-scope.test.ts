import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export function resolveEodReviewScope(role: string): 'organization' | 'my_team' {
  return role === 'admin' ? 'organization' : 'my_team';
}

describe('EOD review scope resolution', () => {
  it('uses organization scope for admin', () => {
    assert.equal(resolveEodReviewScope('admin'), 'organization');
  });

  it('uses team scope for manager', () => {
    assert.equal(resolveEodReviewScope('manager'), 'my_team');
  });
});
